import fs from 'node:fs'
import path from 'node:path'
import { applyMutation } from '../../../../scripts/lib/vitest-runner.mjs'

/**
 * 미리 정의한 뮤턴트 (Stryker 같은 도구가 자동으로 만들어 주는 것과 같은 종류).
 * 학습자에게는 id·파일·함수까지만 보여 준다. from/to(무엇을 바꿨는지)는 답이다.
 * kind: 'easy' = 커버리지를 채우는 테스트로도 대개 처치됨, 'subtle' = 경계·특수 입력을 따로 시험해야 처치됨
 */
export const MUTANTS = [
  { id: 'K1', kind: 'subtle', file: 'coupon.mjs', where: 'couponDiscount', from: 'subtotal < coupon.minOrderAmount', to: 'subtotal <= coupon.minOrderAmount' },
  { id: 'K2', kind: 'subtle', file: 'coupon.mjs', where: 'couponDiscount', from: 'Math.floor(', to: 'Math.round(' },
  { id: 'K3', kind: 'subtle', file: 'coupon.mjs', where: 'couponDiscount', from: 'return Math.min(discount, subtotal)', to: 'return discount' },
  { id: 'K4', kind: 'easy', file: 'coupon.mjs', where: 'couponDiscount', from: 'discount = coupon.maxDiscount\n', to: 'discount = coupon.maxDiscount + 1\n' },
  { id: 'K5', kind: 'easy', file: 'coupon.mjs', where: 'couponDiscount', from: "coupon.type === 'FIXED'", to: "coupon.type !== 'FIXED'" },
  { id: 'K6', kind: 'subtle', file: 'coupon.mjs', where: 'couponDiscount', from: '|| subtotal < 0', to: '|| subtotal <= 0' },
  { id: 'R1', kind: 'subtle', file: 'order-status.mjs', where: 'refundPolicy', from: 'elapsedDays > 7', to: 'elapsedDays >= 7' },
  { id: 'R2', kind: 'easy', file: 'order-status.mjs', where: 'refundPolicy', from: '? 2_500 : 0', to: '? 2_000 : 0' },
  { id: 'R3', kind: 'subtle', file: 'order-status.mjs', where: 'refundPolicy', from: "grade === 'VIP'", to: "grade === 'GOLD'" },
  { id: 'R4', kind: 'easy', file: 'order-status.mjs', where: 'refundPolicy', from: 'refund: total - fee', to: 'refund: total + fee' },
  { id: 'R5', kind: 'subtle', file: 'order-status.mjs', where: 'refundPolicy', from: "status !== 'DELIVERED'", to: "status === 'CANCELLED'" },
]

export function mutatedSource(refDir, mutant) {
  const source = fs.readFileSync(path.join(refDir, 'src', mutant.file), 'utf8')
  return { file: mutant.file, content: applyMutation(source, mutant) }
}
