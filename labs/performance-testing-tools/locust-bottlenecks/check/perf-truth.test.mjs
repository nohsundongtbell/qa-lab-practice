import { describe, expect, it } from 'vitest'
import { findRow } from '../../../../scripts/lib/locust-runner.mjs'
import { expectedAnswers } from './perf-truth.mjs'

const T = { products: { method: 'GET', path: '/api/products', maxP95: 100 }, quote: { method: 'POST', path: '/api/quote', maxP95: 100 }, orders: { method: 'GET', path: '/api/orders', maxP95: 200 } }
const row = (method, name, p95, requests = 50) => ({ method, name, key: `${method} ${name}`, p95, requests, failures: 0, median: p95 })
const fast = () => [row('GET', '/api/products', 20), row('POST', '/api/quote', 15), row('GET', '/api/orders', 30)]
const withSlow = (slowProducts, slowOrders) => [row('GET', '/api/products', slowProducts ? 600 : 20), row('POST', '/api/quote', 15), row('GET', '/api/orders', slowOrders ? 700 : 30)]

describe('expectedAnswers', () => {
  it('결함마다 느려지는 엔드포인트가 다르면 둘 다 slow, 두 결함 모두 병목', () => {
    const r = expectedAnswers({ baseline: fast(), solo: { 'DF-018': withSlow(true, false), 'DF-019': withSlow(false, true) } }, T, findRow)
    expect(r.answers).toEqual({ products: 'slow', quote: 'ok', orders: 'slow', bottleneck_defects: ['DF-018', 'DF-019'] })
  })

  it('목표를 깨뜨리지 않는 결함은 병목이 아니다', () => {
    const r = expectedAnswers({ baseline: fast(), solo: { 'DF-018': withSlow(true, false), 'DF-019': fast() } }, T, findRow)
    expect(r.answers).toEqual({ products: 'slow', quote: 'ok', orders: 'ok', bottleneck_defects: ['DF-018'] })
  })

  it('경계: 목표와 같은 값은 통과(ok), 1ms 넘으면 slow', () => {
    const atLimit = [row('GET', '/api/products', 100), row('POST', '/api/quote', 100), row('GET', '/api/orders', 200)]
    expect(expectedAnswers({ baseline: atLimit, solo: { 'DF-018': atLimit } }, T, findRow).answers.products).toBe('ok')
    const over = [row('GET', '/api/products', 101), row('POST', '/api/quote', 15), row('GET', '/api/orders', 30)]
    expect(expectedAnswers({ baseline: fast(), solo: { 'DF-018': over } }, T, findRow).answers.products).toBe('slow')
  })

  it('결함이 없는데도 목표를 못 지키면 채점하지 않는다 (측정 환경 문제)', () => {
    expect(expectedAnswers({ baseline: withSlow(true, false), solo: {} }, T, findRow).error).toMatch(/products 의 측정값이 목표\(100ms\)/)
  })

  it('요청이 모자란 엔드포인트도 채점하지 않는다', () => {
    const few = [row('GET', '/api/products', 20, 1), row('POST', '/api/quote', 15), row('GET', '/api/orders', 30)]
    expect(expectedAnswers({ baseline: few, solo: {} }, T, findRow).error).toMatch(/요청이 모자라/)
  })
})
