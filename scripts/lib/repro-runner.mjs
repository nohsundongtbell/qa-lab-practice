/**
 * 재현 DSL 실행기.
 *
 * 재현 절차(steps)는 "SPEC 대로의 기대 동작"을 적는다. 기대가 하나라도 어긋나면 passed=false.
 * - 결함이 없는 SUT(none)에서는 통과해야 하고, 결함이 켜진 SUT에서는 실패해야 "재현"된 것이다.
 *
 * 단계 하나에는 "동작" 키가 정확히 하나 있고, 선택적으로 expect / save / now 를 붙인다.
 *   동작: login, logout, http(원시 요청), 그리고 업무 동작(ACTIONS: quote, order, pay, ship …)
 *   expect: { status?, json?: { '점.경로': 기대값 }, max_ms?: 응답 시간 상한(밀리초) }
 *   save:   { 변수: '응답 json 경로' }  → 이후 단계에서 {{변수}} 로 쓴다
 *   now:    이 요청의 "현재 시각" (X-QA-Lab-Now, 시간대 포함 ISO-8601)
 * 학습자용 설명: docs/REPRO_DSL.md
 */

export const DEFAULT_PASSWORD = 'qa-lab-1234'
export const ADMIN_EMAIL = 'admin@example.com'
export const DEFAULT_CARD = '4111-1111-1111-1111'

/** 절차 자체가 잘못된 경우(문법 오류, 네트워크 오류)에 던진다. 기대 불일치와 구분한다. */
export class ReproError extends Error {}

/** 점 경로로 값을 꺼낸다. 없으면 undefined. */
export function getPath(obj, path) {
  if (path === '' || path === '.') return obj
  return String(path)
    .split('.')
    .reduce((cur, key) => (cur === null || cur === undefined ? undefined : cur[key]), obj)
}

/** YAML 이 따옴표 없는 날짜·시각을 Date 로 바꾼 경우 문자열로 되돌린다. 자정(UTC)이면 날짜만. */
export function dateToString(d) {
  const iso = d.toISOString()
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso
}

function normalizeDates(value) {
  if (value instanceof Date) return dateToString(value)
  if (Array.isArray(value)) return value.map(normalizeDates)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeDates(v)]))
  return value
}

/** 값 안의 {{변수}} 를 치환한다 (문자열 전체가 변수 하나면 원래 타입을 유지). */
export function interpolate(value, vars) {
  if (typeof value === 'string') {
    const whole = /^\{\{(\w+)\}\}$/.exec(value)
    if (whole) {
      if (!(whole[1] in vars)) throw new ReproError(`정의되지 않은 변수입니다: ${whole[1]}`)
      return vars[whole[1]]
    }
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      if (!(name in vars)) throw new ReproError(`정의되지 않은 변수입니다: ${name}`)
      return String(vars[name])
    })
  }
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map((v) => interpolate(v, vars))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, vars)]))
  }
  return value
}

function normalize(v) {
  if (v instanceof Date) return dateToString(v)
  if (Array.isArray(v)) return v.map(normalize)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, normalize(v[k])]))
  return v
}

/** 기대값과 실제값 비교 (객체는 깊은 비교, 기대값이 Date 면 같은 순간·같은 날짜인지). */
export function sameValue(expected, actual) {
  if (expected instanceof Date && typeof actual === 'string') {
    const exp = dateToString(expected)
    if (/^\d{4}-\d{2}-\d{2}$/.test(exp)) return actual === exp
    return Date.parse(actual) === expected.getTime()
  }
  return JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual))
}

// ---------------------------------------------------------------------------
// 업무 동작 → HTTP 요청
// ---------------------------------------------------------------------------

function need(args, key, action) {
  if (args?.[key] === undefined || args[key] === null || args[key] === '') {
    throw new ReproError(`${action}: ${key} 가 필요합니다.`)
  }
  return args[key]
}

function itemsOf(args, action) {
  const items = need(args, 'items', action)
  if (!Array.isArray(items) || items.length === 0) throw new ReproError(`${action}: items 는 [{ product, qty }] 목록이어야 합니다.`)
  return items.map((it, i) => {
    if (!it || typeof it !== 'object' || it.product === undefined || it.qty === undefined) {
      throw new ReproError(`${action}: items[${i}] 에는 product 와 qty 가 필요합니다.`)
    }
    return { productId: it.product, qty: it.qty }
  })
}

