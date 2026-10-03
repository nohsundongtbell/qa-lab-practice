import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { coverageOf, listOperations, loadSpec, matchOperation } from './openapi-ops.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ops = listOperations(loadSpec(path.join(root, 'apps', 'shop', 'api', 'openapi.yaml')))

describe('오퍼레이션 목록', () => {
  it('명세의 모든 오퍼레이션을 메서드+템플릿으로 만든다', () => {
    expect(ops.length).toBe(21)
    expect(ops.map((o) => o.key)).toContain('POST /api/orders/{id}/pay')
    expect(ops.every((o) => o.statuses.length > 0)).toBe(true)
  })

  it('인증이 필요한 오퍼레이션(security)을 표시한다', () => {
    const secured = (key) => ops.find((o) => o.key === key).secured
    expect(secured('GET /api/members/me')).toBe(true)
    expect(secured('POST /api/orders/{id}/pay')).toBe(true)
    expect(secured('POST /api/auth/login')).toBe(false)
    expect(secured('GET /api/products')).toBe(false)
  })
})

describe('요청 → 오퍼레이션 매칭', () => {
  it.each([
    ['GET', '/api/products/3', 'GET /api/products/{id}'],
    ['GET', '/api/products', 'GET /api/products'],
    ['GET', '/api/orders/12', 'GET /api/orders/{id}'],
    ['POST', '/api/orders/12/pay', 'POST /api/orders/{id}/pay'],
    ['POST', '/api/admin/orders/12/ship', 'POST /api/admin/orders/{id}/ship'],
    ['PUT', '/api/cart/items/3', 'PUT /api/cart/items/{productId}'],
    ['DELETE', '/api/cart/items/3', 'DELETE /api/cart/items/{productId}'],
    ['get', '/api/members/me', 'GET /api/members/me'],
  ])('%s %s', (method, p, key) => {
    expect(matchOperation(ops, method, p)?.key).toBe(key)
  })

  it('메서드가 다르거나 명세에 없는 경로는 매칭되지 않는다', () => {
    expect(matchOperation(ops, 'DELETE', '/api/orders/12')).toBeUndefined()
    expect(matchOperation(ops, 'GET', '/api/orders/12/pay')).toBeUndefined()
    expect(matchOperation(ops, 'GET', '/api/nothing')).toBeUndefined()
    expect(matchOperation(ops, 'GET', '/api/orders/12/extra/segment')).toBeUndefined()
  })
})

describe('커버리지 계산', () => {
  const run = (list) => coverageOf(ops, list)

  it('호출한 오퍼레이션과 문서화된 상태 코드 쌍만 센다', () => {
    const c = run([
      { method: 'GET', path: '/api/products', status: 200 },
      { method: 'GET', path: '/api/products/1', status: 200 },
      { method: 'GET', path: '/api/products/9999', status: 404 },
    ])
    expect(c.operations.size).toBe(2)
    expect([...c.statuses].sort()).toEqual(['GET /api/products 200', 'GET /api/products/{id} 200', 'GET /api/products/{id} 404'])
  })

  it('같은 요청을 여러 번 보내도 한 번으로 센다', () => {
    const c = run(Array.from({ length: 5 }, () => ({ method: 'GET', path: '/api/products', status: 200 })))
    expect(c.operations.size).toBe(1)
    expect(c.statuses.size).toBe(1)
  })

  it('명세에 없는 상태 코드(500)나 경로는 세지 않는다 — 오퍼레이션은 호출했어도 상태 코드는 아니다', () => {
    const c = run([
      { method: 'POST', path: '/api/quote', status: 500 },
      { method: 'GET', path: '/api/nothing', status: 200 },
    ])
    expect(c.operations.size).toBe(1)
    expect(c.statuses.size).toBe(0)
  })

  it('호출하지 않은 오퍼레이션 목록과 전체 개수를 돌려준다', () => {
    const c = run([{ method: 'GET', path: '/health', status: 200 }])
    expect(c.uncoveredOperations).toHaveLength(20)
    expect(c.uncoveredOperations).not.toContain('GET /health')
    expect(c.totalOperations).toBe(21)
    expect(c.totalStatuses).toBe(65)
  })
})
