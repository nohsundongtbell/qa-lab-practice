import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildReport, expectedVerdict, LOCATIONS, locate, reportCsv, SCAN_TARGET, triageTemplate } from './report-gen.mjs'

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { findings, key } = buildReport()

describe('리포트 생성', () => {
  it('정확히 100건, 판정 분포가 고정되어 있다', () => {
    expect(findings).toHaveLength(100)
    const count = (v) => findings.filter((f) => expectedVerdict(key, f.id) === v).length
    expect([count('TP'), count('FP'), count('DUP')]).toEqual([17, 21, 62])
  })

  it('결정적이다 (두 번 만들어도 같다)', () => {
    expect(JSON.stringify(buildReport().findings)).toBe(JSON.stringify(findings))
  })

  it('starter 의 리포트·분류표와 solution 의 분류표는 생성기의 현재 출력과 같다 (생성기·샘플 코드를 고치면 node check/report-gen.mjs 로 다시 만든다)', () => {
    const json = JSON.parse(fs.readFileSync(path.join(lab, 'starter', 'scan-report.json'), 'utf8'))
    expect(json.findings).toEqual(findings)
    expect(fs.readFileSync(path.join(lab, 'starter', 'scan-report.csv'), 'utf8')).toBe(reportCsv(findings))
    expect(fs.readFileSync(path.join(lab, 'starter', 'triage.csv'), 'utf8')).toBe(triageTemplate(findings))
  })

  it('리포트에 정답(판정·그룹)이 새어 나가지 않는다', () => {
    for (const f of findings) {
      expect(Object.keys(f).sort()).toEqual(['cwe', 'file', 'id', 'line', 'message', 'rule', 'severity', 'snippet', 'title', 'tool'])
    }
  })
})

describe('리포트와 샘플 코드의 일치 (분류가 코드로 판단 가능해야 한다)', () => {
  it('환각이 아닌 항목은 실제 파일의 그 줄을 정확히 인용한다', () => {
    for (const loc of LOCATIONS.filter((l) => !l.hallucinated)) {
      const { line, snippet } = locate(SCAN_TARGET, loc)
      const actual = fs.readFileSync(path.join(SCAN_TARGET, loc.file), 'utf8').split('\n')[line - 1]
      expect(actual.trim(), loc.key).toBe(snippet)
      expect(actual, loc.key).toContain(loc.marker)
    }
  })

  it('환각 항목은 정말로 확인 불가능하다 (파일이 없거나, 그 줄에 인용한 코드가 없다)', () => {
    for (const loc of LOCATIONS.filter((l) => l.hallucinated)) {
      const file = path.join(SCAN_TARGET, loc.file)
      if (!fs.existsSync(file)) continue
      const actual = fs.readFileSync(file, 'utf8').split('\n')[loc.line - 1] ?? ''
      expect(actual.includes(loc.snippet), loc.key).toBe(false)
      expect(fs.readFileSync(file, 'utf8').includes(loc.snippet), loc.key).toBe(false)
    }
  })

  it('같은 그룹(파일·줄·CWE)의 대표는 번호가 가장 작은 항목이다', () => {
    const groups = new Map()
    for (const f of findings) {
      const g = key.get(f.id).group
      expect(g).toBe(`${f.file}:${f.line}:${f.cwe}`)
      if (!groups.has(g)) groups.set(g, f.id)
      expect(key.get(f.id).canonical).toBe(groups.get(g))
    }
    expect(groups.size).toBe(LOCATIONS.length)
  })

  it('위치마다 판정 근거가 있고, TP/FP 미끼가 짝을 이룬다 (같은 CWE 에 TP 와 FP 가 모두 있다)', () => {
    for (const l of LOCATIONS) expect(l.reason, l.key).toBeTruthy()
    const cwes = (v) => new Set(LOCATIONS.filter((l) => l.verdict === v).map((l) => l.cwe))
    const tp = cwes('TP')
    const fp = cwes('FP')
    const paired = [...tp].filter((c) => fp.has(c))
    expect(paired.length).toBeGreaterThanOrEqual(14)
  })
})
