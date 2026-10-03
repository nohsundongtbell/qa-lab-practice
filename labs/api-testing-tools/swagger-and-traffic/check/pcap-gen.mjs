/**
 * 실습용 .pcap 을 결정적으로 만든다 (Ethernet + IPv4 + TCP, 평문 HTTP).
 * 실제 서버를 캡처한 파일이 아니라 합성 데이터다. 같은 입력이면 항상 같은 바이트가 나온다.
 * 사용: node check/pcap-gen.mjs <출력 경로>
 */
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const CLIENT = { ip: [10, 0, 0, 5], mac: [0x02, 0x00, 0x00, 0x00, 0x00, 0x05] }
const SERVER = { ip: [10, 0, 0, 10], mac: [0x02, 0x00, 0x00, 0x00, 0x00, 0x0a], port: 3000 }
const BASE_SEC = 1_790_000_000 // 2026-09-21 의 어느 시각 (고정값)

export const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.qa-lab-sample-token'
export const PASSWORD = 'qa-lab-1234'

const checksum = (buf) => {
  let sum = 0
  for (let i = 0; i < buf.length; i += 2) sum += (buf[i] << 8) | (i + 1 < buf.length ? buf[i + 1] : 0)
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16)
  return ~sum & 0xffff
}

const FLAGS = { FIN: 0x01, SYN: 0x02, RST: 0x04, PSH: 0x08, ACK: 0x10 }

function frame({ fromClient, port, seq, ack, flags, payload = Buffer.alloc(0), ipId }) {
  const src = fromClient ? CLIENT : SERVER
  const dst = fromClient ? SERVER : CLIENT
  const sport = fromClient ? port : SERVER.port
  const dport = fromClient ? SERVER.port : port
  const tcp = Buffer.alloc(20 + payload.length)
  tcp.writeUInt16BE(sport, 0)
  tcp.writeUInt16BE(dport, 2)
  tcp.writeUInt32BE(seq >>> 0, 4)
  tcp.writeUInt32BE(ack >>> 0, 8)
  tcp[12] = 5 << 4
  tcp[13] = flags
  tcp.writeUInt16BE(65535, 14)
  payload.copy(tcp, 20)
  const pseudo = Buffer.concat([Buffer.from(src.ip), Buffer.from(dst.ip), Buffer.from([0, 6]), Buffer.from([tcp.length >> 8, tcp.length & 0xff])])
  tcp.writeUInt16BE(checksum(Buffer.concat([pseudo, tcp])), 16)
  const ip = Buffer.alloc(20)
  ip[0] = 0x45
  ip.writeUInt16BE(20 + tcp.length, 2)
  ip.writeUInt16BE(ipId, 4)
  ip[6] = 0x40 // DF
  ip[8] = 64
  ip[9] = 6
  Buffer.from(src.ip).copy(ip, 12)
  Buffer.from(dst.ip).copy(ip, 16)
  ip.writeUInt16BE(checksum(ip), 10)
  const eth = Buffer.alloc(14)
  Buffer.from(dst.mac).copy(eth, 0)
  Buffer.from(src.mac).copy(eth, 6)
  eth.writeUInt16BE(0x0800, 12)
  return Buffer.concat([eth, ip, tcp])
}

