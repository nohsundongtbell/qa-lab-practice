// t2 모범 답안 — 오퍼레이션마다 "정상 응답"과 "오류 응답"을 명세와 대조한다.
// 직접 실행하려면 work/tests/ 로 복사하세요 (support/ 는 work/ 에 이미 있습니다).
import { beforeAll, describe, expect, it } from 'vitest'
import { call, expectMatchesSpec, login } from '../support/contract.mjs'

let kim
let lee

beforeAll(async () => {
  kim = await login('kim@example.com')
  lee = await login('lee@example.com')
})

/** 호출하고, 기대한 상태 코드인지 확인한 뒤 명세와 대조한다. */
async function contract(method, path, status, opts) {
  const res = await call(method, path, opts)
  expect(res.status).toBe(status)
  expectMatchesSpec(method, path, res)
  return res
}

describe('상품', () => {
  it('목록', () => contract('GET', '/api/products', 200))
  it('상세', () => contract('GET', '/api/products/1', 200))
  it('상세 — 없는 상품은 404 와 오류 형식', () => contract('GET', '/api/products/9999', 404))
})

describe('회원', () => {
  it('내 정보', () => contract('GET', '/api/members/me', 200, { token: kim }))
  it('내 정보 — 토큰 없으면 401', () => contract('GET', '/api/members/me', 401))
  it('내 쿠폰', () => contract('GET', '/api/members/me/coupons', 200, { token: kim }))
  it('등급 판정', () => contract('GET', '/api/grades/evaluate?totalSpent=100000', 200))
  it('등급 판정 — 음수는 400', () => contract('GET', '/api/grades/evaluate?totalSpent=-1', 400))
})

describe('금액 미리보기', () => {
  const items = [{ productId: 1, qty: 1 }]
  it('정상', () => contract('POST', '/api/quote', 200, { token: kim, json: { items } }))
  it('잘못된 우편번호는 400 (500 이 아니다)', () => contract('POST', '/api/quote', 400, { token: kim, json: { items, zipcode: '123' } }))
  it('없는 상품은 404', () => contract('POST', '/api/quote', 404, { token: kim, json: { items: [{ productId: 9999, qty: 1 }] } }))
})

describe('주문', () => {
  it('주문 생성 → 상세·목록이 같은 계약을 따른다', async () => {
    await contract('PUT', '/api/cart/items/1', 200, { token: lee, json: { qty: 1 } })
    const created = await contract('POST', '/api/orders', 201, { token: lee, json: {} })
    const id = created.body.id
    const detail = await contract('GET', `/api/orders/${id}`, 200, { token: lee })
    expect(detail.body.status).toBe('PENDING')
    await contract('GET', '/api/orders', 200, { token: lee })
  })
  it('없는 주문은 404 와 오류 형식', () => contract('GET', '/api/orders/99999', 404, { token: kim }))
  it('토큰 없이 주문 목록은 401', () => contract('GET', '/api/orders', 401))
})
