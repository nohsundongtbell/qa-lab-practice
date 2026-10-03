import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decide } from './gate-ref.mjs'
import { runScenarios, summarize } from './gate-lab.mjs'
import { SCENARIOS } from './gate-scenarios.mjs'

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const solution = path.join(lab, 'solution', 'gate.mjs')
const starter = path.join(lab, 'starter', 'gate.mjs')

describe('시나리오 정의', () => {
  it('손으로 정한 기대 판정과 기준 구현이 모든 시나리오에서 일치한다 (정답을 두 곳에서 정해 서로 검증)', () => {
    const disagree = SCENARIOS.filter((s) => s.raw === undefined && decide(s.metrics) !== s.expect).map((s) => s.name)
    expect(disagree).toEqual([])
  })
  it('통과와 차단이 모두 충분히 있다 (모두 막거나 모두 통과시키는 게이트가 통과하지 못하도록)', () => {
    const pass = SCENARIOS.filter((s) => s.expect === 'pass').length
    const block = SCENARIOS.filter((s) => s.expect === 'block').length
    expect(pass).toBeGreaterThanOrEqual(8)
    expect(block).toBeGreaterThanOrEqual(12)
  })
  it('경계값 시나리오가 있다', () => {
    const names = SCENARIOS.map((s) => s.name).join('\n')
    for (const k of ['정확히 80.0%', '79.9%', '정확히 2.0포인트', '정확히 기준선의 1.2배', '1.21배', '마지막 날', '하루 지남']) expect(names).toContain(k)
  })
})

describe('실제 스크립트 실행', () => {
  it('모범 답안은 모든 시나리오를 맞힌다', async () => {
    expect(summarize(await runScenarios(solution, SCENARIOS))).toMatchObject({ correct: SCENARIOS.length, lenient: [], strict: [], errors: [] })
  }, 120_000)

  it('시작 파일(아무것도 막지 않음)은 막아야 하는 것을 모두 놓친다', async () => {
    const s = summarize(await runScenarios(starter, SCENARIOS))
    // 깨진 JSON 은 시작 파일이 읽다가 예외로 죽어(종료 코드 1) 우연히 "차단"이 된다. 나머지는 모두 놓친다.
    expect(s.lenient.length).toBe(SCENARIOS.filter((x) => x.expect === 'block').length - 1)
    expect(s.strict).toEqual([])
  }, 120_000)

  /** 모범 답안의 한 줄을 일부러 망가뜨린 게이트가 잡히는지 (채점기가 약해지지 않았는지) */
  const mutate = (from, to) => {
    const src = fs.readFileSync(solution, 'utf8')
    expect(src).toContain(from)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-lab-gate-mut-'))
    const file = path.join(dir, 'gate.mjs')
    fs.writeFileSync(file, src.replace(from, to))
    return file
  }
  it.each([
    ['커버리지 경계를 <= 80 으로', 'cov.line < 80', 'cov.line <= 80'],
    ['커버리지 하락 허용을 >= 2 로', 'cov.baseline_line - cov.line > 2', 'cov.baseline_line - cov.line >= 2'],
    ['p95 경계를 >= 로', 'perf.p95_ms > perf.baseline_p95_ms * 1.2', 'perf.p95_ms >= perf.baseline_p95_ms * 1.2'],
    ['격리 마지막 날을 제외', 'q.until >= m.today', 'q.until > m.today'],
    ['high 취약점을 무시', 'sec.new_critical + sec.new_high >= 1', 'sec.new_critical >= 1'],
    ['테스트 0개 허용', "if (t.total === 0) problems.push", "if (t.total < 0) problems.push"],
  ])('망가뜨린 게이트가 잡힌다: %s', async (_label, from, to) => {
    const s = summarize(await runScenarios(mutate(from, to), SCENARIOS))
    expect(s.correct).toBeLessThan(SCENARIOS.length)
  }, 120_000)
})
