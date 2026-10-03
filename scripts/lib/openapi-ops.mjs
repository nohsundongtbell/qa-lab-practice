import fs from 'node:fs'
import { load as loadYaml } from 'js-yaml'

/** OpenAPI 명세에서 오퍼레이션(메서드 + 경로 템플릿) 목록을 만든다. */
export function loadSpec(file) {
  return loadYaml(fs.readFileSync(file, 'utf8'))
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete']

/** @returns {Array<{ key: string, method: string, template: string, regex: RegExp, statuses: number[], secured: boolean }>} */
export function listOperations(spec) {
  const ops = []
  for (const [template, item] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS) {
      const op = item[method]
      if (!op) continue
      const pattern = template
        .split(/(\{[^}]+\})/)
        .map((part) => (part.startsWith('{') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('')
      ops.push({
        key: `${method.toUpperCase()} ${template}`,
        method: method.toUpperCase(),
        template,
        regex: new RegExp(`^${pattern}/?$`),
        statuses: Object.keys(op.responses ?? {}).map(Number).filter(Number.isInteger),
        secured: (op.security ?? spec.security ?? []).length > 0,
      })
    }
  }
  return ops
}

export function matchOperation(ops, method, pathname) {
  return ops.find((o) => o.method === method.toUpperCase() && o.regex.test(pathname))
}

/**
 * 실제로 주고받은 요청 목록으로 커버리지를 계산한다.
 * - operations: 한 번이라도 호출한 오퍼레이션
 * - statuses: 문서에 적힌 상태 코드를 실제로 받아 본 (오퍼레이션, 상태 코드) 쌍
 * 명세에 없는 경로·상태 코드는 세지 않는다.
 */
export function coverageOf(ops, executions) {
  const operations = new Set()
  const statuses = new Set()
  for (const e of executions) {
    const op = matchOperation(ops, e.method, e.path)
    if (!op) continue
    operations.add(op.key)
    if (op.statuses.includes(e.status)) statuses.add(`${op.key} ${e.status}`)
  }
  return {
    operations,
    statuses,
    totalOperations: ops.length,
    totalStatuses: ops.reduce((n, o) => n + o.statuses.length, 0),
    uncoveredOperations: ops.filter((o) => !operations.has(o.key)).map((o) => o.key),
  }
}
