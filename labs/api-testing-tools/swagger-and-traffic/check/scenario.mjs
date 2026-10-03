import { resetSut } from '../../../../scripts/lib/sut.mjs'

/** t1 질문 정의. kind 는 답 비교 방식(answer-sheet.mjs), 정답은 결함 없는 앱에서 직접 계산한다. */
export const SPEC = [
  { id: 'q1', kind: 'number' },
  { id: 'q2', kind: 'text' },
  { id: 'q3', kind: 'set' },
  { id: 'q4', kind: 'number' },
  { id: 'q5', kind: 'text' },
  { id: 'q6', kind: 'text' },
]

async function call(baseUrl, method, path, { token, json } = {}) {
  const headers = { 'x-qa-lab-defects': 'none' }
  if (token) headers.authorization = `Bearer ${token}`
  if (json !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(new URL(path, baseUrl), { method, headers, body: json === undefined ? undefined : JSON.stringify(json) })
  return { status: res.status, body: await res.json() }
}

async function login(baseUrl, email) {
  const r = await call(baseUrl, 'POST', '/api/auth/login', { json: { email, password: 'qa-lab-1234' } })
  if (r.status !== 200) throw new Error(`로그인 실패: ${email}`)
  return r.body.token
}

/** 결함 없는 앱(none)에 같은 절차를 직접 실행해 정답을 만든다. 실행 전에 DB 를 초기화한다. */
export async function expectedAnswers(baseUrl) {
  await resetSut(baseUrl)
  const kim = await login(baseUrl, 'kim@example.com')
  const park = await login(baseUrl, 'park@example.com')
  const me = await call(baseUrl, 'GET', '/api/members/me', { token: park })
  const coupons = await call(baseUrl, 'GET', '/api/members/me/coupons', { token: kim })
  const products = await call(baseUrl, 'GET', '/api/products')
  const quote = await call(baseUrl, 'POST', '/api/quote', { token: kim, json: { items: [{ productId: 6, qty: 1 }], couponCode: 'SALE10' } })
  const noToken = await call(baseUrl, 'GET', '/api/cart')
  const tooMany = await call(baseUrl, 'PUT', '/api/cart/items/10', { token: kim, json: { qty: 2 } })
  const maxMin = Math.max(...coupons.body.map((c) => c.minOrderAmount))
  const top = coupons.body.filter((c) => c.minOrderAmount === maxMin)
  if (top.length !== 1) throw new Error('q2 의 정답이 하나로 정해지지 않습니다 (시드 쿠폰이 바뀐 것 같습니다)')
  return {
    q1: me.body.totalSpent,
    q2: top[0].code,
    q3: products.body.filter((p) => p.stock === 0).map((p) => p.id),
    q4: quote.body.total,
    q5: noToken.body.code,
    q6: tooMany.body.code,
  }
}
