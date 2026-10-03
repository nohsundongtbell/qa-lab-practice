import { describe, expect, it } from 'vitest'
import { refundPolicy } from '../src/order-status.mjs'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-10-10T00:00:00Z')
const order = (over = {}) => ({ status: 'DELIVERED', deliveredAt: now - 1 * DAY, total: 43_000, grade: 'NORMAL', ...over })
const daysAgo = (n) => ({ deliveredAt: now - n * DAY })

describe('배송 완료가 아닌 주문', () => {
  it.each(['PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED'])('%s 는 환불할 수 없다', (status) => {
    expect(refundPolicy(order({ status }), now)).toEqual({ allowed: false, reason: 'NOT_DELIVERED' })
  })
})

describe('환불 기한 (배송 완료 후 7일)', () => {
  it('정확히 7일은 환불 가능, 7일을 넘기면 EXPIRED', () => {
    expect(refundPolicy(order(daysAgo(7)), now).allowed).toBe(true)
    expect(refundPolicy(order({ deliveredAt: now - 7 * DAY - 1 }), now)).toEqual({ allowed: false, reason: 'EXPIRED' })
  })
})

describe('수수료 (4일째부터 2,500원, VIP 면제)', () => {
  it('3일까지는 수수료 없음, 3일을 넘으면 2,500원 (환불액은 총액 − 수수료)', () => {
    expect(refundPolicy(order(daysAgo(3)), now)).toEqual({ allowed: true, fee: 0, refund: 43_000 })
    expect(refundPolicy(order({ deliveredAt: now - 3 * DAY - 1 }), now)).toEqual({ allowed: true, fee: 2_500, refund: 40_500 })
  })

  it('VIP 는 4일째가 지나도 수수료 면제', () => {
    expect(refundPolicy(order({ grade: 'VIP', ...daysAgo(5) }), now)).toEqual({ allowed: true, fee: 0, refund: 43_000 })
  })

  it('VIP 가 아닌 다른 등급은 수수료를 낸다', () => {
    expect(refundPolicy(order({ grade: 'GOLD', ...daysAgo(5) }), now).fee).toBe(2_500)
  })
})
