import { describe, expect, it } from 'vitest'
import { evaluateGrade, gradeDiscount } from '../../src/domain/grade.js'
import { withDefects } from '../helpers.js'

describe('evaluateGrade (SPEC §1.3)', () => {
  it.each([
    [0, 'NORMAL'],
    [99_999, 'NORMAL'],
    [100_000, 'SILVER'],
    [499_999, 'SILVER'],
    [500_000, 'GOLD'],
    [999_999, 'GOLD'],
    [1_000_000, 'VIP'],
    [50_000_000, 'VIP'],
  ])('누적 %i원 → %s', (spent, grade) => {
    expect(evaluateGrade(spent)).toBe(grade)
  })

  it('음수·소수는 거부한다', () => {
    expect(() => evaluateGrade(-1)).toThrow(RangeError)
    expect(() => evaluateGrade(1.5)).toThrow(RangeError)
  })

  it('DF-002 가 켜지면 1,000,000원 경계가 어긋난다', () => {
    expect(withDefects(['DF-002'], () => evaluateGrade(1_000_000))).toBe('GOLD')
    expect(withDefects(['DF-002'], () => evaluateGrade(1_000_001))).toBe('VIP')
  })
})

describe('gradeDiscount (SPEC §3 내림)', () => {
  it('원 단위 미만을 버린다', () => {
    expect(gradeDiscount(4_990, 'SILVER')).toBe(49)
    expect(gradeDiscount(10_000, 'GOLD')).toBe(300)
    expect(gradeDiscount(10_000, 'NORMAL')).toBe(0)
  })

  it('DF-011 이 켜지면 반올림한다', () => {
    expect(withDefects(['DF-011'], () => gradeDiscount(4_990, 'SILVER'))).toBe(50)
  })
})
