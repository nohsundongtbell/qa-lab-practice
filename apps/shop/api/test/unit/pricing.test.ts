import { describe, expect, it } from 'vitest'
import { priceOrder, subtotalOf } from '../../src/domain/pricing.js'

describe('priceOrder (SPEC §3)', () => {
  it('할인 후 금액으로 무료 배송을 판단한다', () => {
    expect(priceOrder({ subtotal: 50_000, grade: 'SILVER', couponDiscount: 0, zipcode: '06236' })).toEqual({
      subtotal: 50_000, gradeDiscount: 500, couponDiscount: 0, totalDiscount: 500, shippingFee: 3_000, total: 52_500,
    })
  })

  it('총 할인은 상품 금액을 넘지 않는다', () => {
    const r = priceOrder({ subtotal: 1_000, grade: 'NORMAL', couponDiscount: 3_000, zipcode: '06236' })
    expect(r.totalDiscount).toBe(1_000)
    expect(r.total).toBe(3_000)
  })

  it('subtotalOf', () => {
    expect(subtotalOf([{ unitPrice: 1_000, qty: 3 }, { unitPrice: 4_990, qty: 2 }])).toBe(12_980)
  })
})
