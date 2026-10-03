// 배송비 규칙 (QA 숍 SPEC §5 를 단순화한 것)
export const FREE_SHIPPING_MIN = 50_000
export const BASE_FEE = 3_000
export const REMOTE_SURCHARGE = 3_000

/**
 * @param {number} amountAfterDiscount 할인 후 금액(원, 0 이상의 정수)
 * @param {{ remote?: boolean }} [options] remote: 도서산간 여부
 */
export function shippingFee(amountAfterDiscount, { remote = false } = {}) {
  if (!Number.isInteger(amountAfterDiscount) || amountAfterDiscount < 0) {
    throw new RangeError('금액은 0 이상의 정수여야 합니다.')
  }
  const base = amountAfterDiscount >= FREE_SHIPPING_MIN ? 0 : BASE_FEE
  return base + (remote ? REMOTE_SURCHARGE : 0)
}
