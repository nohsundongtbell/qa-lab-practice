import { describe, expect, it } from 'vitest'
import { couponDiscount } from '../src/coupon.mjs'

const fixed = { type: 'FIXED', amount: 3_000, minOrderAmount: 20_000 }
const percent = { type: 'PERCENT', rate: 10, maxDiscount: 5_000, minOrderAmount: 30_000 }
const percentNoCap = { type: 'PERCENT', rate: 10, minOrderAmount: 0 }
const freebie = { type: 'FIXED', amount: 3_000, minOrderAmount: 0 }

describe('최소 주문 금액 (경계)', () => {
  it('바로 아래는 0원, 정확히 그 금액부터 적용', () => {
    expect(couponDiscount(fixed, 19_999)).toBe(0)
    expect(couponDiscount(fixed, 20_000)).toBe(3_000)
    expect(couponDiscount(fixed, 20_001)).toBe(3_000)
  })
})

describe('정률 쿠폰', () => {
  it('최대 할인액 미만이면 계산값 그대로', () => {
    expect(couponDiscount(percent, 40_000)).toBe(4_000)
  })

  it('최대 할인액을 넘으면 최대 할인액으로 (정확히 5,000원인 경우와 넘는 경우)', () => {
    expect(couponDiscount(percent, 50_000)).toBe(5_000)
    expect(couponDiscount(percent, 89_000)).toBe(5_000)
  })

  it('최대 할인액이 없는 쿠폰은 상한 없이 계산', () => {
    expect(couponDiscount(percentNoCap, 89_000)).toBe(8_900)
  })

  it('원 단위 미만은 버린다 (1,234.5원 → 1,234원)', () => {
    expect(couponDiscount(percentNoCap, 12_345)).toBe(1_234)
  })
})

describe('정액 쿠폰', () => {
  it('할인액이 상품 금액보다 크면 상품 금액까지만', () => {
    expect(couponDiscount(freebie, 2_000)).toBe(2_000)
  })

  it('상품 금액 0원은 오류가 아니라 0원 할인', () => {
    expect(couponDiscount(freebie, 0)).toBe(0)
  })
})

describe('잘못된 입력', () => {
  it('음수·소수는 RangeError', () => {
    expect(() => couponDiscount(fixed, -1)).toThrow(RangeError)
    expect(() => couponDiscount(fixed, 100.5)).toThrow(RangeError)
  })
})
