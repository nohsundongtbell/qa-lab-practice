import { LEVELS, PLATFORMS, PROFILES, STATUSES } from './constants.mjs'
import { findLesson, findModule, labIneligibleReason } from './snapshot.mjs'

const TOP_LEVEL_KEYS = new Set([
  'module', 'lessons', 'also_for', 'title_ko', 'level', 'est_minutes', 'requires',
  'platforms', 'notes', 'tools', 'sut_profile', 'tasks', 'status', 'setup',
])
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== ''
const isStringArray = (v) => Array.isArray(v) && v.every(isNonEmptyString)

/** check 항목을 [{ platform: 'any'|'unix'|'windows', file }] 로 펼친다. 형식이 틀리면 null. */
export function checkFiles(check) {
  if (typeof check === 'string') return [{ platform: 'any', file: check }]
  if (check && typeof check === 'object' && isNonEmptyString(check.unix) && isNonEmptyString(check.windows)) {
    return [{ platform: 'unix', file: check.unix }, { platform: 'windows', file: check.windows }]
  }
  return null
}

/**
 * lab.yaml 한 개를 검증한다 (파일 시스템은 보지 않는다).
 * @param {unknown} data 파싱된 YAML
 * @param {object} snapshot QA-Lab 스냅샷
 * @param {{ moduleDir?: string, labSlug?: string }} [where] 디렉터리 이름과의 일치 검사용
 * @returns {string[]} 오류 메시지 (비어 있으면 통과)
 */
