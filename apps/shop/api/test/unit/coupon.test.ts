import { describe, expect, it } from 'vitest'
import { applyCoupon, type Coupon } from '../../src/domain/coupon.js'
import { withDefects } from '../helpers.js'

const base: Coupon = {
  code: 'T', type: 'FIXED', amount: 3_000, rate: null, maxDiscount: null,
  minOrderAmount: 20_000, validFrom: '2026-10-01', validUntil: '2026-10-31',
}
const percent: Coupon = { ...base, type: 'PERCENT', amount: null, rate: 10, maxDiscount: 5_000, minOrderAmount: 0 }
const at = new Date('2026-10-15T12:00:00+09:00')
const unused = (coupon: Coupon) => ({ coupon, usedAt: null })

describe('applyCoupon (SPEC §4)', () => {
  it('최소 주문 금액은 할인 전 상품 금액 기준이며 "이상"이다', () => {
    expect(applyCoupon(unused(base), { subtotal: 20_000, gradeDiscount: 200 }, at)).toEqual({ ok: true, discount: 3_000 })
    expect(applyCoupon(unused(base), { subtotal: 19_999, gradeDiscount: 0 }, at)).toEqual({ ok: false, reason: 'MIN_ORDER_NOT_MET' })
  })

  it('정률 쿠폰은 최대 할인액을 넘지 않고, 원 미만은 버린다', () => {
    expect(applyCoupon(unused(percent), { subtotal: 89_000, gradeDiscount: 0 }, at)).toEqual({ ok: true, discount: 5_000 })
    expect(applyCoupon(unused(percent), { subtotal: 12_345, gradeDiscount: 0 }, at)).toEqual({ ok: true, discount: 1_234 })
  })

  it('유효 기간 양 끝을 포함한다 (KST)', () => {
    expect(applyCoupon(unused(base), { subtotal: 30_000, gradeDiscount: 0 }, new Date('2026-10-01T00:00:00+09:00')).ok).toBe(true)
    expect(applyCoupon(unused(base), { subtotal: 30_000, gradeDiscount: 0 }, new Date('2026-10-31T23:59:59+09:00')).ok).toBe(true)
    expect(applyCoupon(unused(base), { subtotal: 30_000, gradeDiscount: 0 }, new Date('2026-09-30T23:59:59+09:00'))).toEqual({ ok: false, reason: 'NOT_STARTED' })
    expect(applyCoupon(unused(base), { subtotal: 30_000, gradeDiscount: 0 }, new Date('2026-11-01T00:00:00+09:00'))).toEqual({ ok: false, reason: 'EXPIRED' })
  })

  it('사용한 쿠폰은 다시 쓸 수 없다', () => {
    expect(applyCoupon({ coupon: base, usedAt: new Date() }, { subtotal: 30_000, gradeDiscount: 0 }, at)).toEqual({ ok: false, reason: 'ALREADY_USED' })
  })

  it('DF-003: 등급 할인 후 금액으로 최소 주문 금액을 판단한다', () => {
    const r = withDefects(['DF-003'], () => applyCoupon(unused(base), { subtotal: 20_000, gradeDiscount: 200 }, at))
    expect(r).toEqual({ ok: false, reason: 'MIN_ORDER_NOT_MET' })
  })

  it('DF-006: 최대 할인액이 무시된다', () => {
    const r = withDefects(['DF-006'], () => applyCoupon(unused(percent), { subtotal: 89_000, gradeDiscount: 0 }, at))
    expect(r).toEqual({ ok: true, discount: 8_900 })
  })

  it('DF-009: 정액 쿠폰만 재사용된다', () => {
    const used = (c: Coupon) => ({ coupon: c, usedAt: new Date() })
    expect(withDefects(['DF-009'], () => applyCoupon(used(base), { subtotal: 30_000, gradeDiscount: 0 }, at)).ok).toBe(true)
    expect(withDefects(['DF-009'], () => applyCoupon(used(percent), { subtotal: 30_000, gradeDiscount: 0 }, at)).ok).toBe(false)
  })
})
