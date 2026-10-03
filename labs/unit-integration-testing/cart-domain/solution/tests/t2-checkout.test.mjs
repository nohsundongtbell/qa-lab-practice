import { describe, expect, it, vi } from 'vitest'
import { checkout } from '../src/checkout.mjs'

const member = { id: 7, email: 'kim@example.com', name: '김일반', totalSpent: 0 }
const items = [{ unitPrice: 20_000, qty: 2 }] // 40,000원 + 배송비 3,000원 = 43,000원

function makeDeps(overrides = {}) {
  return {
    gateway: { charge: vi.fn().mockResolvedValue({ approved: true, txId: 'TX-1' }) },
    mailer: { send: vi.fn().mockResolvedValue(undefined) },
    orders: { save: vi.fn().mockResolvedValue(undefined) },
    newOrderId: () => 'ORD-1',
    ...overrides,
  }
}

describe('checkout (결제) — 승인', () => {
  it('PAID 와 결제 금액을 돌려준다', async () => {
    const result = await checkout({ items, member }, makeDeps())
    expect(result).toEqual({ status: 'PAID', orderId: 'ORD-1', total: 43_000 })
  })

  it('게이트웨이에 주문 번호와 결제 금액(배송비 포함)으로 요청한다', async () => {
    const deps = makeDeps()
    await checkout({ items, member }, deps)
    expect(deps.gateway.charge).toHaveBeenCalledTimes(1)
    expect(deps.gateway.charge).toHaveBeenCalledWith({ orderId: 'ORD-1', amount: 43_000 })
  })

  it('승인 결과(txId)와 함께 주문을 저장한다', async () => {
    const deps = makeDeps()
    await checkout({ items, member }, deps)
    expect(deps.orders.save).toHaveBeenCalledWith({ orderId: 'ORD-1', memberId: 7, total: 43_000, txId: 'TX-1' })
  })

  it('회원 이메일로 결제 완료 메일을 한 번 보낸다', async () => {
    const deps = makeDeps()
    await checkout({ items, member }, deps)
    expect(deps.mailer.send).toHaveBeenCalledTimes(1)
    expect(deps.mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'kim@example.com', total: 43_000 }))
  })
})

describe('checkout (결제) — 거절', () => {
  const declined = () => makeDeps({ gateway: { charge: vi.fn().mockResolvedValue({ approved: false, reason: 'LIMIT_EXCEEDED' }) } })

  it('DECLINED 와 사유를 돌려준다', async () => {
    const result = await checkout({ items, member }, declined())
    expect(result).toMatchObject({ status: 'DECLINED', reason: 'LIMIT_EXCEEDED' })
  })

  it('주문을 저장하지 않고 메일도 보내지 않는다', async () => {
    const deps = declined()
    await checkout({ items, member }, deps)
    expect(deps.orders.save).not.toHaveBeenCalled()
    expect(deps.mailer.send).not.toHaveBeenCalled()
  })
})

describe('checkout (결제) — 입력', () => {
  it('장바구니가 비어 있으면 예외이고 결제를 시도하지 않는다', async () => {
    const deps = makeDeps()
    await expect(checkout({ items: [], member }, deps)).rejects.toThrow('장바구니가 비어 있습니다.')
    expect(deps.gateway.charge).not.toHaveBeenCalled()
  })
})