const orderId = (args) => args?.order ?? '{{order}}'
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

/**
 * 업무 동작 정의. 반환값: { method, path, json?, asAdmin?, autoSave? }
 * - asAdmin: 관리자 토큰으로 보낸다 (현재 로그인한 회원은 그대로 유지)
 * - autoSave: 2xx 응답이면 조용히 변수에 저장한다 (실패를 기대하는 단계를 방해하지 않도록)
 */
export const ACTIONS = {
  me: () => ({ method: 'GET', path: '/api/members/me' }),
  my_coupons: () => ({ method: 'GET', path: '/api/members/me/coupons' }),
  signup: (a) => ({
    method: 'POST',
    path: '/api/members',
    json: compact({ name: need(a, 'name', 'signup'), email: need(a, 'email', 'signup'), password: a.password ?? 'password123', zipcode: need(a, 'zipcode', 'signup'), address: a.address }),
  }),
  product: (a) => ({ method: 'GET', path: `/api/products/${need(a, 'id', 'product')}` }),
  products: () => ({ method: 'GET', path: '/api/products' }),
  cart: () => ({ method: 'GET', path: '/api/cart' }),
  add_to_cart: (a) => ({ method: 'PUT', path: `/api/cart/items/${need(a, 'product', 'add_to_cart')}`, json: { qty: need(a, 'qty', 'add_to_cart') } }),
  remove_from_cart: (a) => ({ method: 'DELETE', path: `/api/cart/items/${need(a, 'product', 'remove_from_cart')}` }),
  quote: (a) => ({ method: 'POST', path: '/api/quote', json: compact({ items: itemsOf(a, 'quote'), couponCode: a.coupon, zipcode: a.zipcode }) }),
  order: (a = {}) => ({ method: 'POST', path: '/api/orders', json: compact({ couponCode: a.coupon, zipcode: a.zipcode, address: a.address }), autoSave: { order: 'id' } }),
  get_order: (a) => ({ method: 'GET', path: `/api/orders/${orderId(a)}` }),
  orders: () => ({ method: 'GET', path: '/api/orders' }),
  pay: (a = {}) => ({ method: 'POST', path: `/api/orders/${orderId(a)}/pay`, json: { cardNumber: a.card ?? DEFAULT_CARD } }),
  cancel: (a) => ({ method: 'POST', path: `/api/orders/${orderId(a)}/cancel` }),
  refund: (a) => ({ method: 'POST', path: `/api/orders/${orderId(a)}/refund` }),
  ship: (a) => ({ method: 'POST', path: `/api/admin/orders/${orderId(a)}/ship`, asAdmin: true }),
  deliver: (a) => ({ method: 'POST', path: `/api/admin/orders/${orderId(a)}/deliver`, asAdmin: true }),
  grade: (a) => ({ method: 'GET', path: `/api/grades/evaluate?totalSpent=${encodeURIComponent(need(a, 'total_spent', 'grade'))}` }),
  delivery_estimate: (a) => ({
    method: 'GET',
    path: `/api/delivery-estimate?paidAt=${encodeURIComponent(need(a, 'paid_at', 'delivery_estimate'))}&zipcode=${encodeURIComponent(need(a, 'zipcode', 'delivery_estimate'))}`,
  }),
}

const CONTROL_KEYS = ['login', 'logout', 'http']
export const STEP_KINDS = [...CONTROL_KEYS, ...Object.keys(ACTIONS)]
const MODIFIER_KEYS = new Set(['expect', 'save', 'now', 'password'])
const EXPECT_KEYS = new Set(['status', 'json', 'max_ms'])

