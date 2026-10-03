import { expect, it } from 'vitest'
import { refundPolicy } from '../src/order-status.mjs'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-10-10T00:00:00Z')
const base = { status: 'DELIVERED', total: 43_000, grade: 'NORMAL' }
it('각 경로를 지나간다', () => {
  expect(refundPolicy({ ...base, status: 'CANCELLED', deliveredAt: now }, now).allowed).toBe(false)
  expect(refundPolicy({ ...base, deliveredAt: now - 10 * DAY }, now).reason).toBe('EXPIRED')
  expect(refundPolicy({ ...base, deliveredAt: now - 5 * DAY }, now).fee).toBe(2_500)
  expect(refundPolicy({ ...base, grade: 'VIP', deliveredAt: now - 5 * DAY }, now).fee).toBe(0)
  expect(refundPolicy({ ...base, deliveredAt: now - 1 * DAY }, now).fee).toBe(0)
})
