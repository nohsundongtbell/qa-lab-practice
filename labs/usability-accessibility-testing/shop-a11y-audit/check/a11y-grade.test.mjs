import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodeText, parseCsv } from '../../../../scripts/lib/csv.mjs'
import { gradeChecklist, gradeReport, gradeTriage, kwcagNumber, parseChecklist, parseReport, parseTriage, scanSpecProblems } from './a11y-grade.mjs'
import { KEYBOARD_TRUTH, PAGES, REPORT_TRUTH, TRIAGE_TRUTH } from './a11y-truth.mjs'

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
/** readCsvTable 과 같은 모양({ _line, 열: 값 })으로 CSV 를 읽는다 */
function readRows(rel) {
  const [header, ...rest] = parseCsv(decodeText(fs.readFileSync(path.join(lab, rel))).text)
  return rest.map((r) => Object.fromEntries([['_line', r.line], ...header.cells.map((h, i) => [h.trim(), (r.cells[i] ?? '').trim()])]))
}
const triageOf = (rows) => {
  const p = parseTriage(rows)
  expect(p.problems).toEqual([])
  return gradeTriage(p.rows)
}
const reportOf = (rows) => {
  const p = parseReport(rows)
  expect(p.problems).toEqual([])
  return gradeReport(p.rows)
}

describe('t1 스캔 스펙 정적 규칙', () => {
  it('AxeBuilder 를 쓰면 통과, 안 쓰면 실패', () => {
    expect(scanSpecProblems([fs.readFileSync(path.join(lab, 'solution/tests/t1-axe-scan.spec.mjs'), 'utf8')])).toEqual([])
    expect(scanSpecProblems(["import { test } from '@playwright/test'"]).join()).toMatch(/AxeBuilder/)
  })
  it('결함 설정을 읽어 실패하는 우회를 막는다', () => {
    const cheat = "import AxeBuilder from '@axe-core/playwright'\nconst env = await (await fetch('/__qa/environment')).json()"
    expect(scanSpecProblems([cheat]).join()).toMatch(/결함 설정/)
    expect(scanSpecProblems(["import AxeBuilder from '@axe-core/playwright'\n// headers: { 'X-QA-Lab-Defects': 'none' }"]).join()).toMatch(/결함 설정/)
  })
})

describe('t2 분류표', () => {
  it('모범 답안은 모든 항목이 맞고 감점이 없다', () => {
    expect(triageOf(readRows('solution/triage.csv'))).toMatchObject({ correct: TRIAGE_TRUTH.length, fpAsViolation: 0, missing: 0, score: TRIAGE_TRUTH.length })
  })
  it('시작 파일(빈 표)은 형식 단계에서 실패한다', () => {
    expect(parseTriage(readRows('starter/triage.csv')).problems.join()).toMatch(/분류한 행이 없습니다/)
  })
  it('오탐을 violation 으로 분류하면 맞은 수에서 빠지고 감점까지 된다 (다른 오답보다 점수가 낮다)', () => {
    const rows = readRows('solution/triage.csv')
    const fpWrong = rows.map((r) => (r.rule === 'region' ? { ...r, category: 'violation' } : r))
    const reviewWrong = rows.map((r) => (r.target.includes('promo') ? { ...r, category: 'violation' } : r))
    const a = triageOf(fpWrong)
    const b = triageOf(reviewWrong)
    expect(a).toMatchObject({ correct: TRIAGE_TRUTH.length - 1, fpAsViolation: 1, score: TRIAGE_TRUTH.length - 2 })
    expect(b).toMatchObject({ correct: TRIAGE_TRUTH.length - 1, fpAsViolation: 0, score: TRIAGE_TRUTH.length - 1 })
  })
  it('같은 문제를 화면마다 다르게 분류하면 엇갈림으로 센다 (오탐이 한 번이라도 violation 이면 감점)', () => {
    const rows = readRows('solution/triage.csv')
    let first = true
    const mixed = rows.map((r) => (r.rule === 'region' && first ? ((first = false), { ...r, category: 'violation' }) : r))
    expect(triageOf(mixed)).toMatchObject({ inconsistent: 1, fpAsViolation: 1 })
  })
  it('같은 규칙이라도 요소로 다른 항목을 가른다 (color-contrast: 재고 글자 vs 배너)', () => {
    const rows = readRows('solution/triage.csv').filter((r) => !r.target.includes('promo'))
    expect(triageOf(rows)).toMatchObject({ missing: 1, correct: TRIAGE_TRUTH.length - 1 })
  })
  it('기준 스캔에 없는 규칙은 참고로만 알리고 채점하지 않는다', () => {
    const rows = [...readRows('solution/triage.csv'), { _line: 99, page: 'cart', rule: 'list', target: 'ul', category: 'violation', reason: '목록 구조' }]
    expect(triageOf(rows)).toMatchObject({ unknownRows: [99], score: TRIAGE_TRUTH.length })
  })
  it('형식 오류를 줄 번호와 함께 알린다', () => {
    const p = parseTriage([
      { _line: 2, page: 'home', rule: 'label', target: 'input', category: 'violation', reason: 'x' },
      { _line: 3, page: 'signup', rule: 'label', target: 'input', category: 'bug', reason: 'x' },
      { _line: 4, page: 'signup', rule: 'label', target: 'input', category: 'violation', reason: '' },
      { _line: 5, page: 'signup', rule: 'Label Rule', target: 'input', category: 'violation', reason: 'x' },
    ])
    expect(p.problems).toHaveLength(4)
    expect(p.problems[0]).toMatch(/^2번째 줄: page/)
    expect(p.problems[1]).toMatch(/category/)
    expect(p.problems[2]).toMatch(/reason/)
    expect(p.problems[3]).toMatch(/rule/)
  })
})