/** 단계의 동작 이름을 찾고, 알 수 없는 키를 막는다 (오타가 조용히 통과하지 않도록). */
export function stepKind(step, stepNo) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) throw new ReproError(`${stepNo}번째 단계가 올바른 형식이 아닙니다.`)
  const kinds = Object.keys(step).filter((k) => STEP_KINDS.includes(k))
  const unknown = Object.keys(step).filter((k) => !STEP_KINDS.includes(k) && !MODIFIER_KEYS.has(k))
  if (kinds.length === 0) throw new ReproError(`${stepNo}번째 단계의 종류를 알 수 없습니다: ${JSON.stringify(step)} (사용 가능: ${STEP_KINDS.join(', ')})`)
  if (kinds.length > 1) throw new ReproError(`${stepNo}번째 단계에 동작이 여러 개입니다: ${kinds.join(', ')} (한 단계에 하나씩)`)
  if (unknown.length) throw new ReproError(`${stepNo}번째 단계에 알 수 없는 키가 있습니다: ${unknown.join(', ')} (expect, save, now 만 붙일 수 있습니다)`)
  if (step.password !== undefined && kinds[0] !== 'login') throw new ReproError(`${stepNo}번째 단계: password 는 login 에만 쓸 수 있습니다.`)
  if (step.expect !== undefined) {
    const bad = Object.keys(step.expect ?? {}).filter((k) => !EXPECT_KEYS.has(k))
    if (bad.length) throw new ReproError(`${stepNo}번째 단계의 expect 에 알 수 없는 키가 있습니다: ${bad.join(', ')} (status, json, max_ms 만 쓸 수 있습니다)`)
    const maxMs = step.expect?.max_ms
    if (maxMs !== undefined && !(Number.isInteger(maxMs) && maxMs > 0)) {
      throw new ReproError(`${stepNo}번째 단계의 expect.max_ms 는 1 이상의 정수(밀리초)여야 합니다.`)
    }
  }
  return kinds[0]
}

/** 실패 한 건을 문자열로. hideActual 이면 실제 값을 숨긴다 (오라클이 정답을 알려 주지 않도록). */
export function formatFailure(f, { hideActual = false } = {}) {
  if (f.kind === 'status') return hideActual ? `${f.label}: 응답 상태 코드 기대값(${f.expected})이 사양과 다릅니다` : `${f.label}: status 기대 ${f.expected}, 실제 ${f.actual}`
  if (f.kind === 'json') {
    return hideActual
      ? `${f.label}: ${f.path} 기대값(${JSON.stringify(normalize(f.expected))})이 사양과 다릅니다`
      : `${f.label}: ${f.path} 기대 ${JSON.stringify(normalize(f.expected))}, 실제 ${JSON.stringify(f.actual)}`
  }
  if (f.kind === 'time') return hideActual ? `${f.label}: 응답 시간이 기준(${f.expected}ms)을 넘었습니다` : `${f.label}: 응답 시간 기대 ≤ ${f.expected}ms, 실제 ${f.actual}ms`
  return f.message
}

/**
 * 재현 절차를 실행한다.
 * @param {object} repro { steps: [...] }
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string|undefined} [opts.defects] X-QA-Lab-Defects 헤더 값 ('none' 또는 'DF-001,DF-002'). undefined 면 보내지 않는다
 * @param {string|undefined} [opts.now] X-QA-Lab-Now 헤더 값 (모든 요청)
 * @param {boolean} [opts.reset] 실행 전에 POST /__admin/reset
 * @param {typeof fetch} [opts.fetch]
 * @returns {Promise<{ passed: boolean, failures: Array<{ step: number, message: string, kind?: string, label?: string, path?: string, expected?: unknown, actual?: unknown }> }>}
 */
