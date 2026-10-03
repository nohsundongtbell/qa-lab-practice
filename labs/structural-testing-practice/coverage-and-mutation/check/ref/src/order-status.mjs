// 환불 정책 (QA 숍 SPEC §7 을 단순화한 것): 배송 완료 후 7일 이내만 환불, 4일째부터는 수수료 2,500원 (VIP 는 면제)
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * @param {{ status: string, deliveredAt: number, total: number, grade: string }} order deliveredAt 은 밀리초 시각
 * @param {number} now 현재 시각(밀리초)
 */
export function refundPolicy({ status, deliveredAt, total, grade }, now) {
  if (status !== 'DELIVERED') return { allowed: false, reason: 'NOT_DELIVERED' }

  const elapsedDays = (now - deliveredAt) / DAY_MS
  if (elapsedDays > 7) return { allowed: false, reason: 'EXPIRED' }

  const fee = grade === 'VIP' ? 0 : elapsedDays > 3 ? 2_500 : 0
  return { allowed: true, fee, refund: total - fee }
}
