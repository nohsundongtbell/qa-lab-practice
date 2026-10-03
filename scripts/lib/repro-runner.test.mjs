import { describe, expect, it } from 'vitest'
import { formatFailure, getPath, interpolate, ReproError, runRepro, sameValue } from './repro-runner.mjs'

/** fetch 대역: handler(method, path, init) → { status, body }. 호출 기록을 calls 에 쌓는다. */
function fakeFetch(handler) {
  const calls = []
  const fetchImpl = async (url, init) => {
    const u = new URL(url)
    const call = { method: init.method, path: u.pathname + u.search, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined }
    calls.push(call)
    const r = handler(call)
    if (r instanceof Error) throw r
    return { status: r.status, text: async () => (r.body === undefined ? '' : typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) }
  }
  return { fetchImpl, calls }
}
const run = (steps, handler, opts = {}) => {
  const f = fakeFetch(handler)
  return runRepro({ steps }, { baseUrl: 'http://sut.test', fetch: f.fetchImpl, ...opts }).then((result) => ({ result, calls: f.calls }))
}

describe('getPath', () => {
  const obj = { a: { b: [{ c: 1 }, { c: 2 }] }, z: null }
  it('점 경로와 배열 인덱스를 따라간다', () => {
    expect(getPath(obj, 'a.b.1.c')).toBe(2)
    expect(getPath(obj, '')).toBe(obj)
  })
  it('없는 경로는 undefined (null 을 지나도 던지지 않는다)', () => {
    expect(getPath(obj, 'a.x.y')).toBeUndefined()
    expect(getPath(obj, 'z.k')).toBeUndefined()
    expect(getPath(undefined, 'a')).toBeUndefined()
  })
})

describe('interpolate', () => {
  it('문자열 전체가 변수 하나면 원래 타입을 유지한다', () => {
    expect(interpolate('{{id}}', { id: 7 })).toBe(7)
    expect(interpolate('/orders/{{id}}/pay', { id: 7 })).toBe('/orders/7/pay')
  })
  it('객체·배열 안쪽도 바꾼다', () => {
    expect(interpolate({ a: ['{{x}}', { b: 'v-{{x}}' }] }, { x: 1 })).toEqual({ a: [1, { b: 'v-1' }] })
  })
  it('정의되지 않은 변수는 ReproError', () => {
    expect(() => interpolate('{{nope}}', {})).toThrow(ReproError)
    expect(() => interpolate('a{{nope}}', {})).toThrow(ReproError)
  })
})

