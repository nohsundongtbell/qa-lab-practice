import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { docker, dockerProblem } from '../../../../scripts/lib/docker.mjs'
import { prepareRunDir, removeRunDir } from '../../../../scripts/lib/vitest-runner.mjs'

/** 태그와 멀티 아키텍처 인덱스 다이제스트로 고정한 이미지 (docs/PLATFORM_SUPPORT.md). */
export const MITM_IMAGE = 'mitmproxy/mitmproxy:12.2.3@sha256:00b77b5d8804c8ad18cb6caefbf9d5849e895e8986c5ce011f4ae30f4385962f'
const COMPOSE_PROJECT = 'qa-lab-shop'

/** docker run 인자. 호스트 쪽 포트는 127.0.0.1 에만 연다. 컨테이너에는 최소 권한만 준다. */
export function proxyRunArgs({ name, network, port, addonDir }) {
  return [
    'run', '-d', '--name', name,
    '--network', network,
    '-p', `127.0.0.1:${port}:8080`,
    // 이미지 기본 진입점은 root 권한(usermod 등)이 필요하다. 진입점을 mitmdump 로 바꾸고 일반 사용자로 실행하면 권한을 모두 뺄 수 있다.
    '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '512m',
    '--tmpfs', '/tmp', '--env', 'HOME=/tmp', '--entrypoint', 'mitmdump',
    '--mount', `type=bind,source=${addonDir},target=/addon,readonly`,
    MITM_IMAGE,
    '--mode', 'reverse:http://api:3000', '--listen-host', '0.0.0.0', '--listen-port', '8080', '-s', '/addon/addon.py',
  ]
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

/** 실행 중인 앱(api 서비스)이 붙어 있는 compose 네트워크 이름. */
export function apiNetwork(cwd) {
  const ps = docker(['ps', '-q', '--filter', `label=com.docker.compose.project=${COMPOSE_PROJECT}`, '--filter', 'label=com.docker.compose.service=api'], { cwd })
  const id = ps.stdout.trim().split('\n')[0]
  if (!id) return null
  const inspect = docker(['inspect', '-f', '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}', id], { cwd })
  return inspect.stdout.trim().split(/\s+/)[0] || null
}

/**
 * 학습자의 addon.py 로 mitmproxy 를 띄우고 fn(proxyBaseUrl) 을 실행한 뒤 반드시 정리한다.
 * @returns {Promise<{ ok: true, value: any } | { ok: false, message: string, logs?: string }>}
 */
export async function withProxy({ repoRoot, labDir, addonFile }, fn) {
  const problem = dockerProblem(repoRoot)
  if (problem) return { ok: false, message: problem }
  if (!fs.existsSync(addonFile)) return { ok: false, message: 'addon.py 가 없습니다. work/addon.py 에 mitmproxy 애드온을 작성하세요.' }
  const network = apiNetwork(repoRoot)
  if (!network) return { ok: false, message: '대상 앱(api)이 실행 중이 아닙니다. npm run up 으로 먼저 기동하세요.' }

  const dir = prepareRunDir(labDir, 'mitm', { files: [{ to: 'addon.py', content: fs.readFileSync(addonFile) }] })
  const name = `qa-lab-mitm-${process.pid}-${Math.random().toString(36).slice(2, 7)}`
  try {
    const port = await freePort()
    const started = docker(proxyRunArgs({ name, network, port, addonDir: path.resolve(dir) }), { cwd: repoRoot })
    if (started.status !== 0) {
      const pull = /pull access denied|no such host|TLS|timeout|Unable to find image/i.test(started.stderr)
      return { ok: false, message: pull ? 'mitmproxy 이미지(mitmproxy/mitmproxy:12.2.3)를 받지 못했습니다. 네트워크를 확인하세요.' : `프록시 컨테이너를 시작하지 못했습니다: ${started.stderr.trim().split('\n').pop()}` }
    }
    const baseUrl = `http://127.0.0.1:${port}`
    const deadline = Date.now() + 25_000
    while (Date.now() < deadline) {
      const alive = docker(['ps', '-q', '--filter', `name=${name}`], { cwd: repoRoot }).stdout.trim()
      if (!alive) {
        const logs = docker(['logs', '--tail', '15', name], { cwd: repoRoot })
        return { ok: false, message: 'addon.py 때문에 프록시가 시작되지 못했습니다 (문법 오류이거나 불러오기 실패)', logs: `${logs.stdout}${logs.stderr}`.trim() }
      }
      try {
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) })
        if (res.ok) return { ok: true, value: await fn(baseUrl) }
      } catch {
        /* 아직 준비 중 */
      }
      await new Promise((r) => setTimeout(r, 400))
    }
    const logs = docker(['logs', '--tail', '15', name], { cwd: repoRoot })
    return { ok: false, message: '프록시가 25초 안에 준비되지 않았습니다', logs: `${logs.stdout}${logs.stderr}`.trim() }
  } finally {
    docker(['rm', '-f', name], { cwd: repoRoot })
    removeRunDir(dir)
  }
}

