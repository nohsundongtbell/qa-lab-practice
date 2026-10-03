import { gradeDiscount, gradeFor } from './grade.mjs'
import { shippingFee } from './shipping.mjs'

/** 주문 금액 계산: 등급 할인 → 쿠폰 할인 → 배송비 (할인 후 금액으로 판단). */
export function priceOf({ items, member, couponDiscount = 0 }) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
  const grade = gradeFor(member.totalSpent)
  const discount = Math.min(subtotal, gradeDiscount(subtotal, grade) + couponDiscount)
  const fee = shippingFee(subtotal - discount, { remote: member.remote === true })
  return { subtotal, discount, shippingFee: fee, total: subtotal - discount + fee }
}

/**
 * 결제 후 주문을 저장하고 메일을 보낸다.
 * @param {{ items: Array<{unitPrice:number, qty:number}>, member: object, couponDiscount?: number }} order
 * @param {{ gateway: { charge(req:{orderId:string, amount:number}): Promise<{approved:boolean, txId?:string, reason?:string}> },
 *           mailer: { send(msg:object): Promise<void> },
 *           orders: { save(order:object): Promise<void> },
 *           newOrderId: () => string }} deps 외부 의존성은 모두 주입받는다
 */
export async function checkout(order, { gateway, mailer, orders, newOrderId }) {
  if (!order.items || order.items.length === 0) throw new Error('장바구니가 비어 있습니다.')
  const price = priceOf(order)
  const orderId = newOrderId()

  const result = await gateway.charge({ orderId, amount: price.total })
  if (!result.approved) return { status: 'DECLINED', orderId, reason: result.reason }

  await orders.save({ orderId, memberId: order.member.id, total: price.total, txId: result.txId })
  await mailer.send({ to: order.member.email, subject: `주문 ${orderId} 결제 완료`, total: price.total })
  return { status: 'PAID', orderId, total: price.total }
}
