import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '../../src/db/reset.js'
import { validateResponse } from './contract.js'
import { startServer, type TestServer } from './server.js'

let server: TestServer

interface Res {
  status: number
  body: any
  headers: Headers
}

/** 요청을 보내고, 응답이 openapi.yaml 계약을 지키는지 함께 검사한다. */
async function call(method: string, template: string, opts: { params?: Record<string, string | number>; query?: string; token?: string; json?: unknown; headers?: Record<string, string>; contract?: boolean } = {}): Promise<Res> {
  let path = template
  for (const [k, v] of Object.entries(opts.params ?? {})) path = path.replace(`{${k}}`, String(v))
  const headers: Record<string, string> = { ...(opts.headers ?? {}) }
  if (opts.token) headers.authorization = `Bearer ${opts.token}`
  if (opts.json !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(`${server.baseUrl}${path}${opts.query ? '?' + opts.query : ''}`, {
    method, headers, body: opts.json === undefined ? undefined : JSON.stringify(opts.json),
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : undefined
  if (opts.contract !== false) {
    expect(validateResponse(method, template, res.status, body), `${method} ${template} ${res.status} 계약 위반`).toEqual([])
  }
  return { status: res.status, body, headers: res.headers }
}

async function login(email: string, password = 'qa-lab-1234'): Promise<string> {
  const r = await call('POST', '/api/auth/login', { json: { email, password } })
  expect(r.status).toBe(200)
  return r.body.token
}

async function orderWith(token: string, items: Array<[number, number]>, body: Record<string, unknown> = {}) {
  for (const [productId, qty] of items) {
    expect((await call('PUT', '/api/cart/items/{productId}', { params: { productId }, token, json: { qty } })).status).toBe(200)
  }
  return call('POST', '/api/orders', { token, json: body })
}

beforeAll(async () => {
  server = await startServer({ allowDevTools: true })
})
afterAll(async () => {
  await server.close()
})
beforeEach(async () => {
  await resetDatabase(server.db)
})

describe('공통', () => {
  it('헬스 체크와 X-Request-Id', async () => {
    const r = await call('GET', '/health')
    expect(r.status).toBe(200)
    expect(r.headers.get('x-request-id')).toMatch(/[0-9a-f-]{36}/)
  })

  it('알 수 없는 경로는 404 오류 형식', async () => {
    const r = await call('GET', '/api/nope', { contract: false })
    expect(r.status).toBe(404)
    expect(r.body.code).toBe('NOT_FOUND')
  })

  it('OpenAPI 문서와 Swagger UI 를 제공한다', async () => {
    expect((await fetch(`${server.baseUrl}/openapi.yaml`)).status).toBe(200)
    expect((await fetch(`${server.baseUrl}/docs/`)).status).toBe(200)
  })
})

describe('회원', () => {
  it('가입 → 로그인 → 내 정보', async () => {
    const r = await call('POST', '/api/members', { json: { name: ' 홍길동 ', email: 'Hong@Example.com', password: 'password123', zipcode: '06236' } })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ name: '홍길동', email: 'hong@example.com', grade: 'NORMAL', totalSpent: 0 })
    const token = await login('hong@example.com', 'password123')
    expect((await call('GET', '/api/members/me', { token })).body.email).toBe('hong@example.com')
  })

  it('중복 이메일은 409, 잘못된 입력은 필드별 400', async () => {
    expect((await call('POST', '/api/members', { json: { name: '김중복', email: 'KIM@example.com', password: 'password123', zipcode: '06236' } })).status).toBe(409)
    const bad = await call('POST', '/api/members', { json: { name: '김', email: 'x', password: 'short', zipcode: '123' } })
    expect(bad.status).toBe(400)
    expect(Object.keys(bad.body.details.fields).sort()).toEqual(['email', 'name', 'password', 'zipcode'])
  })

  it('인증 실패', async () => {
    expect((await call('POST', '/api/auth/login', { json: { email: 'kim@example.com', password: 'wrong-pass' } })).status).toBe(401)
    expect((await call('GET', '/api/members/me')).status).toBe(401)
    expect((await call('GET', '/api/members/me', { token: 'nope' })).status).toBe(401)
  })

  it('시드 회원의 등급', async () => {
    const choi = await login('choi@example.com')
    expect((await call('GET', '/api/members/me', { token: choi })).body.grade).toBe('VIP')
  })
})

describe('계산기', () => {
  it('등급 판정과 입력 검증', async () => {
    expect((await call('GET', '/api/grades/evaluate', { query: 'totalSpent=500000' })).body).toEqual({ totalSpent: 500000, grade: 'GOLD', discountRate: 3 })
    for (const q of ['totalSpent=-1', 'totalSpent=abc', 'totalSpent=1.5', '']) {
      expect((await call('GET', '/api/grades/evaluate', { query: q })).status).toBe(400)
    }
  })

  it('배송 예정일은 시간대가 명시된 시각만 받는다', async () => {
    const ok = await call('GET', '/api/delivery-estimate', { query: 'paidAt=2026-10-07T13:59:59%2B09:00&zipcode=63309' })
    expect(ok.body).toMatchObject({ remote: true, shipDate: '2026-10-07', deliveryDate: '2026-10-12' })
    expect((await call('GET', '/api/delivery-estimate', { query: 'paidAt=2026-10-07T13:59:59&zipcode=06236' })).status).toBe(400)
  })
})

describe('장바구니와 미리보기', () => {
  it('수량은 바꾸고(더하지 않음), 재고를 넘을 수 없다', async () => {
    const token = await login('kim@example.com')
    await call('PUT', '/api/cart/items/{productId}', { params: { productId: 2 }, token, json: { qty: 2 } })
    await call('PUT', '/api/cart/items/{productId}', { params: { productId: 2 }, token, json: { qty: 3 } })
    const cart = await call('GET', '/api/cart', { token })
    expect(cart.body.items).toHaveLength(1)
    expect(cart.body.items[0].qty).toBe(3)
    expect((await call('PUT', '/api/cart/items/{productId}', { params: { productId: 10 }, token, json: { qty: 2 } })).status).toBe(409)
    expect((await call('PUT', '/api/cart/items/{productId}', { params: { productId: 999 }, token, json: { qty: 1 } })).status).toBe(404)
    expect((await call('DELETE', '/api/cart/items/{productId}', { params: { productId: 2 }, token })).status).toBe(204)
  })

  it('쿠폰 거절 사유', async () => {
    const token = await login('kim@example.com')
    const quote = (couponCode: string, items = [{ productId: 1, qty: 1 }]) => call('POST', '/api/quote', { token, json: { items, couponCode } })
    expect((await quote('NOPE')).body.details.reason).toBe('NOT_FOUND')
    expect((await quote('EXPIRED5000')).body.details.reason).toBe('EXPIRED')
    expect((await quote('SOON5000')).body.details.reason).toBe('NOT_STARTED')
    expect((await quote('FIXED10000')).body.details.reason).toBe('MIN_ORDER_NOT_MET')
    const ok = await quote('BIG20')
    expect(ok.body).toMatchObject({ subtotal: 50000, couponDiscount: 10000, shippingFee: 3000, total: 43000 })
  })

  it('관리자 계정에는 쿠폰이 발급되지 않는다', async () => {
    const admin = await login('admin@example.com')
    const r = await call('POST', '/api/quote', { token: admin, json: { items: [{ productId: 1, qty: 1 }], couponCode: 'BIG20' } })
    expect(r.body.details.reason).toBe('NOT_OWNED')
  })
})

describe('주문 생애 주기', () => {
  it('생성 → 결제 거절 → 결제 → 출고 → 배송 완료 → 환불', async () => {
    const kim = await login('kim@example.com')
    const admin = await login('admin@example.com')
    const created = await orderWith(kim, [[1, 2]], { couponCode: 'SALE10' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ status: 'PENDING', subtotal: 100000, couponDiscount: 5000, shippingFee: 0, total: 95000, couponCode: 'SALE10' })
    const id = created.body.id
    expect((await call('GET', '/api/products/{id}', { params: { id: 1 } })).body.stock).toBe(28)
    expect((await call('GET', '/api/cart', { token: kim })).body.items).toHaveLength(0)

    const declined = await call('POST', '/api/orders/{id}/pay', { params: { id }, token: kim, json: { cardNumber: '4000-0000-0000-0002' } })
    expect(declined.status).toBe(402)
    expect((await call('GET', '/api/orders/{id}', { params: { id }, token: kim })).body.status).toBe('PENDING')

    const paid = await call('POST', '/api/orders/{id}/pay', {
      params: { id }, token: kim, json: { cardNumber: '4111111111111111' }, headers: { 'x-qa-lab-now': '2026-10-07T15:00:00+09:00' },
    })
    expect(paid.body).toMatchObject({ status: 'PAID', paidAt: '2026-10-07T06:00:00.000Z', shipDate: '2026-10-08', estimatedDelivery: '2026-10-12' })

    expect((await call('POST', '/api/admin/orders/{id}/ship', { params: { id }, token: kim })).status).toBe(403)
    expect((await call('POST', '/api/admin/orders/{id}/ship', { params: { id }, token: admin })).body.status).toBe('SHIPPED')
    expect((await call('POST', '/api/orders/{id}/cancel', { params: { id }, token: kim })).status).toBe(409)
    const delivered = await call('POST', '/api/admin/orders/{id}/deliver', {
      params: { id }, token: admin, headers: { 'x-qa-lab-now': '2026-10-12T10:00:00+09:00' },
    })
    expect(delivered.body.status).toBe('DELIVERED')
    expect((await call('GET', '/api/members/me', { token: kim })).body).toMatchObject({ totalSpent: 95000, grade: 'NORMAL' })

    const late = await call('POST', '/api/orders/{id}/refund', { params: { id }, token: kim, headers: { 'x-qa-lab-now': '2026-10-19T10:00:01+09:00' } })
    expect(late.status).toBe(409)
    expect(late.body.code).toBe('REFUND_PERIOD_EXPIRED')
    const refunded = await call('POST', '/api/orders/{id}/refund', { params: { id }, token: kim, headers: { 'x-qa-lab-now': '2026-10-19T10:00:00+09:00' } })
    expect(refunded.body.status).toBe('REFUNDED')
    expect((await call('GET', '/api/members/me', { token: kim })).body.totalSpent).toBe(0)
    expect((await call('GET', '/api/products/{id}', { params: { id: 1 } })).body.stock).toBe(30)
    expect((await call('GET', '/api/orders', { token: kim })).body).toHaveLength(1)
  })

  it('취소하면 재고와 쿠폰이 돌아온다', async () => {
    const kim = await login('kim@example.com')
    const created = await orderWith(kim, [[10, 1]], { couponCode: 'BIG20' })
    expect((await call('POST', '/api/orders/{id}/cancel', { params: { id: created.body.id }, token: kim })).body.status).toBe('CANCELLED')
    expect((await call('GET', '/api/products/{id}', { params: { id: 10 } })).body.stock).toBe(1)
    const coupons = await call('GET', '/api/members/me/coupons', { token: kim })
    expect(coupons.body.find((c: any) => c.code === 'BIG20').usedAt).toBeNull()
  })

  it('빈 장바구니, 다른 회원의 주문', async () => {
    const kim = await login('kim@example.com')
    const lee = await login('lee@example.com')
    expect((await call('POST', '/api/orders', { token: kim, json: {} })).body.code).toBe('CART_EMPTY')
    const created = await orderWith(kim, [[2, 1]])
    expect((await call('GET', '/api/orders/{id}', { params: { id: created.body.id }, token: lee })).status).toBe(404)
  })
})

describe('로컬 전용 기능', () => {
  it('잘못된 개발용 헤더는 400', async () => {
    expect((await call('GET', '/health', { headers: { 'x-qa-lab-defects': 'DF-999' }, contract: false })).status).toBe(400)
    expect((await call('GET', '/health', { headers: { 'x-qa-lab-now': 'yesterday' }, contract: false })).status).toBe(400)
  })

  it('ALLOW_DEV_TOOLS 가 꺼져 있으면 헤더를 무시하고 /__admin 경로가 없다', async () => {
    const prod = await startServer({ allowDevTools: false, profile: 'none' })
    try {
      const r = await fetch(`${prod.baseUrl}/api/grades/evaluate?totalSpent=1000000`, { headers: { 'x-qa-lab-defects': 'DF-002' } })
      expect((await r.json()).grade).toBe('VIP')
      expect((await fetch(`${prod.baseUrl}/__admin/reset`, { method: 'POST' })).status).toBe(404)
    } finally {
      await prod.close()
    }
  })

  it('프로필로 켠 결함은 헤더 없이도 동작한다', async () => {
    const beginner = await startServer({ allowDevTools: false, profile: 'beginner' })
    try {
      const r = await fetch(`${beginner.baseUrl}/api/grades/evaluate?totalSpent=1000000`)
      expect((await r.json()).grade).toBe('GOLD')
    } finally {
      await beginner.close()
    }
  })
})

describe('환경 조건과 fixture (로컬 전용)', () => {
  it('환경 조회: 기본값과 헤더 덮어쓰기', async () => {
    const base = await call('GET', '/__qa/environment', { contract: false })
    expect(base.body).toMatchObject({ uiVariant: 'v1', latencyProfile: 'none' })
    const over = await call('GET', '/__qa/environment', { headers: { 'x-qa-lab-ui-variant': 'v2', 'x-qa-lab-latency': 'slow' }, contract: false })
    expect(over.body).toMatchObject({ uiVariant: 'v2', latencyProfile: 'slow' })
    expect((await call('GET', '/__qa/environment', { headers: { 'x-qa-lab-ui-variant': 'v9' }, contract: false })).status).toBe(400)
  })

  it('환경 조회: 웹 결함의 켜짐 여부는 요청 문맥(X-QA-Lab-Defects)을 따른다', async () => {
    const off = await call('GET', '/__qa/environment', { contract: false })
    const flags = off.body.webDefects as Record<string, boolean>
    expect(Object.keys(flags).length).toBeGreaterThan(0)
    expect(Object.values(flags).every((v) => v === false)).toBe(true)
    const [first] = Object.keys(flags)
    const on = await call('GET', '/__qa/environment', { headers: { 'x-qa-lab-defects': first }, contract: false })
    expect(Object.entries(on.body.webDefects as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k)).toEqual([first])
  })

  it('지연은 /api/ 요청에만 적용되고, 헬스 체크·환경 조회는 느려지지 않는다', async () => {
    const timed = async (path: string) => {
      const t = Date.now()
      await call('GET', path, { headers: { 'x-qa-lab-latency': 'slow' }, contract: false })
      return Date.now() - t
    }
    expect(await timed('/api/products')).toBeGreaterThanOrEqual(650)
    expect(await timed('/health')).toBeLessThan(300)
    expect(await timed('/__qa/environment')).toBeLessThan(300)
  })

  it('개발용 기능이 꺼져 있으면 환경 헤더를 무시한다', async () => {
    const prod = await startServer({ allowDevTools: false })
    try {
      const r = await fetch(`${prod.baseUrl}/__qa/environment`, { headers: { 'x-qa-lab-ui-variant': 'v2', 'x-qa-lab-latency': 'slow' } })
      expect(await r.json()).toMatchObject({ uiVariant: 'v1', latencyProfile: 'none' })
      expect((await fetch(`${prod.baseUrl}/__admin/fixtures/orders`, { method: 'POST' })).status).toBe(404)
    } finally {
      await prod.close()
    }
  })

  it('fixture: 배송 완료된 주문을 만들고 환불까지 할 수 있다', async () => {
    const created = await call('POST', '/__admin/fixtures/orders', { json: { email: 'park@example.com', status: 'DELIVERED', items: [{ productId: 1, qty: 2 }] }, contract: false })
    expect(created.status).toBe(201)
    const park = await login('park@example.com')
    const order = await call('GET', '/api/orders/{id}', { params: { id: created.body.id }, token: park })
    expect(order.body).toMatchObject({ status: 'DELIVERED', subtotal: 100000, grade: 'GOLD', gradeDiscount: 3000, couponDiscount: 0, shippingFee: 0, total: 97000 })
    expect(order.body.deliveredAt).not.toBeNull()
    const refunded = await call('POST', '/api/orders/{id}/refund', { params: { id: created.body.id }, token: park })
    expect(refunded.body.status).toBe('REFUNDED')
  })

  it('fixture: 기한이 지난 배송 완료 주문은 환불이 거절된다', async () => {
    const created = await call('POST', '/__admin/fixtures/orders', { json: { email: 'kim@example.com', status: 'DELIVERED', items: [{ productId: 3, qty: 1 }], deliveredHoursAgo: 24 * 8 }, contract: false })
    const kim = await login('kim@example.com')
    expect((await call('POST', '/api/orders/{id}/refund', { params: { id: created.body.id }, token: kim })).status).toBe(409)
  })

  it('fixture: 모든 상태로 만들 수 있고, 잘못된 입력은 400·404', async () => {
    for (const status of ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED']) {
      const r = await call('POST', '/__admin/fixtures/orders', { json: { email: 'kim@example.com', status, items: [{ productId: 1, qty: 1 }] }, contract: false })
      expect(r.status, status).toBe(201)
    }
    const kim = await login('kim@example.com')
    const list = await call('GET', '/api/orders', { token: kim })
    expect(list.body.map((o: { status: string }) => o.status).sort()).toEqual(['CANCELLED', 'PAID', 'PENDING', 'REFUNDED', 'SHIPPED'])
    const bad = (json: unknown) => call('POST', '/__admin/fixtures/orders', { json, contract: false })
    expect((await bad({ email: 'kim@example.com', status: 'NOPE', items: [{ productId: 1, qty: 1 }] })).status).toBe(400)
    expect((await bad({ email: 'kim@example.com', status: 'PAID', items: [] })).status).toBe(400)
    expect((await bad({ email: 'nobody@example.com', status: 'PAID', items: [{ productId: 1, qty: 1 }] })).status).toBe(404)
  })
})
