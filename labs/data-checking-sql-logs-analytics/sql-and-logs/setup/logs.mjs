/**
 * 랩 로그 생성기 (결정적). 사건: 2026-10-01 14:10~14:32(KST) 결제 게이트웨이 타임아웃으로 결제 요청이 대량 실패.
 * - access.log : 웹 서버(nginx) 형식. 마지막 필드 rid= 가 app.log 의 reqId 와 같다 (상관 ID)
 * - app.log    : API 의 JSON 로그(한 줄에 한 객체). 결제 요청은 여러 줄을 남긴다
 * 정답은 이 생성기의 의도가 아니라, 만들어진 텍스트를 다시 파싱한 값(check/log-analysis.mjs)으로 채점한다.
 */
export const LOG_SEED = 20261001
const BASE = Date.parse('2026-10-01T12:00:00+09:00')
const WINDOW_MS = 4 * 60 * 60 * 1000
export const INCIDENT = { start: Date.parse('2026-10-01T14:10:00+09:00'), end: Date.parse('2026-10-01T14:32:00+09:00') }
export const TARGET_ORDER_ID = 842

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const p2 = (n) => String(n).padStart(2, '0')
/** KST 시각(밀리초 시각 + 9시간을 UTC 필드로 읽는다)을 nginx 형식으로 */
function nginxTime(ms) {
  const d = new Date(ms + 9 * 3600_000)
  return `${p2(d.getUTCDate())}/${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}:${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} +0900`
}

