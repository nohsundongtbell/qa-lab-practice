import { CATEGORIES, CHECKS, KEYBOARD_TRUTH, PAGES, REPORT_TRUTH, SEVERITIES, TRIAGE_TRUTH } from './a11y-truth.mjs'

/**
 * 접근성 랩 채점 로직 (순수 함수). 파일 읽기·출력은 t1~t4.mjs 가 한다.
 * 결과는 집계 위주로 돌려준다 — 어느 항목이 어떤 분류여야 하는지 알려 주면 하나씩 바꿔 보며 맞힐 수 있다.
 */

const norm = (v) => String(v ?? '').trim()
const at = (r, i) => `${r._line ?? i + 2}번째 줄`

// ---------------------------------------------------------------------------
// t1: 스캔 스펙 정적 규칙
// ---------------------------------------------------------------------------

/**
 * 학습자 스캔 스펙의 정적 문제. 결함 켜짐 여부를 앱에서 직접 읽어 실패하는 식의 우회를 막는다.
 * @param {string[]} sources 테스트 파일 내용
 */
export function scanSpecProblems(sources) {
  const all = sources.join('\n')
  const problems = []
  if (!/@axe-core\/playwright/.test(all) || !/\bAxeBuilder\b/.test(all)) problems.push('@axe-core/playwright 의 AxeBuilder 로 화면을 분석하지 않았습니다')
  if (/__qa\/|webDefects|x-qa-lab-defects/i.test(all)) problems.push('결함 설정(/__qa/environment, webDefects, X-QA-Lab-Defects)을 테스트에서 읽거나 바꾸면 안 됩니다 — 화면을 분석한 결과로만 판정하세요')
  return problems
}

// ---------------------------------------------------------------------------
// t2: axe 결과 분류표 (triage.csv: page,rule,target,category,reason)
// ---------------------------------------------------------------------------

export const TRIAGE_COLUMNS = ['page', 'rule', 'target', 'category', 'reason']

/** 형식 검사. @returns {{ problems: string[], rows: Array<{ line: number, page: string, rule: string, target: string, category: string }> }} */
export function parseTriage(rows) {
  const problems = []
  const out = []
  rows.forEach((r, i) => {
    const row = { line: r._line ?? i + 2, page: norm(r.page), rule: norm(r.rule), target: norm(r.target), category: norm(r.category).toLowerCase(), reason: norm(r.reason) }
    if (!row.page && !row.rule && !row.target && !row.category && !row.reason) return // 빈 줄
    if (!PAGES.includes(row.page)) return problems.push(`${at(r, i)}: page 는 ${PAGES.join(', ')} 중 하나여야 합니다${row.page ? ` (지금: ${row.page})` : ' (비어 있음)'}`)
    if (!/^[a-z0-9-]+$/.test(row.rule)) return problems.push(`${at(r, i)}: rule 에는 axe 규칙 id(예: image-alt)를 적습니다${row.rule ? ` (지금: ${row.rule})` : ' (비어 있음)'}`)
    if (!row.target) return problems.push(`${at(r, i)}: target 에 axe 가 알려 준 요소 선택자를 적으세요`)
    if (!CATEGORIES.includes(row.category)) return problems.push(`${at(r, i)}: category 는 ${CATEGORIES.join(', ')} 중 하나여야 합니다${row.category ? ` (지금: ${row.category})` : ' (비어 있음)'}`)
    if (!row.reason) return problems.push(`${at(r, i)}: reason 에 그렇게 분류한 근거(사양서 절, 직접 확인한 내용)를 적으세요`)
    out.push(row)
  })
  if (out.length === 0 && problems.length === 0) problems.push('분류한 행이 없습니다. 스캔 결과(work/results/)의 위반·확인 필요 항목을 한 줄씩 옮겨 적으세요')
  return { problems, rows: out }
}

/** 학습자 행이 가리키는 정답 항목 (없으면 undefined) */
export function triageKeyOf(row, truth = TRIAGE_TRUTH) {
  return truth.find((t) => t.rule === row.rule && (!t.target || t.target(row.target)))?.key
}

/**
 * 채점. score = 맞은 항목 수 − 오탐을 violation 으로 분류한 항목 수(감점).
 * @returns {{ total: number, correct: number, missing: number, inconsistent: number, fpAsViolation: number, wrong: number, unknownRows: number[], score: number }}
 */