describe('t3 키보드 체크리스트', () => {
  it('모범 답안은 수동 결함 2개를 검출하고 거짓 보고가 없다', () => {
    const p = parseChecklist(readRows('solution/keyboard-checklist.csv'))
    expect(p.problems).toEqual([])
    expect(gradeChecklist(p.cells)).toEqual({ detected: KEYBOARD_TRUTH.map((t) => t.defect), falseReports: 0 })
  })
  it('시작 파일(결과가 빈 칸)은 형식 단계에서 실패한다', () => {
    expect(parseChecklist(readRows('starter/keyboard-checklist.csv')).problems.join()).toMatch(/result/)
  })
  it('모두 fail 로 적으면 검출은 되지만 거짓 보고가 많다 (찍기 방지)', () => {
    const rows = readRows('solution/keyboard-checklist.csv').map((r) => ({ ...r, result: 'fail', note: r.note || '문제가 있어 보인다' }))
    const g = gradeChecklist(parseChecklist(rows).cells)
    expect(g.detected).toHaveLength(2)
    expect(g.falseReports).toBeGreaterThan(10)
  })
  it('애매한 칸(결제 버튼 때문에 함께 실패하는 K3)은 fail 이어도 거짓 보고가 아니다', () => {
    const cells = new Map(PAGES.flatMap((p) => ['K1', 'K2', 'K3', 'K4'].map((c) => [`${p}/${c}`, 'pass'])))
    cells.set('order-detail/K3', 'fail')
    expect(gradeChecklist(cells)).toEqual({ detected: [], falseReports: 0 })
    cells.set('products/K2', 'fail')
    expect(gradeChecklist(cells)).toEqual({ detected: ['DF-026'], falseReports: 0 })
  })
  it('fail 인데 메모가 없거나 칸이 빠지면 형식 오류', () => {
    const rows = readRows('solution/keyboard-checklist.csv')
    expect(parseChecklist(rows.map((r) => (r.result === 'fail' ? { ...r, note: '' } : r))).problems.join()).toMatch(/note/)
    expect(parseChecklist(rows.slice(1)).problems.join()).toMatch(/채우지 않은 칸이 1개/)
    expect(parseChecklist([...rows, rows[0]]).problems.join()).toMatch(/두 번/)
  })
})

describe('t4 KWCAG 매핑 보고서', () => {
  it('모범 답안은 모든 문제가 맞고, 자동·수동을 나눠 센다', () => {
    const g = reportOf(readRows('solution/report.csv'))
    expect(g.correct).toBe(REPORT_TRUTH.length)
    expect(g.falseReports).toEqual([])
    expect(g.found).toEqual({ auto: 5, manual: 2 })
    expect(g.totals).toEqual({ auto: 5, manual: 2 })
  })
  it('검사항목 번호만 뽑는다', () => {
    expect(kwcagNumber('1.1.1 적절한 대체 텍스트 제공')).toBe('1.1.1')
    expect(kwcagNumber('KWCAG 2.1.2')).toBe('2.1.2')
    expect(kwcagNumber('대체 텍스트')).toBe('')
    // 표준 원문의 절 번호(5~8절)로 적어도 같은 검사항목으로 읽는다
    expect(kwcagNumber('6.5.3 레이블과 네임')).toBe('2.5.3')
    expect(kwcagNumber('8.2.1')).toBe('4.2.1')
    expect(kwcagNumber('5.1.1')).toBe('1.1.1')
  })
  it('매핑이 빠진 행은 형식 오류로 알린다', () => {
    const rows = readRows('solution/report.csv').map((r, i) => (i === 0 ? { ...r, kwcag: '' } : r))
    expect(parseReport(rows).problems.join()).toMatch(/KWCAG 매핑이 없습니다/)
  })
  it('빠진 문제, 틀린 검사항목·심각도를 따로 센다', () => {
    const rows = readRows('solution/report.csv')
    const g = reportOf(rows.filter((r) => r.ref !== 'K2').map((r) => (r.ref === 'label' ? { ...r, kwcag: '1.1.1' } : r.ref === 'K1' ? { ...r, severity: '하' } : r)))
    expect(g.found).toEqual({ auto: 5, manual: 1 })
    expect(g.items.find((i) => i.key === 'label')).toMatchObject({ kwcagOk: false, severityOk: true })
    expect(g.items.find((i) => i.key === 'keyboard-pay')).toMatchObject({ kwcagOk: true, severityOk: false })
    expect(g.correct).toBe(REPORT_TRUTH.length - 3)
  })
  it('오탐(region)이나 문제없는 점검 항목을 보고하면 거짓 보고로 센다', () => {
    const rows = [...readRows('solution/report.csv'), { _line: 20, source: 'axe', ref: 'region', page: 'cart', kwcag: '2.4.1', severity: '하', summary: '랜드마크 밖 콘텐츠' }, { _line: 21, source: 'keyboard', ref: 'K4', page: 'cart', kwcag: '2.1.1', severity: '중', summary: '초점이 갇힌다고 봄' }]
    expect(reportOf(rows).falseReports).toEqual([20, 21])
  })
  it('시작 파일(빈 보고서)은 형식 단계에서 실패한다', () => {
    expect(parseReport(readRows('starter/report.csv')).problems.join()).toMatch(/행이 없습니다/)
  })
})
