import { describe, expect, it } from 'vitest'
import { gradeDiscount, gradeFor } from '../src/grade.mjs'
import { shippingFee } from '../src/shipping.mjs'

describe('shippingFee (배송비)', () => {
  it.each([
    [49_999, 3_000], // 경계 바로 아래
    [50_000, 0], // 경계
    [50_001, 0], // 경계 바로 위
    [0, 3_000], // 최솟값
  ])('할인 후 %i원이면 배송비 %i원', (amount, fee) => {
    expect(shippingFee(amount)).toBe(fee)
  })

  it('도서산간은 추가 운임이 붙고, 무료 배송이어도 추가 운임은 받는다', () => {
    expect(shippingFee(49_999, { remote: true })).toBe(6_000)
    expect(shippingFee(50_000, { remote: true })).toBe(3_000)
  })

  it('잘못된 입력은 RangeError (음수, 소수, NaN)', () => {
    expect(() => shippingFee(-1)).toThrow(RangeError)
    expect(() => shippingFee(1.5)).toThrow(RangeError)
    expect(() => shippingFee(Number.NaN)).toThrow(RangeError)
  })
})

describe('gradeFor (등급)', () => {
  it.each([
    [0, 'NORMAL'],
    [99_999, 'NORMAL'],
    [100_000, 'SILVER'],
    [499_999, 'SILVER'],
    [500_000, 'GOLD'],
    [999_999, 'GOLD'],
    [1_000_000, 'VIP'],
  ])('누적 %i원 → %s', (spent, grade) => {
    expect(gradeFor(spent)).toBe(grade)
  })

  it('잘못된 입력은 RangeError', () => {
    expect(() => gradeFor(-1)).toThrow(RangeError)
    expect(() => gradeFor(0.5)).toThrow(RangeError)
  })
})

describe('gradeDiscount (등급 할인)', () => {
  it('원 단위 미만은 버린다 (49.9원 → 49원)', () => {
    expect(gradeDiscount(4_990, 'SILVER')).toBe(49)
  })

  it('등급별 할인율', () => {
    expect(gradeDiscount(10_000, 'NORMAL')).toBe(0)
    expect(gradeDiscount(10_000, 'SILVER')).toBe(100)
    expect(gradeDiscount(10_000, 'GOLD')).toBe(300)
    expect(gradeDiscount(10_000, 'VIP')).toBe(500)
  })
})
