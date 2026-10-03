// 회원 등급과 등급 할인 (QA 숍 SPEC §1.3, §3 을 단순화한 것)
export const DISCOUNT_RATE = { NORMAL: 0, SILVER: 1, GOLD: 3, VIP: 5 }

/** 누적 구매액(원)으로 등급을 정한다. */
export function gradeFor(totalSpent) {
  if (!Number.isInteger(totalSpent) || totalSpent < 0) throw new RangeError('누적 구매액은 0 이상의 정수여야 합니다.')
  if (totalSpent >= 1_000_000) return 'VIP'
  if (totalSpent >= 500_000) return 'GOLD'
  if (totalSpent >= 100_000) return 'SILVER'
  return 'NORMAL'
}

/** 등급 할인액. 원 단위 미만은 버린다. */
export function gradeDiscount(subtotal, grade) {
  return Math.floor((subtotal * DISCOUNT_RATE[grade]) / 100)
}