export function gradeTriage(rows, truth = TRIAGE_TRUTH) {
  const byKey = new Map()
  const unknownRows = []
  for (const r of rows) {
    const key = triageKeyOf(r, truth)
    if (!key) {
      unknownRows.push(r.line)
      continue
    }
    if (!byKey.has(key)) byKey.set(key, new Set())
    byKey.get(key).add(r.category)
  }
  const c = { total: truth.length, correct: 0, missing: 0, inconsistent: 0, fpAsViolation: 0, wrong: 0, unknownRows, score: 0 }
  for (const t of truth) {
    const got = byKey.get(t.key)
    if (!got) c.missing++
    else if (got.size > 1) {
      c.inconsistent++
      if (t.category === 'false-positive' && got.has('violation')) c.fpAsViolation++
    } else {
      const [category] = got
      if (category === t.category) c.correct++
      else {
        c.wrong++
        if (t.category === 'false-positive' && category === 'violation') c.fpAsViolation++
      }
    }
  }
  c.score = c.correct - c.fpAsViolation
  return c
}

export function formatTriage(c) {
  return [
    `  맞게 분류한 항목 ${c.correct}/${c.total}`,
    `  오탐을 violation 으로 분류(감점): ${c.fpAsViolation}건`,
    `  분류가 다른 항목: ${c.wrong}건, 화면마다 분류가 엇갈린 항목: ${c.inconsistent}건, 분류하지 않은 항목: ${c.missing}건`,
    `  점수 = 맞은 항목 − 감점 = ${c.score}`,
    ...(c.unknownRows.length ? [`  (참고) 이 랩의 기준 스캔에 없는 항목 ${c.unknownRows.length}줄: ${c.unknownRows.slice(0, 5).join(', ')}번째 줄 — 화면 v1·결함 프로필 advanced 로 스캔했는지 확인하세요`] : []),
  ]
}

// ---------------------------------------------------------------------------
// t3: 키보드 점검 체크리스트 (keyboard-checklist.csv: page,check,result,note)
// ---------------------------------------------------------------------------

export const CHECKLIST_COLUMNS = ['page', 'check', 'result', 'note']
const RESULTS = ['pass', 'fail', 'na']

/** 형식 검사. 화면×항목 칸이 모두 한 번씩 있어야 한다. @returns {{ problems: string[], cells: Map<string, string> }} */
export function parseChecklist(rows) {
  const problems = []
  const cells = new Map()
  rows.forEach((r, i) => {
    const page = norm(r.page)
    const check = norm(r.check).toUpperCase()
    const result = norm(r.result).toLowerCase()
    if (!page && !check && !result && !norm(r.note)) return
    if (!PAGES.includes(page)) return problems.push(`${at(r, i)}: page 는 ${PAGES.join(', ')} 중 하나여야 합니다`)
    if (!CHECKS.includes(check)) return problems.push(`${at(r, i)}: check 는 ${CHECKS.join(', ')} 중 하나여야 합니다`)
    const key = `${page}/${check}`
    if (cells.has(key)) return problems.push(`${at(r, i)}: ${key} 가 두 번 나옵니다`)
    if (!RESULTS.includes(result)) return problems.push(`${at(r, i)}: ${key} 의 result 는 pass, fail, na 중 하나여야 합니다${result ? ` (지금: ${result})` : ' (비어 있음)'}`)
    if (result === 'fail' && norm(r.note).length < 5) return problems.push(`${at(r, i)}: ${key} 가 fail 이면 note 에 무엇을 눌렀고 어떻게 됐는지 적으세요`)
    cells.set(key, result)
  })
  const missing = PAGES.flatMap((p) => CHECKS.map((c) => `${p}/${c}`)).filter((k) => !cells.has(k))
  if (missing.length && problems.length === 0) problems.push(`채우지 않은 칸이 ${missing.length}개 있습니다 (예: ${missing.slice(0, 3).join(', ')})`)
  return { problems, cells }
}

/**
 * 채점. 결함은 그 결함의 칸 중 하나라도 fail 이면 검출. 정답이 pass 인 칸을 fail 로 적으면 거짓 보고.
 * @returns {{ detected: string[], falseReports: number }}
 */
export function gradeChecklist(cells, truth = KEYBOARD_TRUTH) {
  const key = ([p, c]) => `${p}/${c}`
  const failing = new Set()
  const excused = new Set()
  for (const t of truth) {
    for (const cell of t.cells) failing.add(key(cell))
    for (const cell of t.ambiguous) excused.add(key(cell))
  }
  const detected = truth.filter((t) => t.cells.some((cell) => cells.get(key(cell)) === 'fail')).map((t) => t.defect)
  let falseReports = 0
  for (const [k, result] of cells) if (result === 'fail' && !failing.has(k) && !excused.has(k)) falseReports++
  return { detected, falseReports }
}

// ---------------------------------------------------------------------------
// t4: KWCAG 매핑 보고서 (report.csv: source,ref,page,kwcag,severity,summary)
// ---------------------------------------------------------------------------

export const REPORT_COLUMNS = ['source', 'ref', 'page', 'kwcag', 'severity', 'summary']