// ---------------------------------------------------------------------------
// 동작 확인. 프록시 주소(proxy)와 앱 직접 주소(direct)에 같은 요청을 보내 비교한다.
// 클라이언트는 항상 X-QA-Lab-Defects: none 을 보낸다 — 앱의 결함 프로필과 상관없이 같은 결과가 나오게 하고,
// 애드온이 헤더를 "덮어쓰는지" 를 보기 위해서다.
// ---------------------------------------------------------------------------
export function makeClient(baseUrl, fetchImpl = fetch) {
  return async (method, path, { token, json } = {}) => {
    const headers = { 'x-qa-lab-defects': 'none' }
    if (token) headers.authorization = `Bearer ${token}`
    if (json !== undefined) headers['content-type'] = 'application/json'
    const res = await fetchImpl(new URL(path, baseUrl), { method, headers, body: json === undefined ? undefined : JSON.stringify(json) })
    const text = await res.text()
    let body
    try {
      body = text ? JSON.parse(text) : undefined
    } catch {
      body = text
    }
    return { status: res.status, headers: Object.fromEntries(res.headers), body }
  }
}

/** 각 확인은 문제가 없으면 null, 있으면 한국어 사유를 돌려준다. */
export const BEHAVIORS = [
  {
    id: 'response-header',
    title: '응답에 헤더 X-Proxied-By: qa-lab 을 붙이고, 본문은 그대로 둔다',
    async run({ proxy, direct }) {
      const [p, d] = [await proxy('GET', '/api/products'), await direct('GET', '/api/products')]
      if (p.headers['x-proxied-by'] !== 'qa-lab') return '응답에 x-proxied-by: qa-lab 헤더가 없습니다'
      if (JSON.stringify(p.body) !== JSON.stringify(d.body)) return '본문이 앱의 응답과 달라졌습니다 (헤더만 추가해야 합니다)'
      return null
    },
  },
  {
    id: 'request-rewrite',
    title: '상품 상세(GET /api/products/<숫자>) 요청에 X-QA-Lab-Defects: DF-013 헤더를 넣는다 (클라이언트가 보낸 값은 덮어쓴다)',
    async run({ proxy }) {
      const detail = await proxy('GET', '/api/products/1')
      if (detail.status !== 200) return '상품 상세 요청이 프록시를 통과하지 못했습니다'
      if (typeof detail.body?.price !== 'string') return '상품 상세 요청에 결함 헤더가 들어가지 않았습니다 (가격이 문자열이 되어야 합니다). 클라이언트가 이미 보낸 같은 헤더를 덮어써야 합니다'
      return null
    },
  },
  {
    id: 'mock-response',
    title: '결제 요청(POST /api/orders/<id>/pay)에는 앱에 보내지 않고 503 {"code":"PAYMENT_GATEWAY_DOWN"} 으로 직접 답한다',
    async run({ proxy, direct }) {
      const login = await proxy('POST', '/api/auth/login', { json: { email: 'kim@example.com', password: 'qa-lab-1234' } })
      const token = login.body?.token
      if (!token) return '로그인 요청이 프록시를 통과하지 못했습니다 (결제 이외의 요청은 그대로 전달해야 합니다)'
      await proxy('PUT', '/api/cart/items/1', { token, json: { qty: 1 } })
      const order = await proxy('POST', '/api/orders', { token, json: {} })
      if (order.status !== 201) return '주문 생성 요청이 프록시를 통과하지 못했습니다'
      const pay = await proxy('POST', `/api/orders/${order.body.id}/pay`, { token, json: { cardNumber: '4242424242424242' } })
      if (pay.status !== 503) return '결제 요청에 503 으로 답하지 않았습니다'
      if (pay.body?.code !== 'PAYMENT_GATEWAY_DOWN') return '503 응답 본문에 code: PAYMENT_GATEWAY_DOWN 이 없습니다'
      const after = await direct('GET', `/api/orders/${order.body.id}`, { token })
      if (after.body?.status !== 'PENDING') return '결제 요청이 앱까지 전달되었습니다 (주문이 PENDING 이 아닙니다). 응답을 만들어 돌려주면 앱에는 보내지 않습니다'
      const get = await proxy('GET', `/api/orders/${order.body.id}`, { token })
      if (get.status !== 200) return '결제가 아닌 주문 요청까지 가로챘습니다'
      return null
    },
  },
  {
    id: 'stateful-counter',
    title: '프록시를 지나간 요청 수를 응답 헤더 X-Proxy-Count 에 1씩 늘려 가며 적는다',
    async run({ proxy }) {
      const counts = []
      for (let i = 0; i < 3; i++) counts.push(Number((await proxy('GET', '/health')).headers['x-proxy-count']))
      if (counts.some((n) => !Number.isInteger(n))) return '응답에 숫자로 된 x-proxy-count 헤더가 없습니다'
      if (counts[1] !== counts[0] + 1 || counts[2] !== counts[1] + 1) return 'x-proxy-count 가 요청마다 1씩 늘어나지 않습니다'
      return null
    },
  },
]

/** 모든 확인을 실행한다. 한 확인이 예외를 던져도 나머지는 계속한다. */
export async function runBehaviors(ctx, behaviors = BEHAVIORS) {
  const out = []
  for (const b of behaviors) {
    let reason
    try {
      reason = await b.run(ctx)
    } catch (err) {
      reason = `확인 중 오류: ${err.message}`
    }
    out.push({ id: b.id, title: b.title, ok: reason === null, reason })
  }
  return out
}
