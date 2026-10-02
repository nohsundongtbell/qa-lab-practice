import { describe, expect, it } from 'vitest'
import { evaluatePass, formatCaseResult, reproFromBlock } from './lab-kit.mjs'
import { repoRoot } from './paths.mjs'

const r = (status, defects = [], extra = {}) => ({ id: status, label: `케이스-${status}`, status, defects, ...extra })

describe('formatCaseResult', () => {
  it('검출: 결함 ID 를 보여 준다', () => {
    expect(formatCaseResult(r('detected', ['DF-001']))).toBe('  [검출] 케이스-detected → 결함 1개 (DF-001)')
    expect(formatCaseResult(r('detected', []))).toMatch(/여러 결함이 겹칠 때만/)
  })

  it('무효: 실제 값을 숨긴다 (오라클이 정답을 알려 주지 않음)', () => {
    const line = formatCaseResult(r('invalid', [], { failures: [{ kind: 'json', label: 'quote', path: 'shippingFee', expected: 0, actual: 3000 }] }))
    expect(line).toContain('shippingFee 기대값(0)이 사양과 다릅니다')
    expect(line).not.toContain('3000')
  })

  it('미검출·오류', () => {
    expect(formatCaseResult(r('undetected'))).toBe('  [미검출] 케이스-undetected')
    expect(formatCaseResult(r('error', [], { error: '형식' }))).toBe('  [오류] 케이스-error → 형식')
  })
})

describe('evaluatePass', () => {
  const graded = (results) => ({ results, detected: new Set(results.flatMap((x) => x.defects)) })

  it('서로 다른 결함 수로 판정한다 (같은 결함 여러 번은 1개)', () => {
    const g = graded([r('detected', ['DF-001']), r('detected', ['DF-001']), r('undetected')])
    expect(evaluatePass(g, { min_defects: 2 }).passed).toBe(false)
    expect(evaluatePass(g, { min_defects: 1 }).passed).toBe(true)
  })

  it('무효·오류 케이스가 있으면 결함을 충분히 잡아도 실패', () => {
    const g = graded([r('detected', ['DF-001']), r('invalid')])
    const v = evaluatePass(g, { min_defects: 1 })
    expect(v.passed).toBe(false)
    expect(v.reasons.join()).toMatch(/무효 케이스 1개/)
  })

  it('max_cases 를 넘으면 실패', () => {
    const g = graded([r('detected', ['DF-001']), r('undetected'), r('undetected')])
    expect(evaluatePass(g, { min_defects: 1, max_cases: 2 }).reasons.join()).toMatch(/상한 2개/)
  })

  it('케이스가 없으면 실패, noun 으로 명사를 바꾼다', () => {
    expect(evaluatePass(graded([]), {}, { noun: '리포트' }).reasons).toContain('제출한 리포트가 없습니다')
  })

  it('beyond_profile: 그 프로필에 있는 결함은 세지 않는다 (실제 프로필 사용)', () => {
    const g = graded([r('detected', ['DF-001']), r('detected', ['DF-007'])])
    const v = evaluatePass(g, { min_defects: 2, beyond_profile: 'beginner' }, { repoRoot })
    expect(v.counted).toEqual(['DF-007'])
    expect(v.passed).toBe(false)
    expect(v.summary).toMatch(/beginner 수준을 넘는 서로 다른 결함 1개/)
  })
})

describe('reproFromBlock', () => {
  it('steps 가 있는 YAML 만 받는다', () => {
    expect(reproFromBlock('steps:\n  - me: {}\n')).toEqual({ repro: { steps: [{ me: {} }] } })
    expect(reproFromBlock('steps: []').error).toMatch(/steps/)
    expect(reproFromBlock('steps: [').error).toMatch(/YAML 문법 오류/)
    expect(reproFromBlock('').error).toMatch(/steps/)
  })
})
