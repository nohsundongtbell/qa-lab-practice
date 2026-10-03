/**
 * .pcap 을 읽어 HTTP 교환(요청·응답 쌍)과 TCP 재전송을 계산한다. 채점기가 정답을 직접 계산하는 데 쓴다.
 * 지원: Ethernet + IPv4 + TCP, 평문 HTTP/1.1, 서버 포트 3000. (이 랩의 합성 캡처 전용)
 */
const SERVER_PORT = 3000

export function readPackets(buf) {
  if (buf.length < 24) throw new Error('pcap 파일이 너무 짧습니다')
  const magic = buf.readUInt32LE(0)
  if (magic !== 0xa1b2c3d4) throw new Error('지원하지 않는 pcap 형식입니다 (마이크로초 단위·리틀 엔디언만 지원)')
  const packets = []
  for (let off = 24; off + 16 <= buf.length; ) {
    const sec = buf.readUInt32LE(off)
    const usec = buf.readUInt32LE(off + 4)
    const len = buf.readUInt32LE(off + 8)
    packets.push({ ts: sec * 1000 + usec / 1000, data: buf.subarray(off + 16, off + 16 + len) })
    off += 16 + len
  }
  return packets
}

function parseTcp(data) {
  if (data.length < 54 || data.readUInt16BE(12) !== 0x0800) return null
  const ihl = (data[14] & 0x0f) * 4
  if (data[14 + 9] !== 6) return null
  const ipTotal = data.readUInt16BE(14 + 2)
  const t = 14 + ihl
  const dataOffset = (data[t + 12] >> 4) * 4
  return {
    srcPort: data.readUInt16BE(t),
    dstPort: data.readUInt16BE(t + 2),
    seq: data.readUInt32BE(t + 4),
    payload: data.subarray(t + dataOffset, 14 + ipTotal),
  }
}

/** @returns {{ exchanges: Array<{ method: string, path: string, status: number, requestAt: number, responseAt: number, elapsedMs: number, headers: Record<string,string>, body: string }>, retransmissions: number }} */
export function analyze(buf) {
  const conns = new Map() // 클라이언트 포트 → { seen:Set, requests:[], responses:[] }
  let retransmissions = 0
  for (const p of readPackets(buf)) {
    const seg = parseTcp(p.data)
    if (!seg || seg.payload.length === 0) continue
    const fromClient = seg.dstPort === SERVER_PORT
    const port = fromClient ? seg.srcPort : seg.dstPort
    const c = conns.get(port) ?? { seen: new Set(), requests: [], responses: [] }
    conns.set(port, c)
    const key = `${fromClient ? 'c' : 's'}:${seg.seq}:${seg.payload.length}`
    if (c.seen.has(key)) {
      retransmissions++
      continue
    }
    c.seen.add(key)
    const text = seg.payload.toString('utf8')
    const list = fromClient ? c.requests : c.responses
    const startsMessage = fromClient ? /^[A-Z]+ \S+ HTTP\/1\.[01]\r\n/.test(text) : /^HTTP\/1\.[01] \d{3} /.test(text)
    if (startsMessage || list.length === 0) list.push({ ts: p.ts, text })
    else list[list.length - 1].text += text // 한 메시지가 여러 세그먼트로 나뉜 경우
  }

  const exchanges = []
  for (const c of conns.values()) {
    c.requests.forEach((rq, i) => {
      const rs = c.responses[i]
      if (!rs) return
      const [head, ...rest] = rq.text.split('\r\n\r\n')
      const [line, ...headerLines] = head.split('\r\n')
      const [method, path] = line.split(' ')
      const headers = Object.fromEntries(headerLines.map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]))
      exchanges.push({
        method, path, status: Number(rs.text.slice(9, 12)), requestAt: rq.ts, responseAt: rs.ts,
        elapsedMs: Math.round(rs.ts - rq.ts), headers, body: rest.join('\r\n\r\n'),
      })
    })
  }
  exchanges.sort((a, b) => a.requestAt - b.requestAt)
  return { exchanges, retransmissions }
}

/** 이 랩의 질문별 정답. */
export function answersFrom(buf) {
  const { exchanges, retransmissions } = analyze(buf)
  const login = exchanges.find((e) => e.path === '/api/auth/login')
  const token = exchanges.map((e) => /^Bearer (.+)$/.exec(e.headers.authorization ?? '')?.[1]).find(Boolean)
  const slowest = exchanges.reduce((a, b) => (b.elapsedMs > a.elapsedMs ? b : a))
  return {
    password: JSON.parse(login.body).password,
    token_prefix: token.slice(0, 8),
    server_error_paths: [...new Set(exchanges.filter((e) => e.status >= 500).map((e) => e.path))].sort(),
    slowest_path: slowest.path,
    slowest_ms: slowest.elapsedMs,
    retransmissions,
  }
}

/** t4 질문 정의 (답 비교 방식). */
export const SPEC = [
  { id: 'password', kind: 'text' },
  { id: 'token_prefix', kind: 'text' },
  { id: 'server_error_paths', kind: 'set' },
  { id: 'slowest_path', kind: 'text' },
  { id: 'slowest_ms', kind: 'number', tol: 50 },
  { id: 'retransmissions', kind: 'number' },
]
