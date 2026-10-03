import { describe, expect, it } from 'vitest'
import { refundPolicy } from '../src/order-status.mjs'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-10-10T00:00:00Z')

describe('refundPolicy', () => {
  it('배송 완료 직후에는 수수료 없이 전액 환불', () => {
    const order = { status: 'DELIVERED', deliveredAt: now - 1 * DAY, total: 43_000, grade: 'NORMAL' }
    expect(refundPolicy(order, now)).toEqual({ allowed: true, fee: 0, refund: 43_000 })
  })

  // TODO: 배송 완료가 아닌 주문, 기한이 지난 주문, 4일째부터의 수수료, VIP …
})