export function validateLabData(data, snapshot, where = {}) {
  const errors = []
  const err = (m) => errors.push(m)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['lab.yaml 의 최상위가 객체(매핑)가 아닙니다.']

  for (const key of Object.keys(data)) {
    if (!TOP_LEVEL_KEYS.has(key)) err(`알 수 없는 필드입니다: ${key} (오타인지 확인하세요)`)
  }

  // module / lessons / also_for — QA-Lab 스냅샷에 실제로 있어야 한다
  if (!isNonEmptyString(data.module)) err('module 은 필수이며 QA-Lab 모듈 slug 여야 합니다.')
  else if (!findModule(snapshot, data.module)) err(`module "${data.module}" 이(가) QA-Lab 스냅샷에 없습니다.`)
  else {
    const reason = labIneligibleReason(snapshot, data.module)
    if (reason) err(`module "${data.module}": ${reason}`)
    if (where.moduleDir && where.moduleDir !== data.module) {
      err(`폴더 이름(labs/${where.moduleDir}/…)과 module "${data.module}" 이(가) 다릅니다.`)
    }
  }
  if (where.labSlug && !KEBAB.test(where.labSlug)) err(`랩 폴더 이름은 소문자·숫자·하이픈이어야 합니다: ${where.labSlug}`)

  const checkLessons = (moduleSlug, lessons, label) => {
    if (!isStringArray(lessons)) return err(`${label} 는 레슨 slug 문자열의 목록이어야 합니다.`)
    if (new Set(lessons).size !== lessons.length) err(`${label} 에 중복된 slug 가 있습니다.`)
    if (!findModule(snapshot, moduleSlug)) return
    for (const l of lessons) {
      if (!findLesson(snapshot, moduleSlug, l)) err(`${label}: 레슨 "${moduleSlug}/${l}" 이(가) QA-Lab 스냅샷에 없습니다.`)
    }
  }
  if (data.lessons !== undefined) checkLessons(data.module, data.lessons, 'lessons')
  if (data.also_for !== undefined) {
    if (!Array.isArray(data.also_for)) err('also_for 는 [{ module, lessons }] 목록이어야 합니다.')
    else {
      data.also_for.forEach((entry, i) => {
        const label = `also_for[${i}]`
        if (!entry || !isNonEmptyString(entry.module)) return err(`${label}.module 이 필요합니다.`)
        if (!findModule(snapshot, entry.module)) return err(`${label}.module "${entry.module}" 이(가) QA-Lab 스냅샷에 없습니다.`)
        const reason = labIneligibleReason(snapshot, entry.module)
        if (reason) err(`${label}.module "${entry.module}": ${reason}`)
        if (entry.module === data.module) err(`${label}.module 이 주 module 과 같습니다.`)
        checkLessons(entry.module, entry.lessons ?? [], `${label}.lessons`)
      })
    }
  }

  if (!isNonEmptyString(data.title_ko)) err('title_ko 는 필수입니다 (랩 제목, 모듈 설명 복사 금지).')
  if (!(data.level in LEVELS)) err(`level 은 ${Object.keys(LEVELS).join(' | ')} 중 하나여야 합니다.`)
  if (!Number.isInteger(data.est_minutes) || data.est_minutes <= 0) err('est_minutes 는 1 이상의 정수(분)여야 합니다.')
  if (!isStringArray(data.requires) || data.requires.length === 0) err('requires 는 비어 있지 않은 문자열 목록이어야 합니다 (예: [docker, node24]).')
  if (!(data.status && STATUSES.includes(data.status))) err(`status 는 ${STATUSES.join(' | ')} 중 하나여야 합니다.`)
  if (![...PROFILES, 'any'].includes(data.sut_profile)) err(`sut_profile 은 ${[...PROFILES, 'any'].join(' | ')} 중 하나여야 합니다 (any = 앱의 결함 프로필과 무관한 랩).`)

  if (!Array.isArray(data.platforms) || data.platforms.length === 0 || !data.platforms.every((p) => PLATFORMS.includes(p))) {
    err(`platforms 는 ${PLATFORMS.join(', ')} 중에서 고른 비어 있지 않은 목록이어야 합니다.`)
  } else if (data.platforms.length < PLATFORMS.length && !isNonEmptyString(data.notes)) {
    err('일부 OS 만 지원하면 notes 에 사유와 대안을 적어야 합니다.')
  }
  if (data.notes !== undefined && typeof data.notes !== 'string') err('notes 는 문자열이어야 합니다.')
  if (data.tools !== undefined && !isStringArray(data.tools)) err('tools 는 문자열 목록이어야 합니다.')
  if (data.setup !== undefined && (!isNonEmptyString(data.setup) || !data.setup.endsWith('.mjs'))) err('setup 은 랩 폴더 기준 Node 스크립트 경로(.mjs)여야 합니다 (예: setup/seed.mjs).')

  if (!Array.isArray(data.tasks) || data.tasks.length === 0) err('tasks 는 비어 있지 않은 목록이어야 합니다.')
  else {
    const seen = new Set()
    data.tasks.forEach((t, i) => {
      const label = `tasks[${i}]`
      if (!t || typeof t !== 'object') return err(`${label} 는 객체여야 합니다.`)
      if (!/^t\d+$/.test(t.id ?? '')) err(`${label}.id 는 t1, t2 … 형식이어야 합니다.`)
      else if (seen.has(t.id)) err(`${label}.id "${t.id}" 이(가) 중복됩니다.`)
      else seen.add(t.id)
      if (!isNonEmptyString(t.goal)) err(`${label}.goal 이 필요합니다 (행동 동사로 시작).`)
      const files = checkFiles(t.check)
      if (!files) err(`${label}.check 는 "check/t1.mjs" 문자열이거나 { unix, windows } 쌍이어야 합니다.`)
      else if (files[0].platform === 'any' && !files[0].file.endsWith('.mjs')) {
        err(`${label}.check "${files[0].file}": 단일 check 는 OS 공통인 Node(.mjs) 스크립트여야 합니다. 셸이 필요하면 { unix: ….sh, windows: ….ps1 } 쌍으로 쓰세요.`)
      } else if (files[0].platform === 'unix') {
        if (!files[0].file.endsWith('.sh')) err(`${label}.check.unix 는 .sh 파일이어야 합니다.`)
        if (!files[1].file.endsWith('.ps1')) err(`${label}.check.windows 는 .ps1 파일이어야 합니다.`)
      }
      if (t.pass !== undefined) {
        if (!t.pass || typeof t.pass !== 'object' || Array.isArray(t.pass)) err(`${label}.pass 는 객체여야 합니다.`)
        else {
          const { min_defects: minD, max_cases: maxC, beyond_profile: beyond, min_killed: minK, min_line_pct: minL, min_branch_pct: minB, min_operations: minO, min_statuses: minS, min_correct: minC, min_assertions: minA, min_tests: minT, repeat: rep, variants: vars, latency: lat, max_missed_tp: maxMiss, users: usr, duration_s: dur, min_requests: minR, ...rest } = t.pass
          if (minD !== undefined && (!Number.isInteger(minD) || minD < 0)) err(`${label}.pass.min_defects 는 0 이상의 정수여야 합니다.`)
          if (maxC !== undefined && (!Number.isInteger(maxC) || maxC < 1)) err(`${label}.pass.max_cases 는 1 이상의 정수여야 합니다.`)
          if (minK !== undefined && (!Number.isInteger(minK) || minK < 0)) err(`${label}.pass.min_killed 는 0 이상의 정수여야 합니다.`)
          for (const [key, v] of [['min_line_pct', minL], ['min_branch_pct', minB]]) {
            if (v !== undefined && (typeof v !== 'number' || v < 0 || v > 100)) err(`${label}.pass.${key} 는 0~100 사이의 숫자여야 합니다.`)
          }
          for (const [key, v] of [['min_operations', minO], ['min_statuses', minS], ['min_correct', minC], ['min_assertions', minA], ['min_tests', minT], ['max_missed_tp', maxMiss], ['users', usr], ['duration_s', dur], ['min_requests', minR]]) {
            if (v !== undefined && (!Number.isInteger(v) || v < 0)) err(`${label}.pass.${key} 는 0 이상의 정수여야 합니다.`)
          }
          if (rep !== undefined && (!Number.isInteger(rep) || rep < 1 || rep > 50)) err(`${label}.pass.repeat 는 1~50 사이의 정수여야 합니다.`)
          if (vars !== undefined && (!Array.isArray(vars) || vars.length === 0 || vars.some((v) => !['v1', 'v2'].includes(v)))) err(`${label}.pass.variants 는 [v1, v2] 중에서 고른 목록이어야 합니다.`)
          if (lat !== undefined && !['none', 'slow', 'unstable'].includes(lat)) err(`${label}.pass.latency 는 none | slow | unstable 중 하나여야 합니다.`)
          if (beyond !== undefined && !PROFILES.includes(beyond)) err(`${label}.pass.beyond_profile 은 ${PROFILES.join(' | ')} 중 하나여야 합니다.`)
          for (const key of Object.keys(rest)) err(`${label}.pass: 알 수 없는 기준입니다: ${key} (min_defects, max_cases, beyond_profile, min_killed, min_line_pct, min_branch_pct, min_operations, min_statuses, min_correct, min_assertions, min_tests, repeat, variants, latency, max_missed_tp, users, duration_s, min_requests)`)
        }
      }
      for (const key of Object.keys(t)) {
        if (!['id', 'goal', 'check', 'pass'].includes(key)) err(`${label}: 알 수 없는 필드입니다: ${key}`)
      }
    })
  }
  return errors
}
