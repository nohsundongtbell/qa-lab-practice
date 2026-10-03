import { describe, expect, it } from 'vitest'
import { expectMatchesSpec, specErrors } from '../starter/support/contract.mjs'

// t2 의 학습자 도구(expectMatchesSpec)가 계약 위반을 놓치지 않는지 고정한다.
// 이 도구가 느슨해지면 결함 검출 기준(t2)이 의미를 잃는다.
const product = { id: 1, name: '무선 키보드', price: 50000, stock: 30 }
const member = { id: 1, email: 'kim@example.com', name: '김일반', zipcode: '06236', address: '서울', grade: 'NORMAL', totalSpent: 0 }
const error = { code: 'NOT_FOUND', message: '없음', details: {} }

describe('정상 응답은 통과한다', () => {
  it.each([
    ['GET', '/api/products/1', { status: 200, body: product }],
    ['GET', '/api/products', { status: 200, body: [product] }],
    ['GET', '/api/members/me', { status: 200, body: member }],
    ['GET', '/api/products/9999', { status: 404, body: error }],
    ['GET', '/api/members/me', { status: 401, body: { ...error, code: 'UNAUTHORIZED' } }],
  ])('%s %s', (method, path, res) => {
    expect(specErrors(method, path, res)).toEqual([])
  })
})

describe('계약 위반을 잡는다', () => {
  it('타입 불일치 — 가격이 문자열', () => {
    expect(specErrors('GET', '/api/products/1', { status: 200, body: { ...product, price: '50000' } }).join()).toMatch(/price/)
  })
  it('필수 필드 누락 — totalSpent', () => {
    const { totalSpent: _omit, ...rest } = member
    expect(specErrors('GET', '/api/members/me', { status: 200, body: rest }).join()).toMatch(/totalSpent/)
  })
  it('오류 응답 형식 — details 누락', () => {
    const { details: _omit, ...rest } = error
    expect(specErrors('GET', '/api/products/9999', { status: 404, body: rest }).join()).toMatch(/details/)
  })
  it('명세에 없는 상태 코드 — 500', () => {
    expect(specErrors('POST', '/api/quote', { status: 500, body: { ...error, code: 'INTERNAL_ERROR' } }).join()).toMatch(/명세에 없는 상태 코드/)
  })
  it('열거값 불일치 — 소문자 상태', () => {
    const order = { id: 1, status: 'pending', grade: 'NORMAL', items: [], subtotal: 1, gradeDiscount: 0, couponDiscount: 0, couponCode: null, shippingFee: 0, total: 1, zipcode: '06236', address: 'a', createdAt: '2026-10-05T00:00:00.000Z', paidAt: null, shipDate: null, estimatedDelivery: null }
    expect(specErrors('GET', '/api/orders/1', { status: 200, body: order }).join()).toMatch(/\/status must be equal to one of the allowed values/)
  })
  it('명세에 없는 오퍼레이션', () => {
    expect(specErrors('GET', '/api/nothing', { status: 200, body: {} }).join()).toMatch(/명세에 없는 오퍼레이션/)
  })
  it('expectMatchesSpec 은 위반이면 던진다', () => {
    expect(() => expectMatchesSpec('GET', '/api/products/1', { status: 200, body: { ...product, price: '1' } })).toThrow(/명세와 다릅니다/)
  })
})
