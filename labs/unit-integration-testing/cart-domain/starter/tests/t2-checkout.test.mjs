import { describe, expect, it, vi } from 'vitest'
import { checkout } from '../src/checkout.mjs'

const member = { id: 7, email: 'kim@example.com', name: '김일반', totalSpent: 0 }
const items = [{ unitPrice: 20_000, qty: 2 }] // 상품 금액 40,000원 + 배송비 3,000원

/** 의존성(결제 게이트웨이, 메일, 주문 저장소, 주문 번호)을 테스트 더블로 만든다. 필요하면 일부를 바꿔 쓴다. */
function makeDeps(overrides = {}) {
  return {
    gateway: { charge: vi.fn().mockResolvedValue({ approved: true, txId: 'TX-1' }) }, // 스텁: 정해 둔 값을 돌려준다
    mailer: { send: vi.fn().mockResolvedValue(undefined) }, // 스파이/목: 호출을 기록한다
    orders: { save: vi.fn().mockResolvedValue(undefined) },
    newOrderId: () => 'ORD-1',
    ...overrides,
  }
}

describe('checkout (결제)', () => {
  it('결제가 승인되면 PAID 를 돌려준다', async () => {
    const deps = makeDeps()
    const result = await checkout({ items, member }, deps)
    expect(result.status).toBe('PAID')
  })

  // TODO: 게이트웨이에 정확한 금액·주문 번호로 요청했는가 (toHaveBeenCalledWith)
  // TODO: 승인되면 주문이 저장되고 메일이 한 번 나가는가 / 거절되면 저장도 메일도 없는가 (not.toHaveBeenCalled)
  // TODO: 장바구니가 비었을 때 (rejects.toThrow)
})