export async function runRepro(repro, opts) {
  const doFetch = opts.fetch ?? fetch
  if (!repro || !Array.isArray(repro.steps) || repro.steps.length === 0) {
    throw new ReproError('repro.steps 가 비어 있습니다.')
  }
  // 실행 전에 모든 단계의 형식을 먼저 검사한다 (반쯤 실행하다 멈추지 않도록).
  repro.steps.forEach((s, i) => stepKind(s, i + 1))

  const baseHeaders = {}
  if (opts.defects !== undefined) baseHeaders['x-qa-lab-defects'] = opts.defects
  if (opts.now !== undefined) baseHeaders['x-qa-lab-now'] = opts.now

  async function request(method, path, json, extraHeaders = {}) {
    const headers = { ...baseHeaders, ...extraHeaders }
    if (json !== undefined) headers['content-type'] = 'application/json'
    let res
    const started = performance.now()
    try {
      res = await doFetch(new URL(path, opts.baseUrl), { method, headers, body: json === undefined ? undefined : JSON.stringify(json) })
    } catch (err) {
      throw new ReproError(`SUT에 연결할 수 없습니다 (${opts.baseUrl}): ${err.message}`)
    }
    const text = await res.text()
    const elapsedMs = Math.round(performance.now() - started)
    let body
    try {
      body = text ? JSON.parse(text) : undefined
    } catch {
      body = text
    }
    return { status: res.status, body, elapsedMs }
  }

  async function loginAs(email, password) {
    const r = await request('POST', '/api/auth/login', { email, password: password ?? DEFAULT_PASSWORD })
    return r.status === 200 && r.body?.token ? { token: r.body.token } : { status: r.status }
  }

  if (opts.reset) {
    const r = await request('POST', '/__admin/reset')
    if (r.status !== 200) throw new ReproError(`DB 초기화에 실패했습니다 (status ${r.status}). ALLOW_DEV_TOOLS=1 인지 확인하세요.`)
  }

  const vars = {}
  const failures = []
  let token
  let adminToken

  for (const [index, rawStep] of repro.steps.entries()) {
    const stepNo = index + 1
    const kind = stepKind(rawStep, stepNo)
    const step = normalizeDates(interpolate(rawStep, vars))

    if (kind === 'login') {
      const r = await loginAs(step.login, step.password)
      if (!r.token) {
        failures.push({ step: stepNo, kind: 'login', message: `로그인 실패: ${step.login} (status ${r.status})` })
        break
      }
      token = r.token
      continue
    }
    if (kind === 'logout') {
      token = undefined
      continue
    }

    let spec
    if (kind === 'http') {
      const { method = 'GET', path, json, headers = {} } = step.http ?? {}
      if (!path) throw new ReproError(`${stepNo}번째 단계에 http.path 가 없습니다.`)
      spec = { method: method.toUpperCase(), path, json, headers }
    } else {
      spec = ACTIONS[kind](step[kind] ?? {})
      // 기본 주문 번호({{order}})처럼 동작이 만든 변수 참조를 치환한다.
      if (spec.path.includes('{{order}}') && !('order' in vars)) {
        throw new ReproError(`${stepNo}번째 단계(${kind}): 대상 주문이 없습니다. 먼저 order 동작으로 주문을 만드세요 (또는 ${kind}: { order: 주문번호 }).`)
      }
      spec = { ...spec, path: interpolate(spec.path, vars) }
    }
    const label = kind === 'http' ? `${spec.method} ${spec.path}` : kind

    const headers = { ...(spec.headers ?? {}) }
    if (step.now !== undefined) headers['x-qa-lab-now'] = step.now
    if (spec.asAdmin) {
      if (!adminToken) {
        const r = await loginAs(ADMIN_EMAIL)
        if (!r.token) throw new ReproError(`관리자 로그인에 실패했습니다 (status ${r.status}).`)
        adminToken = r.token
      }
      headers.authorization = `Bearer ${adminToken}`
    } else if (token && !headers.authorization) headers.authorization = `Bearer ${token}`

    const r = await request(spec.method, spec.path, spec.json, headers)

    const before = failures.length
    const expect = step.expect ?? {}
    const rawExpect = rawStep.expect ?? {}
    if (expect.status !== undefined && expect.status !== r.status) {
      const f = { step: stepNo, kind: 'status', label, expected: expect.status, actual: r.status }
      failures.push({ ...f, message: formatFailure(f) })
    }
    for (const [p, want] of Object.entries(expect.json ?? {})) {
      const got = getPath(r.body, p)
      // 비교에는 원래 값(따옴표 없는 날짜면 Date)을 쓴다.
      const original = rawExpect.json?.[p] instanceof Date ? rawExpect.json[p] : want
      if (!sameValue(original, got)) {
        const f = { step: stepNo, kind: 'json', label, path: p, expected: want, actual: got }
        failures.push({ ...f, message: formatFailure(f) })
      }
    }
    if (expect.max_ms !== undefined && r.elapsedMs > expect.max_ms) {
      const f = { step: stepNo, kind: 'time', label, expected: expect.max_ms, actual: r.elapsedMs }
      failures.push({ ...f, message: formatFailure(f) })
    }
    // 기대가 어긋나면 이후 단계는 전제가 깨졌으므로 멈춘다.
    if (failures.length > before) break

    if (spec.autoSave && r.status >= 200 && r.status < 300) {
      for (const [name, p] of Object.entries(spec.autoSave)) {
        const value = getPath(r.body, p)
        if (value !== undefined) vars[name] = value
      }
    }
    for (const [name, p] of Object.entries(step.save ?? {})) {
      const value = getPath(r.body, p)
      if (value === undefined) {
        failures.push({ step: stepNo, kind: 'save', label, message: `${label}: 저장할 값 ${p} 가 응답에 없습니다` })
        break
      }
      vars[name] = value
    }
    if (failures.length > before) break
  }

  return { passed: failures.length === 0, failures }
}
