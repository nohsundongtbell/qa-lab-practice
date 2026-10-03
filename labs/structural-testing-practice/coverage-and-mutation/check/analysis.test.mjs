import { describe, expect, it } from 'vitest'
import { EXPECTED, VARIABLE_OF, compareAnalysis, normalizePair } from './analysis.mjs'

/**
 * 정답표를 손으로 믿지 않고, packagePlan 의 모든 실행 경로를 시뮬레이션해 독립적으로 유도한다.
 * 각 경로는 실행되는 정의(D)·사용(U) 이벤트의 순서다. (소스의 주석 번호와 같다)
 */
const PATHS = {
  'w>10, express': ['D1', 'D2', 'U1', 'D3', 'U2', 'D4', 'D5', 'U4', 'U5'],
  'w>10, !express, remote': ['D1', 'D2', 'U1', 'D3', 'U3', 'D6', 'U4', 'U5'],
  'w>10, !express, !remote': ['D1', 'D2', 'U1', 'D3', 'U4', 'U5'],
  'w<=10, express': ['D1', 'D2', 'U2', 'D4', 'D5', 'U4', 'U5'],
  'w<=10, !express, remote': ['D1', 'D2', 'U3', 'D6', 'U4', 'U5'],
  'w<=10, !express, !remote': ['D1', 'D2', 'U4', 'U5'],
}
const USE_VAR = { U1: 'fee', U2: 'fee', U4: 'fee', U3: 'days', U5: 'days' }

function derivePairs() {
  const pairs = new Set()
  for (const events of Object.values(PATHS)) {
    const lastDef = {}
    for (const e of events) {
      if (e[0] === 'D') lastDef[VARIABLE_OF[e]] = e
      else if (lastDef[USE_VAR[e]]) pairs.add(`${lastDef[USE_VAR[e]]}-${e}`) // 마지막 정의가 도달 (정의 사이에 재정의 없음)
    }
  }
  return pairs
}

describe('정답표', () => {
  it('손으로 쓴 정답이 경로 시뮬레이션으로 유도한 정의-사용 쌍과 같다', () => {
    const derived = derivePairs()
    const key = new Set([...EXPECTED.du_pairs.fee, ...EXPECTED.du_pairs.days])
    expect([...key].sort()).toEqual([...derived].sort())
    expect(key.size).toBe(10)
  })

  it('순환 복잡도 = 판단 3곳 + 1 = 독립 경로 수와 같다 (모든 판단 조합 중 도달 가능한 경로는 6개, 기저 경로는 4개)', () => {
    expect(EXPECTED.cyclomatic_complexity).toBe(3 + 1)
    expect(Object.keys(PATHS)).toHaveLength(6)
  })
})

describe('normalizePair', () => {
  it.each([['D1-U1', 'D1-U1'], ['d1->u1', 'D1-U1'], ['D1 → U1', 'D1-U1'], ['(D3, U4)', 'D3-U4']])('%s', (raw, n) => {
    expect(normalizePair(raw)).toBe(n)
  })
  it('쌍이 아니거나 순서가 거꾸로면 null', () => {
    for (const bad of ['D1', 'U1-D1', 'D1-D2', 'x', 'D1-U1-U2', 42]) expect(normalizePair(bad)).toBeNull()
  })
})

describe('compareAnalysis', () => {
  const all = [...EXPECTED.du_pairs.fee, ...EXPECTED.du_pairs.days]
  it('정답은 통과', () => {
    expect(compareAnalysis({ cyclomatic_complexity: 4, du_pairs: all }).passed).toBe(true)
  })
  it('표기가 달라도 같은 쌍이면 통과, 순서가 바뀌거나 중복이어도 통과', () => {
    expect(compareAnalysis({ cyclomatic_complexity: 4, du_pairs: [...all.map((p) => p.replace('-', ' → ')).reverse(), 'D1-U1'] }).passed).toBe(true)
  })
  it('빠진 쌍·틀린 쌍·복잡도 오류를 구분하고, 정답 쌍 자체는 결과에 담지 않는다', () => {
    const r = compareAnalysis({ cyclomatic_complexity: 3, du_pairs: all.filter((p) => p !== 'D3-U4').concat(['D1-U3', 'D6-U4']) })
    expect(r).toMatchObject({ passed: false, ccOk: false, correctTotal: 9, wrongTotal: 2 })
    expect(r.perVar.fee).toEqual({ total: 6, correct: 5, wrong: 1 }) // D1-U3 은 변수가 달라 days 쪽이 아닌 fee 정의 D1 로 분류됨
    expect(JSON.stringify(r)).not.toContain('D3-U4')
  })
  it('빈칸·형식 오류', () => {
    expect(compareAnalysis({}).ccBlank).toBe(true)
    expect(compareAnalysis({ cyclomatic_complexity: 4, du_pairs: ['모르겠음'] }).errors[0]).toMatch(/쌍으로 읽을 수 없는/)
    expect(compareAnalysis(null).passed).toBe(false)
  })
})
