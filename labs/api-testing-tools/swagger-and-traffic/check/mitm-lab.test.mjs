import { describe, expect, it } from 'vitest'
import { BEHAVIORS, MITM_IMAGE, makeClient, proxyRunArgs, runBehaviors } from './mitm-lab.mjs'

describe('proxyRunArgs — 안전 장치', () => {
  const args = proxyRunArgs({ name: 'n', network: 'net', port: 18080, addonDir: '/tmp/x' })
  it('호스트 포트는 127.0.0.1 에만 연다', () => {
    const p = args[args.indexOf('-p') + 1]
    expect(p).toBe('127.0.0.1:18080:8080')
    expect(args.join(' ')).not.toContain('0.0.0.0:') // 호스트 쪽 0.0.0.0 공개 금지 (컨테이너 안 listen-host 는 별개)
  })
  it('권한을 모두 빼고 일반 사용자로 실행하며, 애드온 폴더는 읽기 전용이다', () => {
    expect(args).toContain('--cap-drop')
    expect(args[args.indexOf('--cap-drop') + 1]).toBe('ALL')
    expect(args[args.indexOf('--user') + 1]).toBe('1000:1000')
    expect(args).toContain('no-new-privileges')
    expect(args.find((a) => a.startsWith('type=bind'))).toMatch(/readonly$/)
  })
  it('이미지는 고정 태그와 다이제스트로 고정한다 (latest 가 아니다)', () => {
    expect(args).toContain(MITM_IMAGE)
    expect(MITM_IMAGE).toMatch(/:\d+\.\d+\.\d+@sha256:[0-9a-f]{64}$/)
  })
  it('앱(api:3000)을 리버스 프록시로 가리킨다', () => {
    expect(args).toContain('reverse:http://api:3000')
  })
})

// ---- 동작 확인(BEHAVIORS) 자체를 시험한다: 프록시+앱을 흉내 낸 가짜 세계 ---------------------------------------
/** opts 로 애드온의 실수를 흉내 낸다. 모두 false 면 모범 답안과 같은 동작. */
function fakeWorld(opts = {}) {
  const orders = new Map()
  let count = 0
  const app = (method, path, headers, body) => {
    const defects = headers['x-qa-lab-defects']
    if (path === '/health') return { status: 200, body: { status: 'ok' } }
    if (path === '/api/products') return { status: 200, body: [{ id: 1, price: 50000 }, { id: 2, price: 25000 }] }
    if (/^\/api\/products\/\d+$/.test(path)) return { status: 200, body: { id: 1, price: defects === 'DF-013' ? '50000' : 50000 } }
    if (path === '/api/auth/login') return { status: 200, body: { token: 't' } }
    if (path.startsWith('/api/cart')) return { status: 200, body: {} }
    if (method === 'POST' && path === '/api/orders') {
      orders.set(7, 'PENDING')
      return { status: 201, body: { id: 7 } }
    }
    if (/^\/api\/orders\/7\/pay$/.test(path)) {
      orders.set(7, 'PAID')
      return { status: 200, body: { id: 7, status: 'PAID' } }
    }
    if (/^\/api\/orders\/7$/.test(path)) return { status: 200, body: { id: 7, status: orders.get(7) } }
    return { status: 404, body: {} }
  }
  const respond = (r, extra = {}) => ({ status: r.status, headers: new Headers(extra), text: async () => JSON.stringify(r.body) })

  return async (url, init) => {
    const u = new URL(url)
    const headers = Object.fromEntries(Object.entries(init.headers ?? {}))
    const viaProxy = u.hostname === 'proxy.test'
    if (!viaProxy) return respond(app(init.method, u.pathname, headers))
    // ---- 애드온 ----
    count += 1
    const isDetail = /^\/api\/products\/\d+$/.test(u.pathname)
    if (isDetail && !(opts.noOverride && headers['x-qa-lab-defects'])) headers['x-qa-lab-defects'] = 'DF-013'
    const isPay = init.method === 'POST' && /^\/api\/orders\/\d+\/pay$/.test(u.pathname)
    let r
    if (isPay || (opts.mockAllPosts && init.method === 'POST')) {
      if (opts.mockAlsoForwards) app(init.method, u.pathname, headers)
      r = { status: 503, body: { code: 'PAYMENT_GATEWAY_DOWN' } }
    } else r = app(init.method, u.pathname, headers)
    if (opts.tamperBody && u.pathname === '/api/products') r = { ...r, body: [] }
    const extra = {}
    if (!opts.noHeader) extra['x-proxied-by'] = 'qa-lab'
    extra['x-proxy-count'] = String(opts.constantCounter ? 1 : count)
    return respond(r, extra)
  }
}

const run = (opts) => {
  const f = fakeWorld(opts)
  return runBehaviors({ proxy: makeClient('http://proxy.test', f), direct: makeClient('http://direct.test', f) })
}
const failed = (results) => results.filter((r) => !r.ok).map((r) => r.id)

describe('동작 확인 — 올바른 애드온과 흔한 실수', () => {
  it('모범 답안과 같은 동작이면 모두 통과한다', async () => {
    expect(failed(await run())).toEqual([])
  })
  it('헤더를 빼먹으면 response-header 가 실패한다', async () => {
    expect(failed(await run({ noHeader: true }))).toEqual(['response-header'])
  })
  it('본문까지 바꾸면 response-header 가 실패한다 (본문은 그대로여야 한다)', async () => {
    expect(failed(await run({ tamperBody: true }))).toContain('response-header')
  })
  it('클라이언트가 보낸 결함 헤더를 덮어쓰지 않으면 request-rewrite 가 실패한다', async () => {
    expect(failed(await run({ noOverride: true }))).toEqual(['request-rewrite'])
  })
  it('가짜 응답을 주면서 앱에도 전달하면 mock-response 가 실패한다', async () => {
    expect(failed(await run({ mockAlsoForwards: true }))).toEqual(['mock-response'])
  })
  it('POST 를 전부 가로채면 mock-response 가 실패한다 (로그인까지 막힘)', async () => {
    expect(failed(await run({ mockAllPosts: true }))).toEqual(['mock-response'])
  })
  it('카운터가 늘지 않으면 stateful-counter 가 실패한다', async () => {
    expect(failed(await run({ constantCounter: true }))).toEqual(['stateful-counter'])
  })
  it('아무것도 안 하는 애드온은 전부 실패한다', async () => {
    const f = async (url, init) => {
      const u = new URL(url)
      const world = fakeWorld()
      return world(`http://direct.test${u.pathname}${u.search}`, init) // 프록시가 아무것도 안 바꿈
    }
    const results = await runBehaviors({ proxy: makeClient('http://proxy.test', f), direct: makeClient('http://direct.test', f) })
    expect(failed(results)).toEqual(BEHAVIORS.map((b) => b.id))
  })
})
