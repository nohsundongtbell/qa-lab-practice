import { expect, it } from 'vitest'
import { couponDiscount } from '../src/coupon.mjs'

// 커버리지만 채우는 테스트: 모든 줄·분기를 지나가지만 경계·특수 입력은 확인하지 않는다.
const fixed = { type: 'FIXED', amount: 3_000, minOrderAmount: 20_000 }
const percent = { type: 'PERCENT', rate: 10, maxDiscount: 5_000, minOrderAmount: 30_000 }
it('각 경로를 지나간다', () => {
  expect(couponDiscount(fixed, 10_000)).toBe(0)
  expect(couponDiscount(fixed, 50_000)).toBe(3_000)
  expect(couponDiscount(percent, 89_000)).toBe(5_000)
  expect(couponDiscount(percent, 40_000)).toBe(4_000)
  expect(() => couponDiscount(fixed, -1)).toThrow(RangeError)
})