export function buildLogs(seed = LOG_SEED) {
  const rand = mulberry32(seed)
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1))
  const hex = (n) => Array.from({ length: n }, () => int(0, 15).toString(16)).join('')
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[int(0, 3)]}${hex(3)}-${hex(12)}`
  const requests = [] // { t, method, path, status, rt, rid, app: [{ dt, level, msg, extra }] }

  const add = (t, method, path, status, rt, app = []) => requests.push({ t, method, path, status, rt, rid: uuid(), app })
  const gwTx = () => `GW-${hex(6).toUpperCase()}`
  const payLines = (orderId, amount, outcome) => {
    // outcome: 'ok' 또는 시도 횟수만큼 타임아웃 후 실패 (attempts: 2 또는 3)
    const tx = gwTx()
    const lines = [{ dt: 2, level: 30, msg: 'payment requested', extra: { orderId, amount } }]
    if (outcome === 'ok') {
      lines.push({ dt: 6, level: 30, msg: 'gateway call', extra: { attempt: 1, gatewayTxId: tx } })
      lines.push({ dt: 41, level: 30, msg: 'payment approved', extra: { orderId, gatewayTxId: tx } })
      return { lines, rt: 44, status: 200 }
    }
    let dt = 6
    for (let attempt = 1; attempt <= outcome; attempt++) {
      lines.push({ dt, level: 30, msg: 'gateway call', extra: { attempt, gatewayTxId: tx } })
      dt += 1000
      lines.push({ dt, level: 40, msg: 'payment gateway timeout', extra: { attempt, err: { code: 'ETIMEDOUT' } } })
      dt += 5
    }
    lines.push({ dt, level: 50, msg: 'payment failed', extra: { orderId, gatewayTxId: tx, err: { code: 'ETIMEDOUT', message: 'gateway did not respond within 1000ms' } } })
    return { lines, rt: dt + 4, status: 502 }
  }

  // 평소 트래픽 (4시간, 약 1,100건)
  const times = Array.from({ length: 1100 }, () => BASE + int(0, WINDOW_MS - 1) + int(0, 999) / 1000).sort((a, b) => a - b)
  let orderSeq = 780
  for (const t of times) {
    const r = rand() * 100
    if (r < 32) add(t, 'GET', '/api/products', 200, int(6, 35))
    else if (r < 52) {
      const n = int(1, 14)
      add(t, 'GET', `/api/products/${n}`, n > 12 ? 404 : 200, int(4, 20))
    } else if (r < 60) add(t, 'POST', '/api/auth/login', rand() < 0.9 ? 200 : 401, int(40, 120))
    else if (r < 72) add(t, 'PUT', `/api/cart/items/${int(1, 12)}`, [200, 200, 200, 200, 400, 409][int(0, 5)], int(8, 40))
    else if (r < 82) add(t, 'POST', '/api/quote', rand() < 0.93 ? 200 : 422, int(10, 45))
    else if (r < 90) add(t, 'POST', '/api/orders', rand() < 0.92 ? 201 : 400, int(20, 90))
    else if (r < 96) {
      const id = ++orderSeq
      if (id === TARGET_ORDER_ID) continue // 842 번 주문은 아래에서 따로 만든다
      const pay = payLines(id, int(10, 120) * 1000, 'ok')
      add(t, 'POST', `/api/orders/${id}/pay`, 200, pay.rt, pay.lines)
    } else add(t, 'GET', `/api/orders/${int(780, 900)}`, rand() < 0.9 ? 200 : 404, int(8, 30))
  }

  // 장애 시간대: 사용자 재시도로 결제 요청이 몰리고 대부분 게이트웨이 타임아웃으로 실패한다
  const incidentPayIds = Array.from({ length: 38 }, (_, k) => 810 + k).filter((id) => id !== TARGET_ORDER_ID)
  incidentPayIds.push(TARGET_ORDER_ID)
  incidentPayIds.sort((a, b) => a - b)
  for (const id of incidentPayIds) {
    const t = INCIDENT.start + int(30, 1290) * 1000 + int(0, 999)
    const fail = id === TARGET_ORDER_ID || rand() < 0.88
    const pay = payLines(id, int(10, 120) * 1000, fail ? (id === TARGET_ORDER_ID ? 3 : [2, 3, 3][int(0, 2)]) : 'ok')
    add(t, 'POST', `/api/orders/${id}/pay`, pay.status, pay.rt, pay.lines)
  }
  // 842 번 주문은 장애가 끝난 뒤 다시 결제해 성공했다 (실패한 요청과 성공한 요청이 둘 다 있다)
  const retry = payLines(TARGET_ORDER_ID, 74_000, 'ok')
  add(Date.parse('2026-10-01T14:41:07+09:00') + 213, 'POST', `/api/orders/${TARGET_ORDER_ID}/pay`, 200, retry.rt, retry.lines)

  // 장애와 무관한 500 두 건 (다른 엔드포인트)
  for (const [when, path] of [['2026-10-01T13:02:44+09:00', '/api/orders'], ['2026-10-01T15:21:09+09:00', '/api/orders']]) {
    add(Date.parse(when) + int(0, 999), 'POST', path, 500, 2003, [
      { dt: 2, level: 50, msg: 'deadlock detected', extra: { err: { code: '40P01' } } },
    ])
  }

  requests.sort((a, b) => a.t - b.t)
  // 웹 서버 로그는 요청이 끝난 시각 순으로 쌓인다 (느린 요청은 뒤에 나온다)
  const accessLines = [...requests].sort((a, b) => a.t + a.rt - (b.t + b.rt)).map((r) => `127.0.0.1 - - [${nginxTime(r.t + r.rt)}] "${r.method} ${r.path} HTTP/1.1" ${r.status} ${int(120, 1800)} "-" "Mozilla/5.0" rt=${(r.rt / 1000).toFixed(3)} rid=${r.rid}`)
  const appRecords = []
  for (const r of requests) {
    for (const l of r.app) appRecords.push({ time: Math.round(r.t + l.dt), obj: { level: l.level, time: Math.round(r.t + l.dt), service: 'shop-api', reqId: r.rid, ...l.extra, msg: l.msg } })
    const end = Math.round(r.t + r.rt)
    appRecords.push({ time: end, obj: { level: r.status >= 500 ? 50 : 30, time: end, service: 'shop-api', reqId: r.rid, req: { method: r.method, url: r.path }, res: { statusCode: r.status }, responseTime: r.rt, msg: 'request completed' } })
  }
  appRecords.sort((a, b) => a.time - b.time)
  return { access: `${accessLines.join('\n')}\n`, app: `${appRecords.map((r) => JSON.stringify(r.obj)).join('\n')}\n` }
}