/** "1.1.1 적절한 대체 텍스트 제공" → "1.1.1" */
export const kwcagNumber = (v) => /\b(\d\.\d\.\d)\b/.exec(norm(v))?.[1] ?? ''

/** 형식 검사. @returns {{ problems: string[], rows: Array<{ line: number, source: string, ref: string, page: string, kwcag: string, severity: string }> }} */
export function parseReport(rows) {
  const problems = []
  const out = []
  rows.forEach((r, i) => {
    const row = { line: r._line ?? i + 2, source: norm(r.source).toLowerCase(), ref: norm(r.ref), page: norm(r.page), kwcag: kwcagNumber(r.kwcag), severity: norm(r.severity), summary: norm(r.summary) }
    if (!row.source && !row.ref && !norm(r.kwcag) && !row.severity && !row.summary) return
    if (!['axe', 'keyboard'].includes(row.source)) return problems.push(`${at(r, i)}: source 는 axe 또는 keyboard 여야 합니다`)
    if (row.source === 'keyboard') row.ref = row.ref.toUpperCase()
    if (!row.ref) return problems.push(`${at(r, i)}: ref 에 axe 규칙 id 또는 키보드 점검 항목(K1~K4)을 적으세요`)
    if (row.page && !PAGES.includes(row.page)) return problems.push(`${at(r, i)}: page 는 ${PAGES.join(', ')} 중 하나여야 합니다`)
    if (!row.kwcag) return problems.push(`${at(r, i)}: KWCAG 매핑이 없습니다 — kwcag 에 검사항목 번호(예: 0.0.0 형식)를 적으세요`)
    if (!SEVERITIES.includes(row.severity)) return problems.push(`${at(r, i)}: severity 는 ${SEVERITIES.join(', ')} 중 하나여야 합니다`)
    if (row.summary.length < 5) return problems.push(`${at(r, i)}: summary 에 사용자가 겪는 문제를 한 문장으로 적으세요`)
    out.push(row)
  })
  if (out.length === 0 && problems.length === 0) problems.push('보고서에 행이 없습니다. 확인된 위반(t2 의 violation, t3 의 fail)을 한 줄씩 적으세요')
  return { problems, rows: out }
}

/**
 * 채점. 문제마다 해당 행이 있고, 그 행들의 검사항목과 심각도가 모두 허용 범위면 맞음.
 * 어느 문제에도 해당하지 않는 행(오탐·문제가 없는 항목)은 거짓 보고.
 * @returns {{ items: Array<{ key: string, kind: string, defect: string, present: boolean, kwcagOk: boolean, severityOk: boolean }>, correct: number, falseReports: number[], found: { auto: number, manual: number }, totals: { auto: number, manual: number } }}
 */
export function gradeReport(rows, truth = REPORT_TRUTH) {
  const used = new Set()
  const items = truth.map((t) => {
    const mine = rows.filter((r) => r.source === t.source && t.match(r))
    mine.forEach((r) => used.add(r))
    return {
      key: t.key,
      kind: t.kind,
      defect: t.defect,
      present: mine.length > 0,
      kwcagOk: mine.length > 0 && mine.every((r) => t.kwcag.includes(r.kwcag)),
      severityOk: mine.length > 0 && mine.every((r) => t.severity.includes(r.severity)),
    }
  })
  const falseReports = rows.filter((r) => !used.has(r)).map((r) => r.line)
  const count = (kind, pred) => items.filter((i) => i.kind === kind && pred(i)).length
  return {
    items,
    correct: items.filter((i) => i.kwcagOk && i.severityOk).length,
    falseReports,
    found: { auto: count('auto', (i) => i.present), manual: count('manual', (i) => i.present) },
    totals: { auto: count('auto', () => true), manual: count('manual', () => true) },
  }
}

const ITEM_LABEL = { 'keyboard-pay': '키보드로 실행할 수 없는 동작', 'focus-visible': '초점 표시' }

export function formatReport(g) {
  const lines = [`  보고한 문제: 자동 스캔 ${g.found.auto}/${g.totals.auto}, 키보드 수동 점검 ${g.found.manual}/${g.totals.manual}`]
  for (const i of g.items) {
    const name = ITEM_LABEL[i.key] ?? i.key
    if (!i.present) continue
    const notes = [i.kwcagOk ? '검사항목 맞음' : '검사항목 다시 확인', i.severityOk ? '심각도 맞음' : '심각도 근거 다시 보기']
    lines.push(`  ${i.kwcagOk && i.severityOk ? '[맞음]' : '[다시]'} ${name}: ${notes.join(', ')}`)
  }
  if (g.falseReports.length) lines.push(`  거짓 보고(문제가 아닌 항목을 위반으로 보고): ${g.falseReports.length}줄 (${g.falseReports.slice(0, 5).join(', ')}번째 줄)`)
  return lines
}
