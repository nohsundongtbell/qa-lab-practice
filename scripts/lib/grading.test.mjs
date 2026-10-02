import { describe, expect, it } from 'vitest'
import { gradeCases, groupByDefect } from './grading.mjs'

/** 가짜 SUT: DF-001 이면 등급 경계가 틀리고, DF-002 면 배송비 경계가 틀린다. 둘 다 켜야만 생기는 DF-003+DF-004 조합 결함도 있다. */
function fakeSut() {
  const calls = []
  const fetchImpl = async (url, init) => {
    const u = new URL(url)
    const active = new Set((init.headers['x-qa-lab-defects'] ?? '').split(',').filter((x) => x && x !== 'none'))
    calls.push({ path: u.pathname + u.search, defects: [...active].sort().join(',') })
    let body = {}
    if (u.pathname === '/__admin/reset') body = { status: 'reset' }
    if (u.pathname === '/grade') {
      const spent = Number(u.searchParams.get('v'))
      body = { grade: active.has('DF-001') ? (spent > 100 ? 'VIP' : 'GOLD') : spent >= 100 ? 'VIP' : 'GOLD' }
    }
    if (u.pathname === '/fee') {
      const amt = Number(u.searchParams.get('v'))
      body = { fee: active.has('DF-002') ? (amt > 50 ? 0 : 3) : amt >= 50 ? 0 : 3 }
    }
    if (u.pathname === '/combo') body = { ok: !(active.has('DF-003') && active.has('DF-004')) }
    return { status: 200, text: async () => JSON.stringify(body) }
  }
  return { fetchImpl, calls }
}
const kase = (id, path, json, extra = {}) => ({ id, label: id, repro: { steps: [{ http: { path }, expect: { json } }] }, ...extra })
const ALL = ['DF-001', 'DF-002', 'DF-003', 'DF-004']

describe('gradeCases', () => {
  it('유효·검출·미검출·무효를 구분하고 결함을 귀속한다', async () => {
    const sut = fakeSut()
    const { results, detected } = await gradeCases(
      [
        kase('grade-100', '/grade?v=100', { grade: 'VIP' }), // 경계 → DF-001 검출
        kase('grade-500', '/grade?v=500', { grade: 'VIP' }), // 경계 아님 → 미검출
        kase('fee-50', '/fee?v=50', { fee: 0 }), // 경계 → DF-002 검출
        kase('wrong', '/fee?v=10', { fee: 0 }), // 기대값이 사양과 다름 → 무효
      ],
      { baseUrl: 'http://sut.test', defectIds: ALL, fetch: sut.fetchImpl },
    )
    expect(results.map((r) => [r.id, r.status, r.defects])).toEqual([
      ['grade-100', 'detected', ['DF-001']],
      ['grade-500', 'undetected', []],
      ['fee-50', 'detected', ['DF-002']],
      ['wrong', 'invalid', []],
    ])
    expect([...detected].sort()).toEqual(['DF-001', 'DF-002'])
    expect(results[3].failures[0]).toMatchObject({ kind: 'json', path: 'fee', expected: 0, actual: 3 })
  })

  it('무효 케이스는 결함 버전에서 실행하지 않는다 (none 한 번만)', async () => {
    const sut = fakeSut()
    await gradeCases([kase('wrong', '/fee?v=10', { fee: 0 })], { baseUrl: 'http://sut.test', defectIds: ALL, fetch: sut.fetchImpl })
    expect(sut.calls.map((c) => c.defects)).toEqual([''])
  })

  it('미검출이면 귀속 실행을 하지 않는다 (none + 전체 = 2번)', async () => {
    const sut = fakeSut()
    await gradeCases([kase('g', '/grade?v=500', { grade: 'VIP' })], { baseUrl: 'http://sut.test', defectIds: ALL, fetch: sut.fetchImpl })
    expect(sut.calls).toHaveLength(2)
  })

  it('결함 조합에서만 실패하면 detected 이지만 귀속된 결함은 없다', async () => {
    const sut = fakeSut()
    const { results, detected } = await gradeCases([kase('combo', '/combo', { ok: true })], { baseUrl: 'http://sut.test', defectIds: ALL, fetch: sut.fetchImpl })
    expect(results[0]).toMatchObject({ status: 'detected', defects: [] })
    expect(detected.size).toBe(0)
  })

  it('reset 이 필요한 케이스는 실행마다 DB 를 초기화한다', async () => {
    const sut = fakeSut()
    await gradeCases([kase('g', '/grade?v=100', { grade: 'VIP' }, { reset: true })], { baseUrl: 'http://sut.test', defectIds: ['DF-001'], fetch: sut.fetchImpl })
    expect(sut.calls.filter((c) => c.path === '/__admin/reset')).toHaveLength(3) // none, 전체, DF-001
  })

  it('절차 오류(ReproError)는 error 로 기록하고 다른 케이스는 계속 채점한다', async () => {
    const sut = fakeSut()
    const { results } = await gradeCases(
      [{ id: 'bad', label: 'bad', repro: { steps: [{ nope: 1 }] } }, kase('ok', '/grade?v=100', { grade: 'VIP' })],
      { baseUrl: 'http://sut.test', defectIds: ALL, fetch: sut.fetchImpl },
    )
    expect(results[0]).toMatchObject({ status: 'error' })
    expect(results[0].error).toMatch(/종류를 알 수 없습니다/)
    expect(results[1].status).toBe('detected')
  })

  it('진행 상황을 알려 준다', async () => {
    const msgs = []
    await gradeCases([kase('a', '/grade?v=1', { grade: 'GOLD' })], { baseUrl: 'http://sut.test', defectIds: [], fetch: fakeSut().fetchImpl, onProgress: (m) => msgs.push(m) })
    expect(msgs).toEqual(['(1/1) a'])
  })
})

describe('groupByDefect', () => {
  it('결함별로 케이스를 묶는다', () => {
    const g = groupByDefect([{ id: 'a', defects: ['DF-001'] }, { id: 'b', defects: ['DF-001', 'DF-002'] }, { id: 'c', defects: [] }])
    expect([...g.entries()]).toEqual([['DF-001', ['a', 'b']], ['DF-002', ['b']]])
  })
})
