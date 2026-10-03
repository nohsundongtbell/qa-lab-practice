import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'

/** package-plan.mjs 의 분석 정답. (check/analysis.test.mjs 가 모든 실행 경로를 시뮬레이션해 같은 값이 나오는지 검증한다) */
export const EXPECTED = {
  cyclomatic_complexity: 4,
  du_pairs: {
    fee: ['D1-U1', 'D1-U2', 'D1-U4', 'D3-U2', 'D3-U4', 'D4-U4'],
    days: ['D2-U3', 'D2-U5', 'D5-U5', 'D6-U5'],
  },
}
export const VARIABLE_OF = { D1: 'fee', D3: 'fee', D4: 'fee', D2: 'days', D5: 'days', D6: 'days' }

/** "D1-U1", "D1→U1", "(D1, U1)" 같은 표기를 "D1-U1" 로 통일한다. 쌍으로 읽을 수 없으면 null. */
export function normalizePair(raw) {
  const tokens = String(raw).toUpperCase().match(/[DU]\d+/g)
  if (!tokens || tokens.length !== 2 || tokens[0][0] !== 'D' || tokens[1][0] !== 'U') return null
  return `${tokens[0]}-${tokens[1]}`
}

/** 학습자의 답과 정답을 비교한다. 정답 값 자체는 결과에 담지 않고 개수만 센다. */
export function compareAnalysis(answer) {
  const errors = []
  const cc = answer?.cyclomatic_complexity
  const ccOk = Number.isInteger(cc) && cc === EXPECTED.cyclomatic_complexity
  const ccBlank = cc === null || cc === undefined

  const given = Array.isArray(answer?.du_pairs) ? answer.du_pairs : []
  const seen = new Set()
  const invalid = []
  for (const raw of given) {
    const n = normalizePair(raw)
    if (n) seen.add(n)
    else invalid.push(String(raw))
  }
  if (invalid.length) errors.push(`쌍으로 읽을 수 없는 항목: ${invalid.join(', ')} (형식 예: D1-U1)`)

  const perVar = {}
  for (const [variable, pairs] of Object.entries(EXPECTED.du_pairs)) {
    const expected = new Set(pairs)
    const mine = [...seen].filter((p) => VARIABLE_OF[p.split('-')[0]] === variable)
    perVar[variable] = {
      total: expected.size,
      correct: mine.filter((p) => expected.has(p)).length,
      wrong: mine.filter((p) => !expected.has(p)).length,
    }
  }
  const unknownVar = [...seen].filter((p) => !(p.split('-')[0] in VARIABLE_OF)).length
  const wrongTotal = Object.values(perVar).reduce((n, v) => n + v.wrong, 0) + unknownVar
  const correctTotal = Object.values(perVar).reduce((n, v) => n + v.correct, 0)
  const total = Object.values(perVar).reduce((n, v) => n + v.total, 0)
  return { ccOk, ccBlank, perVar, wrongTotal, correctTotal, total, errors, passed: ccOk && correctTotal === total && wrongTotal === 0 && errors.length === 0 }
}

export function readAnalysis(workDir) {
  const file = path.join(workDir, 't3-analysis.yaml')
  if (!fs.existsSync(file)) return { error: 'work/t3-analysis.yaml 이 없습니다' }
  try {
    return { answer: loadYaml(fs.readFileSync(file, 'utf8')) ?? {} }
  } catch (e) {
    return { error: `t3-analysis.yaml 문법 오류: ${e.message.split('\n')[0]}` }
  }
}
