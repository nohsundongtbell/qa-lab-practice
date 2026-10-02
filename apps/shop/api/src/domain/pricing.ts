import { type Grade, gradeDiscount as calcGradeDiscount } from './grade.js'
import { shippingFee as calcShippingFee } from './shipping.js'

export interface PriceLine {
  unitPrice: number
  qty: number
}

export interface PriceBreakdown {
  subtotal: number
  gradeDiscount: number
  couponDiscount: number
  totalDiscount: number
  shippingFee: number
  total: number
}

export function subtotalOf(lines: PriceLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
}

/**
 * SPEC §3 — 금액 계산. 쿠폰 할인액은 호출자가 applyCoupon 으로 먼저 구해 넘긴다.
 */
export function priceOrder(input: {
  subtotal: number
  grade: Grade
  couponDiscount: number
  zipcode: string
}): PriceBreakdown {
  const { subtotal } = input
  const gradeDiscount = calcGradeDiscount(subtotal, input.grade)
  const totalDiscount = Math.min(subtotal, gradeDiscount + input.couponDiscount)
  const shippingFee = calcShippingFee(subtotal - totalDiscount, input.zipcode)
  return {
    subtotal,
    gradeDiscount,
    couponDiscount: input.couponDiscount,
    totalDiscount,
    shippingFee,
    total: subtotal - totalDiscount + shippingFee,
  }
}
