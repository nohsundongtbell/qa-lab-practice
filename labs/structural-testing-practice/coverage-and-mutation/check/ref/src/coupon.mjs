// 쿠폰 할인액 계산 (QA 숍 SPEC §4 를 단순화한 것)
/**
 * @param {{ type: 'FIXED'|'PERCENT', amount?: number, rate?: number, maxDiscount?: number, minOrderAmount: number }} coupon
 * @param {number} subtotal 상품 금액(원, 0 이상의 정수)
 */
export function couponDiscount(coupon, subtotal) {
  if (!Number.isInteger(subtotal) || subtotal < 0) {
    throw new RangeError('상품 금액은 0 이상의 정수여야 합니다.')
  }
  if (subtotal < coupon.minOrderAmount) return 0

  let discount
  if (coupon.type === 'FIXED') {
    discount = coupon.amount
  } else {
    discount = Math.floor((subtotal * coupon.rate) / 100)
    if (coupon.maxDiscount !== undefined && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount
    }
  }
  return Math.min(discount, subtotal)
}
