import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { checkEnv } from './check-kit.mjs'
import { profileDefects } from './defects.mjs'
import { formatFailure } from './repro-runner.mjs'

/**
 * 랩 채점 스크립트의 공통 문맥: 환경 변수, lab.yaml, 이 과제의 정의와 통과 기준, 랩 결함 집합.
 * 통과 기준(pass)은 lab.yaml 한 곳에만 두고 여기서 읽는다.
 */
export function loadLabContext(env = process.env) {
  const e = checkEnv(env)
  const lab = loadYaml(fs.readFileSync(path.join(e.labDir, 'lab.yaml'), 'utf8'))
  const task = lab.tasks.find((t) => t.id === e.taskId)
  if (!task) throw new Error(`lab.yaml 에 과제 ${e.taskId} 가 없습니다.`)
  return { ...e, lab, task, pass: task.pass ?? {}, defectIds: lab.sut_profile === 'any' ? [] : profileDefects(e.repoRoot, lab.sut_profile) }
}

const STATUS_TAG = { detected: '[검출]', undetected: '[미검출]', invalid: '[무효]', error: '[오류]' }

/** 채점 결과 한 줄. 무효 케이스는 실제 값을 숨겨, 오라클이 정답을 대신 알려 주지 않게 한다. */
export function formatCaseResult(r) {
  const tag = STATUS_TAG[r.status]
  if (r.status === 'detected') {
    return `  ${tag} ${r.label}${r.defects.length ? ` → 결함 ${r.defects.length}개 (${r.defects.join(', ')})` : ' → 여러 결함이 겹칠 때만 재현됨'}`
  }
  if (r.status === 'invalid') {
    const why = (r.failures ?? []).map((f) => formatFailure(f, { hideActual: true })).join('; ')
    return `  ${tag} ${r.label} → 결함이 없는 버전에서도 기대와 다릅니다: ${why}`
  }
  if (r.status === 'error') return `  ${tag} ${r.label} → ${r.error}`
  return `  ${tag} ${r.label}`
}

/** 통과 기준에 셈하는 결함. beyond_profile 이면 그 프로필에 이미 있는 결함은 뺀다. */
export function countedDefects(detected, pass, repoRoot) {
  return pass.beyond_profile ? [...detected].filter((id) => !profileDefects(repoRoot, pass.beyond_profile).includes(id)) : [...detected]
}

/**
 * 통과 판정.
 * - 무효·오류 케이스가 없어야 한다 (기대값이 사양과 다른 테스트는 나쁜 테스트다)
 * - 케이스 수 1개 이상, max_cases 이하
 * - 서로 다른 결함 min_defects 개 이상 (beyond_profile 이면 그 프로필에 없는 결함만 센다)
 */
export function evaluatePass({ results, detected }, pass, { repoRoot, noun = '케이스' } = {}) {
  const reasons = []
  const counted = countedDefects(detected, pass, repoRoot)
  const invalid = results.filter((r) => r.status === 'invalid').length
  const errors = results.filter((r) => r.status === 'error').length
  if (results.length === 0) reasons.push(`제출한 ${noun}가 없습니다`)
  if (pass.max_cases !== undefined && results.length > pass.max_cases) reasons.push(`${noun}가 ${results.length}개로 상한 ${pass.max_cases}개를 넘습니다 — 기법으로 줄여 보세요`)
  if (invalid) reasons.push(`무효 ${noun} ${invalid}개 — 기대값을 사양에 맞게 고치세요`)
  if (errors) reasons.push(`형식 오류 ${noun} ${errors}개`)
  const min = pass.min_defects ?? 0
  const label = pass.beyond_profile ? `${pass.beyond_profile} 수준을 넘는 서로 다른 결함` : '서로 다른 결함'
  if (counted.length < min) reasons.push(`${label} ${counted.length}개 검출 (기준 ${min}개 이상)`)
  return {
    passed: reasons.length === 0,
    counted,
    summary: `${label} ${counted.length}개 검출 (기준 ${min}개 이상), ${noun} ${results.length}개${pass.max_cases ? ` (상한 ${pass.max_cases})` : ''}`,
    reasons,
  }
}

/** ```repro 블록 내용(YAML)을 재현 절차로. 형식이 틀리면 { error } */
export function reproFromBlock(content) {
  if (content.trim() === '') return { error: 'repro 블록이 비어 있습니다. steps: 목록을 쓰세요 (docs/REPRO_DSL.md)' }
  let data
  try {
    data = loadYaml(content)
  } catch (e) {
    return { error: `repro 블록의 YAML 문법 오류: ${e.message.split('\n')[0]}` }
  }
  if (!data || !Array.isArray(data.steps) || data.steps.length === 0) {
    return { error: 'repro 블록에는 steps: 목록이 있어야 합니다 (docs/REPRO_DSL.md)' }
  }
  return { repro: { steps: data.steps } }
}
