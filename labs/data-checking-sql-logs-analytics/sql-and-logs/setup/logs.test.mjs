import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzeAccess, analyzeEvidence, normalizeEndpoint, parseAccessLine, parseAppLines } from '../check/log-analysis.mjs'
import { INCIDENT, LOG_SEED, TARGET_ORDER_ID, buildLogs } from './logs.mjs'

const { access, app } = buildLogs()
const labDir = path.resolve(import.meta.dirname, '..')

describe('로그 생성기', () => {
  it('결정적이다', () => {
    expect(buildLogs()).toEqual(buildLogs(LOG_SEED))
    expect(buildLogs(LOG_SEED + 1).access).not.toBe(access)
  })

  it('starter/data 의 로그 파일은 생성기가 만든 것과 정확히 같다 (재생성하면 같은 파일이 나온다)', () => {
    expect(fs.readFileSync(path.join(labDir, 'starter', 'data', 'access.log'), 'utf8')).toBe(access)
    expect(fs.readFileSync(path.join(labDir, 'starter', 'data', 'app.log'), 'utf8')).toBe(app)
  })

  it('access.log 는 모든 줄이 파싱되고 시간 순이다', () => {
    const rows = access.split('\n').filter(Boolean).map(parseAccessLine)
    expect(rows.every(Boolean)).toBe(true)
    const times = rows.map((r) => r.time)
    expect(times).toEqual([...times].sort())
  })

  it('app.log 는 모두 JSON 이고, 모든 access 요청의 rid 가 app.log 의 reqId 로 한 번씩 완료된다', () => {
    const lines = parseAppLines(app)
    const completed = lines.filter((l) => l.msg === 'request completed')
    const rids = access.split('\n').filter(Boolean).map((l) => parseAccessLine(l).rid)
    expect(completed.map((l) => l.reqId).sort()).toEqual([...rids].sort())
    expect(new Set(rids).size).toBe(rids.length)
  })

  it('상태 코드가 access.log 와 app.log 에서 같다', () => {
    const status = new Map(parseAppLines(app).filter((l) => l.msg === 'request completed').map((l) => [l.reqId, l.res.statusCode]))
    for (const l of access.split('\n').filter(Boolean)) {
      const r = parseAccessLine(l)
      expect(status.get(r.rid)).toBe(r.status)
    }
  })
})

describe('분석기 (정답)', () => {
  const a = analyzeAccess(access)

  it('규모와 사건: 5xx 는 장애 시간대에 몰려 있고 결제 엔드포인트가 압도적으로 많다', () => {
    expect(a.total_requests).toBeGreaterThan(1100)
    expect(a.count_5xx).toBeGreaterThan(30)
    expect(a.most_5xx_endpoint).toBe('POST /api/orders/:id/pay')
    expect(a.topIsUnique).toBe(true)
    const kst = (ms) => new Date(ms + 9 * 3600_000).toISOString().slice(11, 19)
    // 5xx 중 결제 요청이 아닌 것(교착)은 장애 시간대 밖에 있다. 첫·마지막 5xx 는 시각 문자열로 비교한다.
    expect(a.first_5xx_at >= '13:00:00' && a.first_5xx_at <= kst(INCIDENT.end)).toBe(true)
    expect(a.last_5xx_at >= kst(INCIDENT.start)).toBe(true)
  })

  it('장애와 무관한 5xx(교착 500) 두 건이 있어서, 첫·마지막 5xx 가 장애의 시작·끝과 다르다 (함정)', () => {
    const rows = access.split('\n').filter(Boolean).map(parseAccessLine).filter((r) => r.status >= 500)
    const other = rows.filter((r) => normalizeEndpoint(r.method, r.path) !== 'POST /api/orders/:id/pay')
    expect(other).toHaveLength(2)
    const payTimes = rows.filter((r) => !other.includes(r)).map((r) => r.time).sort()
    expect(a.first_5xx_at).toBe(other.map((r) => r.time).sort()[0]) // 13:02 의 교착이 첫 5xx
    expect(a.first_5xx_at < payTimes[0]).toBe(true)
    expect(a.last_5xx_at > payTimes[payTimes.length - 1]).toBe(true)
  })

  it('증거: 주문 842 의 실패한 결제 요청은 하나뿐이고, 성공한 요청과 상관 ID 가 다르다', () => {
    const e = analyzeEvidence(app, TARGET_ORDER_ID)
    expect(e).toMatchObject({ attempts: 3, error_code: 'ETIMEDOUT', final_status_code: 502 })
    expect(e.gateway_tx_id).toMatch(/^GW-[0-9A-F]{6}$/)
    const pays = parseAppLines(app).filter((l) => l.msg === 'request completed' && l.req.url === `/api/orders/${TARGET_ORDER_ID}/pay`)
    expect(pays.map((p) => p.res.statusCode).sort()).toEqual([200, 502])
    expect(new Set(pays.map((p) => p.reqId)).size).toBe(2)
  })

  it('다른 장애 주문들의 시도 횟수가 섞여 있어 842 번의 3회가 우연히 정답이 되지 않는다', () => {
    const lines = parseAppLines(app)
    const attempts = lines.filter((l) => l.msg === 'payment failed').map((f) => lines.filter((l) => l.reqId === f.reqId && l.msg === 'gateway call').length)
    expect(new Set(attempts)).toEqual(new Set([2, 3]))
  })

  it('같은 주문이 아닌 번호로 물으면 오류를 돌려준다', () => {
    expect(analyzeEvidence(app, 9999).error).toMatch(/정확히 1개/)
  })
})
