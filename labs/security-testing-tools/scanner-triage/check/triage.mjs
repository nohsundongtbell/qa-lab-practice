import { expectedVerdict } from './report-gen.mjs'

export const VERDICTS = ['TP', 'FP', 'DUP']

/**
 * 학습자 분류표 형식 검사. rows: [{ id, verdict, duplicate_of }]
 * @returns {{ problems: string[], byId: Map<string, { verdict: string, duplicateOf: string }> }}
 */
export function parseTriage(rows, ids) {
  const problems = []
  const byId = new Map()
  const known = new Set(ids)
  rows.forEach((r, i) => {
    const line = i + 2
    const id = String(r.id ?? '').trim()
    const verdict = String(r.verdict ?? '').trim().toUpperCase()
    const duplicateOf = String(r.duplicate_of ?? '').trim()
    if (!known.has(id)) return problems.push(`${line}행: 리포트에 없는 id 입니다: ${id || '(빈 값)'}`)
    if (byId.has(id)) return problems.push(`${line}행: ${id} 가 두 번 나옵니다`)
    if (!VERDICTS.includes(verdict)) return problems.push(`${line}행: ${id} 의 verdict 는 TP, FP, DUP 중 하나여야 합니다${verdict ? ` (지금: ${verdict})` : ' (비어 있음)'}`)
    if (verdict === 'DUP') {
      if (!known.has(duplicateOf)) return problems.push(`${line}행: ${id} 는 DUP 인데 duplicate_of 에 리포트의 id 가 없습니다`)
      if (duplicateOf === id) return problems.push(`${line}행: ${id} 가 자기 자신의 중복으로 적혀 있습니다`)
    }
    byId.set(id, { verdict, duplicateOf })
  })
  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length && problems.length === 0) problems.push(`분류하지 않은 항목이 ${missing.length}개 있습니다 (예: ${missing.slice(0, 3).join(', ')})`)
  return { problems, byId }
}

/**
 * 채점. 결과는 **집계만** 돌려준다 — 어떤 id 가 틀렸는지 알려 주면 하나씩 바꿔 보며 정답을 맞힐 수 있다.
 * missedTp: 진짜 취약점(그룹의 대표 항목이 TP)을 TP 로 판정하지 않은 수.
 */
export function gradeTriage(byId, key) {
  const c = { correct: 0, total: key.size, missedTp: 0, fpAsTp: 0, missedDup: 0, falseDup: 0, wrongDupTarget: 0 }
  for (const [id, k] of key) {
    const want = expectedVerdict(key, id)
    const got = byId.get(id)
    if (want === 'DUP') {
      if (got.verdict !== 'DUP') c.missedDup++
      else if (key.get(got.duplicateOf)?.group !== k.group) c.wrongDupTarget++
      else c.correct++
      continue
    }
    if (got.verdict === want) {
      c.correct++
      continue
    }
    if (got.verdict === 'DUP') c.falseDup++
    else if (want === 'FP') c.fpAsTp++
    if (want === 'TP') c.missedTp++
  }
  return c
}

export function formatGrade(c) {
  return [
    `  정답 ${c.correct}/${c.total}`,
    `  진짜 취약점을 놓침(TP 를 FP·DUP 로): ${c.missedTp}건`,
    `  오탐을 진짜로 봄(FP 를 TP 로): ${c.fpAsTp}건`,
    `  중복을 못 찾음(DUP 여야 하는데 TP·FP 로): ${c.missedDup}건`,
    `  중복이 아닌데 DUP 로: ${c.falseDup}건`,
    `  DUP 인데 다른 문제를 가리킴: ${c.wrongDupTarget}건`,
  ]
}
