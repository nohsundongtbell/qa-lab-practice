import { isDefectOn } from '../defects/registry.js'

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
export type OrderAction = 'pay' | 'cancel' | 'ship' | 'deliver' | 'refund'

/** SPEC §7.1 — 상태 전이 표. */
const TRANSITIONS: Record<OrderAction, { from: OrderStatus[]; to: OrderStatus }> = {
  pay: { from: ['PENDING'], to: 'PAID' },
  cancel: { from: ['PENDING', 'PAID'], to: 'CANCELLED' },
  ship: { from: ['PAID'], to: 'SHIPPED' },
  deliver: { from: ['SHIPPED'], to: 'DELIVERED' },
  refund: { from: ['DELIVERED'], to: 'REFUNDED' },
}

export const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/** 허용되면 다음 상태를, 아니면 null 을 돌려준다. */
export function nextStatus(current: OrderStatus, action: OrderAction): OrderStatus | null {
  const rule = TRANSITIONS[action]
  const allowed = action === 'cancel' && isDefectOn('DF-007') ? [...rule.from, 'SHIPPED'] : rule.from
  return allowed.includes(current) ? rule.to : null
}

export function withinRefundWindow(deliveredAt: Date, at: Date): boolean {
  return at.getTime() - deliveredAt.getTime() <= REFUND_WINDOW_MS
}
