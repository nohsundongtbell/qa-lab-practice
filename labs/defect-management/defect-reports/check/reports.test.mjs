import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { judgeSeverity, parseReport } from './reports.mjs'
import { compareMetrics, computeMetrics } from './metrics.mjs'

const labDir = path.resolve(import.meta.dirname, '..')
const solution = (f) => fs.readFileSync(path.join(labDir, 'solution', 'reports', f), 'utf8')
const template = fs.readFileSync(path.join(labDir, 'starter', 'reports', '_TEMPLATE.md'), 'utf8')

describe('parseReport', () => {
  it('모범 리포트는 형식 오류가 없고 메타·재현 절차를 읽는다', () => {
    const r = parseReport(solution('free-shipping-threshold.md'))
    expect(r.errors).toEqual([])
    expect(r.meta).toMatchObject({ 심각도: 'S3', 우선순위: 'P2' })
    expect(r.repro.steps[0]).toEqual({ login: 'kim@example.com' })
  })

  it('템플릿을 그대로 두면 빈 칸을 모두 알려 준다', () => {
    const r = parseReport(template)
    expect(r.errors.join('\n')).toMatch(/# 제목/)
    for (const s of ['기대 결과', '실제 결과', '심각도·우선순위 근거', '증거']) expect(r.errors.join('\n')).toContain(`"## ${s}" 절이 비어 있습니다`)
  })

  it('repro 블록이 없거나 둘이거나 문법이 틀리면 오류', () => {
    const base = solution('cart-quantity-zero.md')
    expect(parseReport(base.replace(/```repro[\s\S]*?```/, '')).errors.join()).toMatch(/정확히 하나/)
    expect(parseReport(base.replace('```repro', '```repro\nsteps: [\n```\n\n```repro')).errors.join()).toMatch(/정확히 하나|YAML/)
    expect(parseReport(base.replace(/```repro\n[\s\S]*?```/, '```repro\nsteps: [unclosed\n```')).errors.join()).toMatch(/YAML 문법 오류/)
    expect(parseReport(base.replace(/```repro\n[\s\S]*?```/, '```repro\nfoo: 1\n```')).errors.join()).toMatch(/steps:/)
  })

  it('사람이 읽는 절차 없이 repro 블록만 있으면 오류', () => {
    const r = parseReport(solution('cart-quantity-zero.md').replace(/1\. `kim@example.com` 으로 로그인한다\.\n2\. [^\n]+\n/, ''))
    expect(r.errors.join()).toMatch(/사람이 읽을 수 있는 절차/)
  })

  it('심각도·우선순위 값 형식', () => {
    const r = parseReport(solution('cart-quantity-zero.md').replace('- 심각도: S3', '- 심각도: 높음').replace('- 우선순위: P3', '- 우선순위: 급함'))
    expect(r.errors.join()).toMatch(/S1~S4/)
    expect(r.errors.join()).toMatch(/P1~P4/)
  })
})

describe('judgeSeverity', () => {
  const catalog = new Map([['DF-A', { severity: 'S3' }], ['DF-B', { severity: 'S1' }]])
  const report = (s) => ({ meta: { 심각도: s } })
  it('같으면 적절, 1단계 차이도 적절, 2단계 이상은 재검토 (방향 안내)', () => {
    expect(judgeSeverity(report('S3'), ['DF-A'], catalog)).toMatchObject({ ok: true, note: '기준과 같음' })
    expect(judgeSeverity(report('S2'), ['DF-A'], catalog)).toMatchObject({ ok: true })
    expect(judgeSeverity(report('S1'), ['DF-A'], catalog)).toMatchObject({ ok: false, note: expect.stringMatching(/너무 높게/) })
    expect(judgeSeverity(report('S4'), ['DF-B'], catalog)).toMatchObject({ ok: false, note: expect.stringMatching(/너무 낮게/) })
  })
  it('여러 결함에 귀속되면 가장 가까운 기준으로 판단', () => {
    expect(judgeSeverity(report('S1'), ['DF-A', 'DF-B'], catalog).ok).toBe(true)
  })
})

describe('지표', () => {
  const expected = computeMetrics(path.join(labDir, 'data', 'defect-history.csv'), path.join(labDir, 'data', 'module-size.csv'))

  it('starter 의 데이터 사본은 원본과 같다', () => {
    for (const f of ['defect-history.csv', 'module-size.csv']) {
      expect(fs.readFileSync(path.join(labDir, 'starter', 'data', f), 'utf8')).toBe(fs.readFileSync(path.join(labDir, 'data', f), 'utf8'))
    }
  })

  it('±0.1 허용, 빈칸·다름 구분, 정답 값은 결과에 담지 않는다', () => {
    const answer = { ...expected, escape_rate_pct: expected.escape_rate_pct + 0.1, reopen_rate_pct: 99, open_count: null }
    const r = Object.fromEntries(compareMetrics(answer, expected).map((x) => [x.key, x]))
    expect(r.escape_rate_pct.ok).toBe(true)
    expect(r.reopen_rate_pct).toMatchObject({ ok: false, missing: false })
    expect(r.open_count).toMatchObject({ ok: false, missing: true })
    expect(JSON.stringify(r)).not.toContain(String(expected.reopen_rate_pct))
  })

  it('심각도별 건수는 네 값이 모두 맞아야 한다', () => {
    const r = compareMetrics({ ...expected, by_severity: { ...expected.by_severity, S4: null } }, expected)
    expect(r.find((x) => x.key === 'by_severity').ok).toBe(false)
  })
})
