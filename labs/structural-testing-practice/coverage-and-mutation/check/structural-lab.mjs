import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { mapLimit, prepareRunDir, removeRunDir, runVitest, summarize } from '../../../../scripts/lib/vitest-runner.mjs'
import { MUTANTS, mutatedSource } from './mutants.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const CONFIG = path.join(here, 'vitest.config.mjs')
const REF = path.join(here, 'ref')
export const TARGETS = ['coupon.mjs', 'order-status.mjs']

/** 커버리지 요약에서 대상 파일별 수치를 뽑는다 (키는 절대 경로, 윈도우는 역슬래시일 수 있음). */
export function coverageByFile(summary) {
  const out = {}
  for (const [file, v] of Object.entries(summary)) {
    const base = file.replace(/\\/g, '/').split('/').pop()
    if (TARGETS.includes(base)) out[base] = { lines: Number(v.lines.pct), branches: Number(v.branches.pct), functions: Number(v.functions.pct) }
  }
  for (const t of TARGETS) out[t] ??= { lines: 0, branches: 0, functions: 0 } // 한 번도 불러오지 않은 파일은 0%
  return out
}

async function runOnce(ctx, { overlay, coverage }) {
  const dir = prepareRunDir(ctx.labDir, ctx.taskId, {
    copies: [{ from: path.join(ctx.workDir, 'tests'), to: 'tests' }, { from: path.join(REF, 'src'), to: 'src' }],
    files: overlay ? [{ to: path.join('src', overlay.file), content: overlay.content }] : [],
  })
  try {
    const r = await runVitest({ repoRoot: ctx.repoRoot, runDir: dir, config: CONFIG, coverage })
    let cov = null
    if (coverage) {
      try {
        cov = coverageByFile(JSON.parse(fs.readFileSync(path.join(dir, 'coverage', 'coverage-summary.json'), 'utf8')))
      } catch {
        cov = null
      }
    }
    return { ...r, summary: summarize(r.report), cov }
  } finally {
    removeRunDir(dir)
  }
}

const pct = (n) => `${Number(n.toFixed(2))}%`

/** 정상 구현에서 테스트가 통과하는지 + 커버리지. 문제가 있으면 finish 로 끝내고 null 을 돌려준다. */
async function validate(ctx) {
  const r = await runOnce(ctx, { coverage: true })
  const s = r.summary
  if (r.timedOut) return finish({ passed: false, message: '테스트가 너무 오래 걸립니다 (90초 초과)' }), null
  if (s.loadError) return finish({ passed: false, message: '테스트를 실행하지 못했습니다', details: [s.loadError], hints: ['work/tests/ 의 테스트 파일에 문법 오류가 없는지 확인하세요.'] }), null
  if (s.total === 0) return finish({ passed: false, message: '실행된 테스트가 없습니다', hints: ['work/tests/ 에 it(...) 테스트를 작성하세요.'] }), null
  if (s.failed > 0) {
    for (const f of s.failures.slice(0, 5)) console.log(`  [실패] ${f.name}: ${f.message}`)
    return finish({ passed: false, message: `정상 구현에서 통과하지 못하는 테스트가 ${s.failed}개 있습니다`, hints: ['정상 구현에서 실패하는 테스트는 기대값이 틀린 것입니다. src/ 의 동작을 다시 읽어 보세요.'] }), null
  }
  if (!r.cov) return finish({ passed: false, message: '커버리지를 계산하지 못했습니다' }), null
  return { tests: s.total, cov: r.cov }
}

function printCoverage(cov) {
  console.log('  파일               줄        분기      함수')
  for (const t of TARGETS) console.log(`  ${t.padEnd(18)} ${pct(cov[t].lines).padEnd(9)} ${pct(cov[t].branches).padEnd(9)} ${pct(cov[t].functions)}`)
}

/** t1 — 커버리지 기준 */
export async function gradeCoverage() {
  const ctx = loadLabContext()
  const v = await validate(ctx)
  if (!v) return
  printCoverage(v.cov)
  const minLine = ctx.pass.min_line_pct ?? 0
  const minBranch = ctx.pass.min_branch_pct ?? 0
  const short = []
  for (const t of TARGETS) {
    if (v.cov[t].lines < minLine) short.push(`${t}: 줄 ${pct(v.cov[t].lines)} (기준 ${minLine}%)`)
    if (v.cov[t].branches < minBranch) short.push(`${t}: 분기 ${pct(v.cov[t].branches)} (기준 ${minBranch}%)`)
  }
  finish({
    passed: short.length === 0,
    message: `테스트 ${v.tests}개 — 줄 ${minLine}% · 분기 ${minBranch}% 기준 ${short.length === 0 ? '달성' : '미달'}`,
    details: short,
    hints: ['직접 확인: 저장소 루트에서 `npx vitest run --root labs/structural-testing-practice/coverage-and-mutation/work --coverage` 를 실행하면 표가 나오고, work/coverage/index.html 에서 실행되지 않은 분기가 색으로 표시됩니다.', '줄 커버리지가 100%여도 한 줄 안의 `if (…) return …` 이나 삼항 연산자(`a ? b : c`)는 분기가 반만 실행됐을 수 있습니다.'],
  })
}

/** t2 — 뮤테이션 */
export async function gradeMutation() {
  const ctx = loadLabContext()
  const v = await validate(ctx)
  if (!v) return
  const results = await mapLimit(MUTANTS, 3, async (m) => {
    const r = await runOnce(ctx, { overlay: mutatedSource(REF, m), coverage: false })
    return { m, killed: r.summary.failed > 0 || r.timedOut }
  })
  for (const { m, killed } of results) console.log(`  ${killed ? '[처치]' : '[생존]'} ${m.id} ${m.file} · ${m.where}`)
  const killed = results.filter((r) => r.killed).length
  const survivors = results.filter((r) => !r.killed)
  const min = ctx.pass.min_killed ?? 0
  const full = TARGETS.every((t) => v.cov[t].lines >= 100 && v.cov[t].branches >= 100)
  const covLine = `커버리지 줄 ${pct(Math.min(...TARGETS.map((t) => v.cov[t].lines)))} · 분기 ${pct(Math.min(...TARGETS.map((t) => v.cov[t].branches)))}`
  console.log(`\n  내 테스트: ${covLine}, 뮤턴트 ${killed}/${MUTANTS.length}개 처치`)
  const details = []
  if (full && survivors.length) details.push(`커버리지는 100%인데 뮤턴트 ${survivors.length}개가 살아남았습니다 — 커버리지는 코드가 "실행"됐다는 뜻이지 "검증"됐다는 뜻이 아닙니다.`)
  if (survivors.length) details.push(`생존: ${survivors.map((r) => `${r.m.id}(${r.m.file} · ${r.m.where})`).join(', ')}`)
  finish({
    passed: killed >= min,
    message: `뮤턴트 ${killed}/${MUTANTS.length}개 처치 (기준 ${min}개 이상), 테스트 ${v.tests}개`,
    details,
    hints: ['생존 뮤턴트가 있는 함수에서, 값을 정확히 확인하지 않은 입력을 찾으세요. 경계의 바로 위·아래·정확히 그 값, 소수가 나오는 입력, 특수한 상태(다른 등급·다른 상태)가 후보입니다.', 'README 의 "막혔을 때" 힌트를 차례로 열어 보세요.'],
  })
}
