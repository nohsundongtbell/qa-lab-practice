import fs from 'node:fs'
import path from 'node:path'
import { applyMutation } from '../../../../scripts/lib/vitest-runner.mjs'

/**
 * 뮤턴트 정의: 정상 구현의 소스 한 곳을 일부러 고장 낸 것.
 * - 학습자에게 보여 주는 이름은 file·where 까지다. from/to(무엇을 바꿨는지)는 보여 주지 않는다 — 그게 답이다.
 */
export const MUTANTS = [
  // t1 — 순수 함수 단위 테스트
  { id: 'S1', task: 't1', file: 'shipping.mjs', where: 'shippingFee', from: 'amountAfterDiscount >= FREE_SHIPPING_MIN', to: 'amountAfterDiscount > FREE_SHIPPING_MIN' },
  { id: 'S2', task: 't1', file: 'shipping.mjs', where: 'shippingFee', from: 'base + (remote ? REMOTE_SURCHARGE : 0)', to: 'base + (remote && base > 0 ? REMOTE_SURCHARGE : 0)' },
  { id: 'S3', task: 't1', file: 'shipping.mjs', where: 'shippingFee', from: ' || amountAfterDiscount < 0', to: '' },
  { id: 'S4', task: 't1', file: 'shipping.mjs', where: 'shippingFee', from: '!Number.isInteger(amountAfterDiscount) || ', to: '' },
  { id: 'S5', task: 't1', file: 'grade.mjs', where: 'gradeFor', from: 'totalSpent >= 500_000', to: 'totalSpent > 500_000' },
  { id: 'S6', task: 't1', file: 'grade.mjs', where: 'gradeDiscount', from: 'Math.floor(', to: 'Math.round(' },
  { id: 'S7', task: 't1', file: 'grade.mjs', where: 'DISCOUNT_RATE', from: 'VIP: 5', to: 'VIP: 4' },
  // t2 — 테스트 더블을 쓴 통합 테스트
  { id: 'C1', task: 't2', file: 'checkout.mjs', where: 'checkout', from: 'amount: price.total })', to: 'amount: price.subtotal })' },
  { id: 'C2', task: 't2', file: 'checkout.mjs', where: 'checkout', from: "if (!result.approved) return { status: 'DECLINED', orderId, reason: result.reason }", to: "if (!result.approved) {\n    await mailer.send({ to: order.member.email, subject: '결제 실패', total: price.total })\n    return { status: 'DECLINED', orderId, reason: result.reason }\n  }" },
  { id: 'C3', task: 't2', file: 'checkout.mjs', where: 'checkout', from: 'txId: result.txId', to: 'txId: orderId' },
  { id: 'C4', task: 't2', file: 'checkout.mjs', where: 'checkout', from: 'to: order.member.email, subject: `주문', to: 'to: order.member.name, subject: `주문' },
  { id: 'C5', task: 't2', file: 'checkout.mjs', where: 'checkout', from: 'gateway.charge({ orderId, amount: price.total })', to: 'gateway.charge({ amount: price.total })' },
  { id: 'C6', task: 't2', file: 'checkout.mjs', where: 'checkout', from: 'order.items.length === 0', to: 'order.items.length < 0' },
  { id: 'C7', task: 't2', file: 'checkout.mjs', where: 'checkout', from: "return { status: 'PAID', orderId, total: price.total }", to: "return { status: 'PAID', orderId, total: price.subtotal }" },
  // t3 — 시간·난수에 의존하는 코드
  { id: 'V1', task: 't3', file: 'voucher.mjs', where: 'issueVoucher', from: 'VALID_DAYS = 30', to: 'VALID_DAYS = 31' },
  { id: 'V2', task: 't3', file: 'voucher.mjs', where: 'issueVoucher', from: ".padStart(6, '0')", to: '' },
  { id: 'V3', task: 't3', file: 'voucher.mjs', where: 'issueVoucher', from: '`V${memberId}-${serial}`', to: '`V${memberId}${serial}`' },
  { id: 'V4', task: 't3', file: 'voucher.mjs', where: 'isExpired', from: 'Date.now() > Date.parse', to: 'Date.now() >= Date.parse' },
  { id: 'V5', task: 't3', file: 'voucher.mjs', where: 'isBusinessHours', from: 'hour >= 9', to: 'hour > 9' },
  { id: 'V6', task: 't3', file: 'voucher.mjs', where: 'isBusinessHours', from: 'hour < 18', to: 'hour <= 18' },
]

export const mutantsFor = (task) => MUTANTS.filter((m) => m.task === task)

/** 정상 구현 소스에 뮤턴트를 적용한 { 파일 이름, 내용 }. */
export function mutatedSource(refDir, mutant) {
  const source = fs.readFileSync(path.join(refDir, 'src', mutant.file), 'utf8')
  return { file: mutant.file, content: applyMutation(source, mutant) }
}
