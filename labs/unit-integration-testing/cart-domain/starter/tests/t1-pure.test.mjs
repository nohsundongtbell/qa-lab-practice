import { describe, expect, it } from 'vitest'
import { gradeDiscount, gradeFor } from '../src/grade.mjs'
import { shippingFee } from '../src/shipping.mjs'

// 단위 테스트의 기본 구조 AAA: Arrange(준비) → Act(실행) → Assert(검증)
describe('shippingFee (배송비)', () => {
  it('할인 후 금액이 49,999원이면 기본 배송비 3,000원이다', () => {
    // Arrange
    const amount = 49_999
    // Act
    const fee = shippingFee(amount)
    // Assert
    expect(fee).toBe(3_000)
  })

  // TODO: 경계(정확히 50,000원, 바로 위), 도서산간({ remote: true }), 잘못된 입력(음수, 소수)이면 예외 …
})

// TODO: gradeFor (등급 경계 3곳, 잘못된 입력), gradeDiscount (원 단위 미만 처리, 등급별 할인율)
void gradeDiscount
void gradeFor
