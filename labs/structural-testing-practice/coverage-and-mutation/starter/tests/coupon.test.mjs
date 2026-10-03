import { describe, expect, it } from 'vitest'
import { couponDiscount } from '../src/coupon.mjs'

const fixed = { type: 'FIXED', amount: 3_000, minOrderAmount: 20_000 }
const percent = { type: 'PERCENT', rate: 10, maxDiscount: 5_000, minOrderAmount: 30_000 }

describe('couponDiscount', () => {
  it('최소 주문 금액에 못 미치면 0원', () => {
    expect(couponDiscount(fixed, 10_000)).toBe(0)
  })

  it('정액 쿠폰은 정해진 금액을 할인한다', () => {
    expect(couponDiscount(fixed, 50_000)).toBe(3_000)
  })

  it('정률 쿠폰은 최대 할인액을 넘지 않는다', () => {
    expect(couponDiscount(percent, 89_000)).toBe(5_000)
  })

  it('금액이 음수이면 RangeError', () => {
    expect(() => couponDiscount(fixed, -1)).toThrow(RangeError)
  })
})
