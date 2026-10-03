import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildPcap, PASSWORD, TOKEN } from './pcap-gen.mjs'
import { analyze, answersFrom, readPackets } from './pcap-analysis.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const starterPcap = fs.readFileSync(path.join(here, '..', 'starter', 'capture.pcap'))

describe('합성 캡처', () => {
  it('생성기는 결정적이다 — 같은 바이트가 나온다', () => {
    expect(buildPcap().equals(buildPcap())).toBe(true)
  })

  it('starter/capture.pcap 은 생성기의 현재 출력과 같다 (생성기를 고치면 파일도 다시 만든다)', () => {
    expect(starterPcap.equals(buildPcap())).toBe(true)
  })

  it('패킷 수와 형식', () => {
    expect(readPackets(starterPcap)).toHaveLength(68)
  })
})

describe('독립 분석기 — tshark 로 교차 확인한 값(골든)과 같다', () => {
  // tshark -Y "http.response" -T fields -e http.response.code -e http.time 의 결과:
  // tshark 가 읽은 패킷 68개, 12개 응답, 최대 1.850초(500), tcp.analysis.retransmission 2건, 500 응답 2건
  const { exchanges, retransmissions } = analyze(starterPcap)

  it('요청·응답 12쌍', () => {
    expect(exchanges).toHaveLength(12)
  })

  it('요청-응답 간격이 tshark 의 http.time 과 같다', () => {
    expect(exchanges.map((e) => e.elapsedMs)).toEqual([35, 22, 41, 18, 55, 20, 30, 120, 1850, 25, 70, 640])
  })

  it('재전송 2건', () => {
    expect(retransmissions).toBe(2)
  })

  it('질문별 정답', () => {
    expect(answersFrom(starterPcap)).toEqual({
      password: PASSWORD,
      token_prefix: TOKEN.slice(0, 8),
      server_error_paths: ['/api/orders/7/pay', '/api/quote'],
      slowest_path: '/api/orders/7/pay',
      slowest_ms: 1850,
      retransmissions: 2,
    })
  })

  it('재전송된 패킷은 메시지를 두 번 세지 않는다 (결제 요청은 한 번만 나온다)', () => {
    expect(exchanges.filter((e) => e.path === '/api/orders/7/pay')).toHaveLength(1)
  })
})
