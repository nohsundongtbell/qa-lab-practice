/**
 * 재현 DSL 실행기.
 *
 * 재현 절차(steps)는 "SPEC 대로의 기대 동작"을 적는다. 기대가 하나라도 어긋나면 passed=false.
 * - 결함이 없는 SUT(none)에서는 통과해야 하고, 결함이 켜진 SUT에서는 실패해야 "재현"된 것이다.
 *
 * 단계 종류
 *   { login: '<email>', password?: '<pw>' }       → 로그인하고 이후 요청에 토큰을 붙인다
 *   { logout: true }                               → 토큰을 뗀다
 *   { http: { method, path, json?, headers? }, expect?: { status?, json? }, save?: { 변수: 'json.경로' } }
 * 문자열 안의 {{변수}} 는 save 로 저장한 값으로 바뀐다.
 * expect.json 의 키는 점(.)으로 이어진 경로다. 예: { 'details.reason': 'ALREADY_USED', 'items.0.qty': 1 }
 */

export const DEFAULT_PASSWORD = 'qa-lab-1234'

/** 점 경로로 값을 꺼낸다. 없으면 undefined. */
export function getPath(obj, path) {
  if (path === '' || path === '.') return obj
  return String(path)
    .split('.')
    .reduce((cur, key) => (cur === null || cur === undefined ? undefined : cur[key]), obj)
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
  if (Array.isArray(value)) return value.map((v) => interpolate(v, vars))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, vars)]))
  }
  return value
}

/** 기대값과 실제값 비교 (객체는 깊은 비교). */
export function sameValue(expected, actual) {
  return JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual))
}

function normalize(v) {
  if (Array.isArray(v)) return v.map(normalize)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, normalize(v[k])]))
  }
  return v
}

/** 절차 자체가 잘못된 경우(문법 오류, 네트워크 오류)에 던진다. 기대 불일치와 구분한다. */
export class ReproError extends Error {}

/**
 * 재현 절차를 실행한다.
 * @param {object} repro { steps: [...] }
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string|undefined} [opts.defects] X-QA-Lab-Defects 헤더 값 ('none' 또는 'DF-001,DF-002'). undefined 면 보내지 않는다
 * @param {string|undefined} [opts.now] X-QA-Lab-Now 헤더 값
 * @param {boolean} [opts.reset] 실행 전에 POST /__admin/reset
 * @param {typeof fetch} [opts.fetch]
 * @returns {Promise<{ passed: boolean, failures: Array<{ step: number, message: string }> }>}
 */
export async function runRepro(repro, opts) {
  const doFetch = opts.fetch ?? fetch
  if (!repro || !Array.isArray(repro.steps) || repro.steps.length === 0) {
    throw new ReproError('repro.steps 가 비어 있습니다.')
  }
  const baseHeaders = {}
  if (opts.defects !== undefined) baseHeaders['x-qa-lab-defects'] = opts.defects
  if (opts.now !== undefined) baseHeaders['x-qa-lab-now'] = opts.now

  async function request(method, path, json, extraHeaders = {}) {
    const headers = { ...baseHeaders, ...extraHeaders }
    if (json !== undefined) headers['content-type'] = 'application/json'
    let res
    try {
      res = await doFetch(new URL(path, opts.baseUrl), { method, headers, body: json === undefined ? undefined : JSON.stringify(json) })
    } catch (err) {
      throw new ReproError(`SUT에 연결할 수 없습니다 (${opts.baseUrl}): ${err.message}`)
    }
    const text = await res.text()
    let body
    try {
      body = text ? JSON.parse(text) : undefined
    } catch {
      body = text
    }
    return { status: res.status, body }
  }

  if (opts.reset) {
    const r = await request('POST', '/__admin/reset')
    if (r.status !== 200) throw new ReproError(`DB 초기화에 실패했습니다 (status ${r.status}). ALLOW_DEV_TOOLS=1 인지 확인하세요.`)
  }

  const vars = {}
  const failures = []
  let token

  for (const [index, rawStep] of repro.steps.entries()) {
    const stepNo = index + 1
    const step = interpolate(rawStep, vars)
    if (step.login) {
      const r = await request('POST', '/api/auth/login', { email: step.login, password: step.password ?? DEFAULT_PASSWORD })
      if (r.status !== 200 || !r.body?.token) {
        failures.push({ step: stepNo, message: `로그인 실패: ${step.login} (status ${r.status})` })
        break
      }
      token = r.body.token
      continue
    }
    if (step.logout) {
      token = undefined
      continue
    }
    if (!step.http) throw new ReproError(`${stepNo}번째 단계의 종류를 알 수 없습니다: ${JSON.stringify(rawStep)}`)

    const { method = 'GET', path, json, headers = {} } = step.http
    if (!path) throw new ReproError(`${stepNo}번째 단계에 http.path 가 없습니다.`)
    const auth = token ? { authorization: `Bearer ${token}` } : {}
    const r = await request(method.toUpperCase(), path, json, { ...auth, ...headers })

    const before = failures.length
    const expect = step.expect ?? {}
    if (expect.status !== undefined && expect.status !== r.status) {
      failures.push({ step: stepNo, message: `${method} ${path}: status 기대 ${expect.status}, 실제 ${r.status}` })
    }
    for (const [p, want] of Object.entries(expect.json ?? {})) {
      const got = getPath(r.body, p)
      if (!sameValue(want, got)) {
        failures.push({ step: stepNo, message: `${method} ${path}: ${p} 기대 ${JSON.stringify(want)}, 실제 ${JSON.stringify(got)}` })
      }
    }
    // 기대가 어긋나면 이후 단계는 전제가 깨졌으므로 멈춘다.
    if (failures.length > before) break
    for (const [name, p] of Object.entries(step.save ?? {})) {
      const value = getPath(r.body, p)
      if (value === undefined) {
        failures.push({ step: stepNo, message: `${method} ${path}: 저장할 값 ${p} 가 응답에 없습니다` })
        break
      }
      vars[name] = value
    }
    if (failures.length > before) break
  }

  return { passed: failures.length === 0, failures }
}