describe('sameValue', () => {
  it('객체 키 순서와 상관없이 깊은 비교', () => {
    expect(sameValue({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
    expect(sameValue({ a: 1 }, { a: '1' })).toBe(false)
    expect(sameValue(null, undefined)).toBe(false)
  })
})

describe('runRepro', () => {
  it('기대가 모두 맞으면 통과하고, 로그인 토큰을 이후 요청에 붙인다', async () => {
    const { result, calls } = await run(
      [{ login: 'kim@example.com' }, { http: { path: '/api/members/me' }, expect: { status: 200, json: { email: 'kim@example.com' } } }],
      (c) => (c.path === '/api/auth/login' ? { status: 200, body: { token: 'T1' } } : { status: 200, body: { email: 'kim@example.com' } }),
    )
    expect(result).toEqual({ passed: true, failures: [] })
    expect(calls[0].body).toEqual({ email: 'kim@example.com', password: 'qa-lab-1234' })
    expect(calls[1].headers.authorization).toBe('Bearer T1')
  })

  it('X-QA-Lab-Defects / X-QA-Lab-Now 헤더를 모든 요청에 보낸다 (지정했을 때만)', async () => {
    const steps = [{ http: { path: '/a' } }]
    const withHeaders = await run(steps, () => ({ status: 200 }), { defects: 'DF-001,DF-002', now: '2026-10-07T15:00:00+09:00' })
    expect(withHeaders.calls[0].headers).toMatchObject({ 'x-qa-lab-defects': 'DF-001,DF-002', 'x-qa-lab-now': '2026-10-07T15:00:00+09:00' })
    const without = await run(steps, () => ({ status: 200 }))
    expect(without.calls[0].headers).not.toHaveProperty('x-qa-lab-defects')
    const none = await run(steps, () => ({ status: 200 }), { defects: 'none' })
    expect(none.calls[0].headers['x-qa-lab-defects']).toBe('none')
  })

  it('기대가 어긋나면 단계 번호와 함께 실패를 보고하고 이후 단계는 실행하지 않는다', async () => {
    const { result, calls } = await run(
      [
        { http: { method: 'post', path: '/a' }, expect: { status: 201, json: { 'details.reason': 'X', total: 100 } } },
        { http: { path: '/never' } },
      ],
      () => ({ status: 200, body: { details: { reason: 'Y' }, total: 100 } }),
    )
    expect(result.passed).toBe(false)
    expect(result.failures.map((f) => f.step)).toEqual([1, 1])
    expect(result.failures[0].message).toMatch(/status 기대 201, 실제 200/)
    expect(result.failures[1].message).toMatch(/details\.reason 기대 "X", 실제 "Y"/)
    expect(calls.map((c) => c.path)).toEqual(['/a'])
  })

  it('save 로 저장한 값을 다음 단계 경로·본문에 쓴다', async () => {
    const { result, calls } = await run(
      [
        { http: { method: 'POST', path: '/orders' }, save: { orderId: 'id' } },
        { http: { method: 'POST', path: '/orders/{{orderId}}/pay', json: { orderId: '{{orderId}}' } }, expect: { status: 200 } },
      ],
      (c) => (c.path === '/orders' ? { status: 201, body: { id: 42 } } : { status: 200 }),
    )
    expect(result.passed).toBe(true)
    expect(calls[1].path).toBe('/orders/42/pay')
    expect(calls[1].body).toEqual({ orderId: 42 })
  })

  it('저장할 값이 응답에 없으면 실패', async () => {
    const { result } = await run([{ http: { path: '/a' }, save: { x: 'missing' } }], () => ({ status: 200, body: {} }))
    expect(result.passed).toBe(false)
    expect(result.failures[0].message).toMatch(/저장할 값 missing/)
  })

  it('로그인 실패는 실패로 보고', async () => {
    const { result } = await run([{ login: 'x@example.com' }, { http: { path: '/never' } }], () => ({ status: 401, body: { code: 'INVALID_CREDENTIALS' } }))
    expect(result.passed).toBe(false)
    expect(result.failures[0].message).toMatch(/로그인 실패: x@example.com \(status 401\)/)
  })

  it('logout 이후에는 토큰을 붙이지 않는다', async () => {
    const { calls } = await run(
      [{ login: 'a@example.com' }, { logout: true }, { http: { path: '/a' } }],
      (c) => (c.path === '/api/auth/login' ? { status: 200, body: { token: 'T' } } : { status: 200 }),
    )
    expect(calls[1].headers).not.toHaveProperty('authorization')
  })

  it('reset 옵션이면 먼저 /__admin/reset 을 호출하고, 실패하면 ReproError', async () => {
    const ok = await run([{ http: { path: '/a' } }], () => ({ status: 200 }), { reset: true })
    expect(ok.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /__admin/reset', 'GET /a'])
    await expect(run([{ http: { path: '/a' } }], () => ({ status: 404 }), { reset: true })).rejects.toThrow(/ALLOW_DEV_TOOLS/)
  })

  it('절차가 잘못되었거나 연결할 수 없으면 실패가 아니라 ReproError 를 던진다', async () => {
    await expect(run([], () => ({ status: 200 }))).rejects.toThrow(/비어 있습니다/)
    await expect(run([{ nonsense: true }], () => ({ status: 200 }))).rejects.toThrow(/종류를 알 수 없습니다/)
    await expect(run([{ http: {} }], () => ({ status: 200 }))).rejects.toThrow(/http\.path/)
    await expect(run([{ http: { path: '/a' } }], () => new Error('ECONNREFUSED'))).rejects.toThrow(/SUT에 연결할 수 없습니다/)
  })

  it('JSON 이 아닌 응답 본문도 다룬다', async () => {
    const { result } = await run([{ http: { path: '/a' }, expect: { status: 200, json: { '': 'plain text' } } }], () => ({ status: 200, body: 'plain text' }))
    expect(result.passed).toBe(true)
  })
})

describe('업무 동작 (action DSL)', () => {
  const api = (c) => {
    if (c.path === '/api/auth/login') return { status: 200, body: { token: c.body.email === 'admin@example.com' ? 'ADMIN' : 'USER' } }
    if (c.path === '/api/orders' && c.method === 'POST') return { status: 201, body: { id: 9, status: 'PENDING' } }
    return { status: 200, body: { status: 'OK' } }
  }

  it('동작을 HTTP 요청으로 바꾼다', async () => {
    const { result, calls } = await run(
      [
        { login: 'kim@example.com' },
        { add_to_cart: { product: 1, qty: 2 } },
        { quote: { items: [{ product: 1, qty: 2 }], coupon: 'SALE10' } },
        { order: { coupon: 'SALE10' } },
        { pay: {} },
        { grade: { total_spent: 1000000 } },
        { delivery_estimate: { paid_at: '2026-10-07T15:00:00+09:00', zipcode: '06236' } },
      ],
      api,
    )
    expect(result.passed).toBe(true)
    const req = calls.slice(1).map((c) => `${c.method} ${c.path}`)
    expect(req).toEqual([
      'PUT /api/cart/items/1',
      'POST /api/quote',
      'POST /api/orders',
      'POST /api/orders/9/pay',
      'GET /api/grades/evaluate?totalSpent=1000000',
      'GET /api/delivery-estimate?paidAt=2026-10-07T15%3A00%3A00%2B09%3A00&zipcode=06236',
    ])
    expect(calls[2].body).toEqual({ items: [{ productId: 1, qty: 2 }], couponCode: 'SALE10' })
    expect(calls[4].body).toEqual({ cardNumber: '4111-1111-1111-1111' })
  })

  it('ship/deliver 는 관리자 토큰으로 보내고, 회원 로그인은 그대로 유지한다', async () => {
    const { calls } = await run([{ login: 'kim@example.com' }, { order: {} }, { ship: {} }, { deliver: {} }, { refund: {} }], api)
    const auth = calls.filter((c) => !c.path.includes('auth')).map((c) => `${c.path} ${c.headers.authorization}`)
    expect(auth).toEqual([
      '/api/orders Bearer USER',
      '/api/admin/orders/9/ship Bearer ADMIN',
      '/api/admin/orders/9/deliver Bearer ADMIN',
      '/api/orders/9/refund Bearer USER',
    ])
    expect(calls.filter((c) => c.path === '/api/auth/login')).toHaveLength(2) // 관리자 로그인은 한 번만
  })

  it('order 실패를 기대하는 단계에서는 자동 저장이 방해하지 않는다', async () => {
    const { result } = await run([{ order: {}, expect: { status: 422 } }], () => ({ status: 422, body: { code: 'COUPON_NOT_APPLICABLE' } }))
    expect(result.passed).toBe(true)
  })

  it('주문 없이 주문 동작을 쓰면 알기 쉬운 오류', async () => {
    await expect(run([{ pay: {} }], api)).rejects.toThrow(/먼저 order 동작으로 주문을 만드세요/)
    const { calls } = await run([{ pay: { order: 5 } }], api)
    expect(calls[0].path).toBe('/api/orders/5/pay')
  })

  it('단계별 now 는 그 요청에만 X-QA-Lab-Now 를 붙인다', async () => {
    const { calls } = await run([{ http: { path: '/a' }, now: '2026-10-20T10:00:00+09:00' }, { http: { path: '/b' } }], api)
    expect(calls[0].headers['x-qa-lab-now']).toBe('2026-10-20T10:00:00+09:00')
    expect(calls[1].headers).not.toHaveProperty('x-qa-lab-now')
  })

  it('필수 인자가 없으면 실행 전에 알려 준다', async () => {
    await expect(run([{ quote: {} }], api)).rejects.toThrow(/quote: items 가 필요합니다/)
    await expect(run([{ quote: { items: [{ product: 1 }] } }], api)).rejects.toThrow(/product 와 qty/)
    await expect(run([{ grade: {} }], api)).rejects.toThrow(/total_spent/)
  })
})

describe('단계 형식 검사 (오타가 조용히 통과하지 않도록)', () => {
  it.each([
    [{ quote: { items: [] }, expected: { status: 200 } }, /알 수 없는 키가 있습니다: expected/],
    [{ qoute: { items: [] } }, /종류를 알 수 없습니다/],
    [{ quote: {}, pay: {} }, /동작이 여러 개/],
    [{ http: { path: '/a' }, expect: { stauts: 200 } }, /expect 에 알 수 없는 키/],
    [{ http: { path: '/a' }, password: 'x' }, /password 는 login 에만/],
    [{ http: { path: '/a' }, expect: { max_ms: 0 } }, /max_ms 는 1 이상의 정수/],
    [{ http: { path: '/a' }, expect: { max_ms: '100' } }, /max_ms 는 1 이상의 정수/],
    ['문자열', /올바른 형식이 아닙니다/],
  ])('%j', async (step, message) => {
    await expect(run([step], () => ({ status: 200 }))).rejects.toThrow(message)
  })

  it('형식 오류는 실행 전에 잡는다 (앞 단계를 보내지 않음)', async () => {
    const f = fakeFetch(() => ({ status: 200 }))
    await expect(runRepro({ steps: [{ http: { path: '/a' } }, { nope: 1 }] }, { baseUrl: 'http://sut.test', fetch: f.fetchImpl })).rejects.toThrow()
    expect(f.calls).toEqual([])
  })
})

describe('응답 시간 (expect.max_ms)', () => {
  /** 응답 본문을 delayMs 뒤에 돌려주는 fetch 대역 */
  const slowFetch = (delayMs) => async () => ({
    status: 200,
    text: () => new Promise((resolve) => setTimeout(() => resolve('{}'), delayMs)),
  })
  const runTimed = (maxMs, delayMs) =>
    runRepro({ steps: [{ products: {}, expect: { status: 200, max_ms: maxMs } }] }, { baseUrl: 'http://sut.test', fetch: slowFetch(delayMs) })

  it('상한 안이면 통과한다', async () => {
    expect((await runTimed(1000, 0)).passed).toBe(true)
  })

  it('본문을 다 받을 때까지의 시간이 상한을 넘으면 실패한다', async () => {
    const r = await runTimed(20, 80)
    expect(r.passed).toBe(false)
    expect(r.failures[0]).toMatchObject({ kind: 'time', expected: 20 })
    expect(r.failures[0].actual).toBeGreaterThanOrEqual(60)
    expect(r.failures[0].message).toMatch(/응답 시간 기대 ≤ 20ms, 실제 \d+ms/)
  })

  it('hideActual 이면 실제 시간을 숨긴다', () => {
    const msg = formatFailure({ kind: 'time', label: 'products', expected: 100, actual: 512 }, { hideActual: true })
    expect(msg).toContain('기준(100ms)')
    expect(msg).not.toContain('512')
  })
})

describe('날짜 (YAML 의 따옴표 없는 날짜)', () => {
  it('Date 기대값은 같은 날짜·같은 순간이면 같다', () => {
    expect(sameValue(new Date('2026-10-08T00:00:00Z'), '2026-10-08')).toBe(true)
    expect(sameValue(new Date('2026-10-08T00:00:00Z'), '2026-10-09')).toBe(false)
    expect(sameValue(new Date('2026-10-07T15:00:00+09:00'), '2026-10-07T06:00:00.000Z')).toBe(true)
  })

  it('동작 인자의 Date 는 문자열로 바꿔 보낸다', async () => {
    const { calls } = await run([{ delivery_estimate: { paid_at: new Date('2026-10-07T15:00:00+09:00'), zipcode: '06236' } }], () => ({ status: 200 }))
    expect(calls[0].path).toContain('paidAt=2026-10-07T06%3A00%3A00.000Z')
  })

  it('expect 의 Date 기대값으로 비교한다', async () => {
    const { result } = await run([{ http: { path: '/a' }, expect: { json: { shipDate: new Date('2026-10-08T00:00:00Z') } } }], () => ({ status: 200, body: { shipDate: '2026-10-08' } }))
    expect(result.passed).toBe(true)
  })
})

describe('formatFailure', () => {
  it('hideActual 이면 실제 값을 숨긴다', () => {
    const f = { kind: 'json', label: 'quote', path: 'shippingFee', expected: 0, actual: 3000 }
    expect(formatFailure(f)).toBe('quote: shippingFee 기대 0, 실제 3000')
    expect(formatFailure(f, { hideActual: true })).toBe('quote: shippingFee 기대값(0)이 사양과 다릅니다')
    expect(formatFailure({ kind: 'status', label: 'quote', expected: 400, actual: 200 }, { hideActual: true })).not.toContain('200')
  })
})
