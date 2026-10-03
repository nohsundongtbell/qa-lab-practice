import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MUTANTS, mutatedSource } from './mutants.mjs'
import { coverageByFile } from './structural-lab.mjs'
import { mapLimit, prepareRunDir, removeRunDir, runVitest, summarize } from '../../../../scripts/lib/vitest-runner.mjs'

const labDir = path.resolve(import.meta.dirname, '..')
const repoRoot = path.resolve(labDir, '..', '..', '..')
const REF = path.join(labDir, 'check', 'ref')
const CONFIG = path.join(labDir, 'check', 'vitest.config.mjs')

async function run(testsDir, overlay, coverage) {
  const dir = prepareRunDir(labDir, 'premise', {
    copies: [{ from: testsDir, to: 'tests' }, { from: path.join(REF, 'src'), to: 'src' }],
    files: overlay ? [{ to: path.join('src', overlay.file), content: overlay.content }] : [],
  })
  try {
    const r = await runVitest({ repoRoot, runDir: dir, config: CONFIG, coverage })
    const cov = coverage ? coverageByFile(JSON.parse(fs.readFileSync(path.join(dir, 'coverage', 'coverage-summary.json'), 'utf8'))) : null
    return { summary: summarize(r.report), cov }
  } finally {
    removeRunDir(dir)
  }
}

describe('이 랩의 전제: 커버리지가 높아도 약한 테스트가 있다', () => {
  it('starter 테스트: 줄은 100%인데 분기는 100%가 아니다', async () => {
    const { summary, cov } = await run(path.join(labDir, 'starter', 'tests'), null, true)
    expect(summary.failed).toBe(0)
    for (const f of ['coupon.mjs', 'order-status.mjs']) {
      expect(cov[f].lines, f).toBe(100)
      expect(cov[f].branches, f).toBeLessThan(100)
    }
  }, 120_000)

  it('커버리지만 채운 테스트: 줄·분기 100%인데 뮤턴트가 5개 이상 살아남는다', async () => {
    const dir = path.join(labDir, 'check', 'fixtures', 'coverage-only')
    const { summary, cov } = await run(dir, null, true)
    expect(summary.failed).toBe(0)
    for (const f of ['coupon.mjs', 'order-status.mjs']) {
      expect(cov[f].lines).toBe(100)
      expect(cov[f].branches).toBe(100)
    }
    const results = await mapLimit(MUTANTS, 3, async (m) => ({ m, killed: (await run(dir, mutatedSource(REF, m), false)).summary.failed > 0 }))
    const survivors = results.filter((r) => !r.killed).map((r) => r.m)
    expect(survivors.length).toBeGreaterThanOrEqual(5)
    expect(survivors.some((m) => m.kind === 'subtle')).toBe(true)
  }, 180_000)
})
