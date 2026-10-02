import fs from 'node:fs'
import { load as loadYaml } from 'js-yaml'
import { Ajv2020 } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

/**
 * openapi.yaml 을 기준으로 응답 본문을 검증한다 (spec-first 계약 검증).
 */
const doc = loadYaml(fs.readFileSync(new URL('../../openapi.yaml', import.meta.url), 'utf8')) as any
const ajv = new Ajv2020({ strict: false, allErrors: true })
;(addFormats as unknown as (a: Ajv2020) => void)(ajv)
ajv.addSchema(doc, 'openapi.json')

const escape = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1')

export function validateResponse(method: string, pathTemplate: string, status: number, body: unknown): string[] {
  const op = doc.paths?.[pathTemplate]?.[method.toLowerCase()]
  if (!op) return [`openapi.yaml 에 ${method} ${pathTemplate} 가 없습니다`]
  let response = op.responses?.[String(status)]
  if (!response) return [`openapi.yaml 에 ${method} ${pathTemplate} 의 ${status} 응답이 정의되어 있지 않습니다`]
  let pointer = `#/paths/${escape(pathTemplate)}/${method.toLowerCase()}/responses/${status}`
  if (response.$ref) {
    pointer = response.$ref
    response = response.$ref.split('/').slice(1).reduce((o: any, k: string) => o[k], doc)
  }
  const media = response.content?.['application/json']
  if (!media) return body === undefined || body === '' ? [] : ['본문이 없어야 하는 응답에 본문이 있습니다']
  const validate = ajv.getSchema(`openapi.json${pointer}/content/application~1json/schema`)
  if (!validate) return [`스키마를 찾을 수 없습니다: ${pointer}`]
  return validate(body) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`)
}
