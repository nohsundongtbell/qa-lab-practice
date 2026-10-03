/**
 * 로그 텍스트를 읽어 정답을 계산한다 (생성기의 의도와 무관하게, 파일 내용만으로).
 * 채점 정답은 항상 이 분석기가 계산한다.
 */
const ACCESS = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) [^"]*" (\d{3}) (\d+) "[^"]*" "[^"]*" rt=([\d.]+) rid=(\S+)$/

export function parseAccessLine(line) {
  const m = ACCESS.exec(line)
  if (!m) return null
  const time = /:(\d{2}:\d{2}:\d{2}) /.exec(m[2])?.[1]
  return { ip: m[1], time, method: m[3], path: m[4], status: Number(m[5]), bytes: Number(m[6]), rt: Number(m[7]), rid: m[8] }
}

/** 경로의 숫자 id 를 :id 로 바꿔 같은 엔드포인트로 묶는다. */
export const normalizeEndpoint = (method, path) => `${method} ${path.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id')}`

export function analyzeAccess(text) {
  const rows = text.split('\n').filter(Boolean).map(parseAccessLine)
  if (rows.some((r) => r === null)) throw new Error('access.log 에 읽을 수 없는 줄이 있습니다')
  const errors = rows.filter((r) => r.status >= 500)
  const counts = new Map()
  for (const r of errors) counts.set(normalizeEndpoint(r.method, r.path), (counts.get(normalizeEndpoint(r.method, r.path)) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const times = errors.map((r) => r.time).sort()
  return {
    total_requests: rows.length,
    count_5xx: errors.length,
    most_5xx_endpoint: ranked[0]?.[0],
    topIsUnique: ranked.length < 2 || ranked[0][1] > ranked[1][1],
    first_5xx_at: times[0],
    last_5xx_at: times[times.length - 1],
  }
}

export function parseAppLines(text) {
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l))
}

/** 주문의 결제 요청 중 5xx 로 끝난 요청의 상관 ID 와, 그 요청의 로그에서 뽑은 증거. */
export function analyzeEvidence(appText, orderId) {
  const lines = parseAppLines(appText)
  const failed = lines.filter((l) => l.msg === 'request completed' && l.req?.url === `/api/orders/${orderId}/pay` && l.res.statusCode >= 500)
  if (failed.length !== 1) return { error: `주문 ${orderId} 의 실패한 결제 요청이 ${failed.length}개입니다 (정확히 1개여야 함)` }
  const rid = failed[0].reqId
  const mine = lines.filter((l) => l.reqId === rid)
  const failure = mine.find((l) => l.msg === 'payment failed')
  return {
    request_id: rid,
    gateway_tx_id: failure?.gatewayTxId,
    attempts: mine.filter((l) => l.msg === 'gateway call').length,
    error_code: failure?.err?.code,
    final_status_code: failed[0].res.statusCode,
  }
}
