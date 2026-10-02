import { isDefectOn } from '../defects/registry.js'

export const BASE_SHIPPING_FEE = 3_000
export const REMOTE_SURCHARGE = 3_000
export const FREE_SHIPPING_THRESHOLD = 50_000

const REMOTE_RANGES: Array<[number, number]> = [
  [63000, 63644], // 제주
  [40200, 40240], // 울릉
]

export function isRemoteArea(zipcode: string): boolean {
  const n = Number(zipcode)
  return REMOTE_RANGES.some(([lo, hi]) => n >= lo && n <= hi)
}

/** SPEC §5 — afterDiscount 는 상품 금액에서 총 할인을 뺀 금액. */
export function shippingFee(afterDiscount: number, zipcode: string): number {
  const free = isDefectOn('DF-001')
    ? afterDiscount > FREE_SHIPPING_THRESHOLD
    : afterDiscount >= FREE_SHIPPING_THRESHOLD
  const base = free ? 0 : BASE_SHIPPING_FEE
  return base + (isRemoteArea(zipcode) ? REMOTE_SURCHARGE : 0)
}
