import { describe, expect, it } from 'vitest'
import { nextStatus, type OrderAction, type OrderStatus, withinRefundWindow } from '../../src/domain/order-state.js'
import { withDefects } from '../helpers.js'

const ALL: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
const ALLOWED: Record<OrderAction, Partial<Record<OrderStatus, OrderStatus>>> = {
  pay: { PENDING: 'PAID' },
  cancel: { PENDING: 'CANCELLED', PAID: 'CANCELLED' },
  ship: { PAID: 'SHIPPED' },
  deliver: { SHIPPED: 'DELIVERED' },
  refund: { DELIVERED: 'REFUNDED' },
}

describe('nextStatus (SPEC §7.1) — 상태 × 동작 전수', () => {
  for (const action of Object.keys(ALLOWED) as OrderAction[]) {
    for (const from of ALL) {
      const expected = ALLOWED[action][from] ?? null
      it(`${from} --${action}--> ${expected ?? '거부'}`, () => {
        expect(nextStatus(from, action)).toBe(expected)
      })
    }
  }

  it('DF-007: SHIPPED 에서 취소가 허용된다', () => {
    expect(withDefects(['DF-007'], () => nextStatus('SHIPPED', 'cancel'))).toBe('CANCELLED')
  })
})

describe('withinRefundWindow', () => {
  const delivered = new Date('2026-10-01T10:00:00Z')
  it('정확히 168시간까지 허용', () => {
    expect(withinRefundWindow(delivered, new Date('2026-10-08T10:00:00Z'))).toBe(true)
    expect(withinRefundWindow(delivered, new Date('2026-10-08T10:00:00.001Z'))).toBe(false)
  })
})
