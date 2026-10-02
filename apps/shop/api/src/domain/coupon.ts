import { isDefectOn } from '../defects/registry.js'
import { formatDate, toKst } from './calendar.js'

export type CouponType = 'FIXED' | 'PERCENT'

export interface Coupon {
  code: string
  type: CouponType
  amount: number | null
  rate: number | null
  maxDiscount: number | null
  minOrderAmount: number
  validFrom: string // YYYY-MM-DD (KST)
  validUntil: string // YYYY-MM-DD (KST)
}

export interface OwnedCoupon {
  coupon: Coupon
  usedAt: Date | null
}

export type CouponRejectReason =
  | 'NOT_FOUND'
  | 'NOT_OWNED'
  | 'ALREADY_USED'
  | 'EXPIRED'
  | 'NOT_STARTED'
  | 'MIN_ORDER_NOT_MET'

export type CouponResult = { ok: true; discount: number } | { ok: false; reason: CouponRejectReason }

/** SPEC §4 — 쿠폰 사용 가능 여부와 할인액. */
export function applyCoupon(
  owned: OwnedCoupon,
  amounts: { subtotal: number; gradeDiscount: number },
  at: Date,
): CouponResult {
  const { coupon } = owned
  const skipUsedCheck = isDefectOn('DF-009') && coupon.type === 'FIXED'
  if (owned.usedAt && !skipUsedCheck) return { ok: false, reason: 'ALREADY_USED' }

  const today = formatDate(toKst(at).date)
  if (today < coupon.validFrom) return { ok: false, reason: 'NOT_STARTED' }
  if (today > coupon.validUntil) return { ok: false, reason: 'EXPIRED' }

  const base = isDefectOn('DF-003') ? amounts.subtotal - amounts.gradeDiscount : amounts.subtotal
  if (base < coupon.minOrderAmount) return { ok: false, reason: 'MIN_ORDER_NOT_MET' }

  if (coupon.type === 'FIXED') return { ok: true, discount: coupon.amount ?? 0 }

  const raw = Math.floor((amounts.subtotal * (coupon.rate ?? 0)) / 100)
  const capped = coupon.maxDiscount != null && !isDefectOn('DF-006') ? Math.min(raw, coupon.maxDiscount) : raw
  return { ok: true, discount: capped }
}
