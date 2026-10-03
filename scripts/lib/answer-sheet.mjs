import fs from 'node:fs'
import { load as loadYaml } from 'js-yaml'

export class SheetError extends Error {}

/** 답안 파일(YAML 최상위 객체)을 읽는다. 형식이 틀리면 SheetError (한국어). */
export function readSheet(file, name) {
  if (!fs.existsSync(file)) throw new SheetError(`${name} 이 없습니다.`)
  let data
  try {
    data = loadYaml(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new SheetError(`${name} 의 YAML 문법 오류: ${e.message.split('\n')[0]}`)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new SheetError(`${name} 은 "질문id: 답" 형식이어야 합니다.`)
  return data
}

const text = (v) => String(v ?? '').trim()

/**
 * 답 하나를 비교한다. 정답 값은 돌려주지 않는다 (맞았는지만).
 * kind: 'text' 정확히 같은 글자 · 'number' 숫자(tol 허용 오차) · 'set' 순서 무관 목록
 */
export function isCorrect({ kind, tol = 0 }, expected, actual) {
  if (actual === null || actual === undefined || actual === '') return false
  if (kind === 'number') return typeof actual === 'number' && Math.abs(actual - expected) <= tol
  if (kind === 'set') {
    if (!Array.isArray(actual)) return false
    const a = [...new Set(actual.map(text))].sort()
    const e = [...new Set(expected.map(text))].sort()
    return a.length === e.length && a.every((v, i) => v === e[i])
  }
  return text(actual) === text(expected)
}

/** @returns {{ results: Array<{ id: string, ok: boolean }>, correct: number, unknown: string[] }} */
export function gradeSheet(data, spec, expected) {
  const results = spec.map((q) => ({ id: q.id, ok: isCorrect(q, expected[q.id], data[q.id]) }))
  const known = new Set(spec.map((q) => q.id))
  return { results, correct: results.filter((r) => r.ok).length, unknown: Object.keys(data).filter((k) => !known.has(k)) }
}

/** 채점 출력용: 맞음/다름만. 정답은 알려 주지 않는다. */
export function formatSheet({ results, unknown }) {
  const lines = results.map((r) => `  ${r.ok ? '[맞음]' : '[다름]'} ${r.id}`)
  if (unknown.length) lines.push(`  [무시] 알 수 없는 항목: ${unknown.join(', ')} (오타가 아닌지 확인하세요)`)
  return lines
}
