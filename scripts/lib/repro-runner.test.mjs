import { describe, expect, it } from 'vitest'
import { getPath, interpolate, ReproError, runRepro, sameValue } from './repro-runner.mjs'

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
