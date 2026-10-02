import { isDefectOn } from '../defects/registry.js'

export type Grade = 'NORMAL' | 'SILVER' | 'GOLD' | 'VIP'

export const GRADE_DISCOUNT_RATE: Record<Grade, number> = {
  NORMAL: 0,
  SILVER: 1,
  GOLD: 3,
  VIP: 5,
}

/** SPEC §1.3 — 누적 구매액으로 등급을 정한다. */
export function evaluateGrade(totalSpent: number): Grade {
  if (!Number.isInteger(totalSpent) || totalSpent < 0) {
    throw new RangeError('누적 구매액은 0 이상의 정수여야 합니다.')
  }
  const vip = isDefectOn('DF-002') ? totalSpent > 1_000_000 : totalSpent >= 1_000_000
  if (vip) return 'VIP'
  if (totalSpent >= 500_000) return 'GOLD'
  if (totalSpent >= 100_000) return 'SILVER'
  return 'NORMAL'
}

/** SPEC §3.2 — 등급 할인은 원 단위 미만을 버린다. */
export function gradeDiscount(subtotal: number, grade: Grade): number {
  const raw = (subtotal * GRADE_DISCOUNT_RATE[grade]) / 100
  return isDefectOn('DF-011') ? Math.round(raw) : Math.floor(raw)
}