const http = (start, headers, body = '') => {
  const lines = [start, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`)]
  if (body) lines.push(`Content-Length: ${Buffer.byteLength(body)}`)
  return Buffer.from(`${lines.join('\r\n')}\r\n\r\n${body}`)
}
const json = (o) => JSON.stringify(o)

/** 시나리오 정의. latency: 요청을 처음 보낸 시각부터 응답 첫 패킷까지(ms). */
const SESSION = [
  { conn: 0, at: 0, req: ['POST', '/api/auth/login', null, json({ email: 'kim@example.com', password: PASSWORD })], status: 200, body: json({ token: TOKEN }), latency: 35 },
  { conn: 0, at: 400, req: ['GET', '/api/members/me', TOKEN], status: 200, body: json({ id: 1, name: '김일반', grade: 'NORMAL', totalSpent: 0 }), latency: 22 },
  { conn: 0, at: 900, req: ['GET', '/api/products', TOKEN], status: 200, body: json([{ id: 1, name: '무선 키보드', price: 50000, stock: 30 }]), latency: 41 },
  { conn: 1, at: 1300, req: ['GET', '/api/products/1', TOKEN], status: 200, body: json({ id: 1, name: '무선 키보드', price: 50000, stock: 30 }), latency: 18 },
  { conn: 1, at: 1700, req: ['POST', '/api/quote', TOKEN, json({ items: [{ productId: 1, qty: 1 }] })], status: 200, body: json({ subtotal: 50000, shippingFee: 0, total: 50000 }), latency: 55 },
  { conn: 1, at: 2100, req: ['GET', '/api/orders/99999', TOKEN], status: 404, body: json({ code: 'NOT_FOUND', message: '주문을 찾을 수 없습니다.', details: {} }), latency: 20 },
  { conn: 2, at: 2600, req: ['PUT', '/api/cart/items/1', TOKEN, json({ qty: 1 })], status: 200, body: json({ items: [{ productId: 1, qty: 1 }] }), latency: 30 },
  { conn: 2, at: 3000, req: ['POST', '/api/orders', TOKEN, json({})], status: 201, body: json({ id: 7, status: 'PENDING', total: 50000 }), latency: 120 },
  // 결제 요청을 보냈는데 서버가 오래 걸린 뒤 500 으로 답한다. 요청 패킷이 한 번 재전송된다.
  { conn: 2, at: 3500, req: ['POST', '/api/orders/7/pay', TOKEN, json({ cardNumber: '4242424242424242' })], status: 500, body: json({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: {} }), latency: 1850, retransmitRequestAfter: 200 },
  { conn: 2, at: 5600, req: ['GET', '/api/orders/7', TOKEN], status: 200, body: json({ id: 7, status: 'PENDING', total: 50000 }), latency: 25 },
  { conn: 1, at: 6000, req: ['POST', '/api/quote', TOKEN, json({ items: [{ productId: 1, qty: 1 }], zipcode: '123' })], status: 500, body: json({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: {} }), latency: 70 },
  // 응답 패킷이 한 번 재전송된다.
  { conn: 0, at: 6500, req: ['GET', '/api/orders', TOKEN], status: 200, body: json([{ id: 7, status: 'PENDING', total: 50000 }]), latency: 640, retransmitResponseAfter: 230 },
]
const PORTS = [51001, 51002, 51003]

const REASONS = { 200: 'OK', 201: 'Created', 404: 'Not Found', 500: 'Internal Server Error' }

export function buildPcap() {
  const packets = [] // { t (ms from start), buf }
  let ipId = 1000
  const conns = PORTS.map((port, i) => ({ port, cseq: 1_000_000 * (i + 1), sseq: 5_000_000 * (i + 1) }))
  const push = (t, c, fromClient, flags, payload) => {
    const f = frame({
      fromClient, port: c.port, ipId: ipId++, flags, payload,
      seq: fromClient ? c.cseq : c.sseq,
      ack: flags & FLAGS.SYN && fromClient ? 0 : fromClient ? c.sseq : c.cseq,
    })
    packets.push({ t, buf: f })
    return payload.length
  }

  // 3 방향 핸드셰이크
  conns.forEach((c, i) => {
    const t0 = i * 3
    push(t0, c, true, FLAGS.SYN, Buffer.alloc(0))
    c.cseq += 1
    push(t0 + 1, c, false, FLAGS.SYN | FLAGS.ACK, Buffer.alloc(0))
    c.sseq += 1
    push(t0 + 2, c, true, FLAGS.ACK, Buffer.alloc(0))
  })

  for (const ex of SESSION) {
    const c = conns[ex.conn]
    const [method, path, token, body] = ex.req
    const headers = { Host: '10.0.0.10:3000', 'User-Agent': 'qa-lab-client/1.0', Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body) headers['Content-Type'] = 'application/json'
    const reqPayload = http(`${method} ${path} HTTP/1.1`, headers, body)
    const t0 = 20 + ex.at
    const reqSeq = c.cseq
    const n = push(t0, c, true, FLAGS.PSH | FLAGS.ACK, reqPayload)
    c.cseq += n
    if (ex.retransmitRequestAfter) {
      const keep = c.cseq
      c.cseq = reqSeq
      push(t0 + ex.retransmitRequestAfter, c, true, FLAGS.PSH | FLAGS.ACK, reqPayload)
      c.cseq = keep
    }
    // 요청 수신 확인. 요청이 재전송되는 경우는 첫 전송에 대한 확인이 오지 않았으므로 재전송분에 대해 확인한다.
    push(t0 + (ex.retransmitRequestAfter ? ex.retransmitRequestAfter + 1 : 1), c, false, FLAGS.ACK, Buffer.alloc(0))
    const resPayload = http(`HTTP/1.1 ${ex.status} ${REASONS[ex.status]}`, { 'Content-Type': 'application/json; charset=utf-8' }, ex.body)
    const resSeq = c.sseq
    const m = push(t0 + ex.latency, c, false, FLAGS.PSH | FLAGS.ACK, resPayload)
    c.sseq += m
    if (ex.retransmitResponseAfter) {
      const keep = c.sseq
      c.sseq = resSeq
      push(t0 + ex.latency + ex.retransmitResponseAfter, c, false, FLAGS.PSH | FLAGS.ACK, resPayload)
      c.sseq = keep
    }
    push(t0 + ex.latency + (ex.retransmitResponseAfter ?? 0) + 1, c, true, FLAGS.ACK, Buffer.alloc(0))
  }

  // 연결 종료
  const tEnd = 20 + 7500
  conns.forEach((c, i) => {
    push(tEnd + i * 4, c, true, FLAGS.FIN | FLAGS.ACK, Buffer.alloc(0))
    c.cseq += 1
    push(tEnd + i * 4 + 1, c, false, FLAGS.FIN | FLAGS.ACK, Buffer.alloc(0))
    c.sseq += 1
    push(tEnd + i * 4 + 2, c, true, FLAGS.ACK, Buffer.alloc(0))
  })

  packets.sort((a, b) => a.t - b.t) // 안정 정렬 — 같은 시각이면 만든 순서
  const header = Buffer.alloc(24)
  header.writeUInt32LE(0xa1b2c3d4, 0)
  header.writeUInt16LE(2, 4)
  header.writeUInt16LE(4, 6)
  header.writeUInt32LE(65535, 16)
  header.writeUInt32LE(1, 20) // Ethernet
  const records = packets.map(({ t, buf }) => {
    const rec = Buffer.alloc(16)
    rec.writeUInt32LE(BASE_SEC + Math.floor(t / 1000), 0)
    rec.writeUInt32LE((t % 1000) * 1000, 4)
    rec.writeUInt32LE(buf.length, 8)
    rec.writeUInt32LE(buf.length, 12)
    return Buffer.concat([rec, buf])
  })
  return Buffer.concat([header, ...records])
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = process.argv[2]
  if (!out) throw new Error('사용: node pcap-gen.mjs <출력 경로>')
  fs.writeFileSync(out, buildPcap())
}
