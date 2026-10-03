// 계약 테스트용 도구. 읽기만 하세요 — 채점기는 항상 이 파일의 원본으로 실행합니다.
//   call(method, path, { token, json })      API 를 호출한다 → { status, body }
//   login(email)                              로그인 토큰을 돌려준다 (비밀번호는 모두 qa-lab-1234)
//   expectMatchesSpec(method, path, res)      응답이 api/openapi.yaml 과 일치하는지 검사한다 (불일치면 예외)
//   specErrors(method, path, res)             같은 검사를 하되 오류 메시지 목록을 돌려준다
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { load as loadYaml } from 'js-yaml'

const BASE_URL = process.env.QA_LAB_BASE_URL ?? 'http://127.0.0.1:3000'
const DEFECTS = process.env.QA_LAB_DEFECTS // 채점기가 정한다. 직접 실행할 때는 비어 있다.

export async function call(method, urlPath, { token, json } = {}) {
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (json !== undefined) headers['content-type'] = 'application/json'
  if (DEFECTS !== undefined) headers['x-qa-lab-defects'] = DEFECTS
  const res = await fetch(new URL(urlPath, BASE_URL), { method, headers, body: json === undefined ? undefined : JSON.stringify(json) })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    body = text
  }
  return { status: res.status, body }
}

export async function login(email, password = 'qa-lab-1234') {
  const res = await call('POST', '/api/auth/login', { json: { email, password } })
  if (res.status !== 200) throw new Error(`로그인 실패: ${email} (status ${res.status})`)
  return res.body.token
}

// ---- 명세 읽기 ------------------------------------------------------------
function findSpec() {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i++, dir = path.dirname(dir)) {
    const file = path.join(dir, 'apps', 'shop', 'api', 'openapi.yaml')
    if (fs.existsSync(file)) return file
  }
  throw new Error('apps/shop/api/openapi.yaml 을 찾지 못했습니다. 저장소 안에서 실행하세요.')
}

const spec = loadYaml(fs.readFileSync(findSpec(), 'utf8'))
const METHODS = ['get', 'post', 'put', 'patch', 'delete']
const operations = Object.entries(spec.paths).flatMap(([template, item]) =>
  METHODS.filter((m) => item[m]).map((m) => ({
    method: m.toUpperCase(),
    template,
    op: item[m],
    regex: new RegExp(`^${template.split(/(\{[^}]+\})/).map((p) => (p.startsWith('{') ? '[^/]+' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')}/?$`),
  })),
)

const ajv = new Ajv2020({ strict: false, allErrors: true })
ajv.addFormat('date', /^\d{4}-\d{2}-\d{2}$/)
ajv.addFormat('date-time', (s) => !Number.isNaN(Date.parse(s)))
ajv.addFormat('email', /^[^@\s]+@[^@\s]+$/)
ajv.addSchema({ $id: 'spec', components: spec.components })
const validators = new Map()

function resolveResponse(response) {
  if (!response?.$ref) return response
  return response.$ref.replace('#/', '').split('/').reduce((o, k) => o[k], spec)
}

function schemaValidator(key, schema) {
  if (!validators.has(key)) validators.set(key, ajv.compile(JSON.parse(JSON.stringify(schema).replaceAll('"#/components/', '"spec#/components/'))))
  return validators.get(key)
}

export function specErrors(method, urlPath, res) {
  const pathname = urlPath.split('?')[0]
  const found = operations.find((o) => o.method === method.toUpperCase() && o.regex.test(pathname))
  if (!found) return [`명세에 없는 오퍼레이션입니다: ${method} ${pathname}`]
  const documented = found.op.responses[String(res.status)]
  if (!documented) return [`${found.method} ${found.template}: 명세에 없는 상태 코드입니다 (문서에 있는 것: ${Object.keys(found.op.responses).join(', ')})`]
  const schema = resolveResponse(documented).content?.['application/json']?.schema
  if (!schema) return []
  const validate = schemaValidator(`${found.method} ${found.template} ${res.status}`, schema)
  if (validate(res.body)) return []
  return validate.errors.map((e) => `${found.method} ${found.template} ${res.status}: ${e.instancePath || '(본문 전체)'} ${e.message}`)
}

export function expectMatchesSpec(method, urlPath, res) {
  const errors = specErrors(method, urlPath, res)
  if (errors.length) throw new Error(`응답이 명세와 다릅니다:\n  - ${errors.join('\n  - ')}`)
}
