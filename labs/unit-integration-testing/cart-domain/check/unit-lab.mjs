import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { prepareRunDir, removeRunDir, runVitest, summarize } from '../../../../scripts/lib/vitest-runner.mjs'
import { mutantsFor, mutatedSource } from './mutants.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const CONFIG = path.join(here, 'vitest.config.mjs')
const SETUP = path.join(here, 'adversarial-clock.mjs')
const REF = path.join(here, 'ref')

/** 과제별 정상 구현 실행 환경. t3 는 시간대·시각·난수를 바꿔 세 번 실행해 플래키를 잡는다. */
const REFERENCE_RUNS = {
  t1: [{ label: '기본', seed: 1, tz: 'UTC' }],
  t2: [{ label: '기본', seed: 1, tz: 'UTC' }],
  t3: [
    { label: '시간대 UTC', seed: 1, tz: 'UTC' },
    { label: '시간대 Asia/Seoul', seed: 2, tz: 'Asia/Seoul' },
    { label: '시간대 America/Los_Angeles', seed: 3, tz: 'America/Los_Angeles' },
  ],
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    }),
  )
  return out
}

/** 한 번 실행: work/tests 의 해당 과제 테스트 + 정상 구현(+선택적으로 뮤턴트 한 파일). */
async function runOnce(ctx, { overlay, seed, tz }) {
  const files = overlay ? [{ to: path.join('src', overlay.file), content: overlay.content }] : []
  const dir = prepareRunDir(ctx.labDir, ctx.taskId, {
    copies: [{ from: path.join(ctx.workDir, 'tests'), to: 'tests' }, { from: path.join(REF, 'src'), to: 'src' }],
    files,
  })
  try {
    const r = await runVitest({
      repoRoot: ctx.repoRoot, runDir: dir, config: CONFIG, filter: `tests/${ctx.taskId}-`,
      env: { QA_LAB_SETUP: SETUP, QA_LAB_SEED: String(seed), TZ: tz },
    })
    return { ...r, summary: summarize(r.report) }
  } finally {
    removeRunDir(dir)
  }
}

export async function gradeUnitTask() {
  const ctx = loadLabContext()
  const mutants = mutantsFor(ctx.taskId)
  const min = ctx.pass.min_killed ?? 0

  // 1) 정상 구현에서 통과해야 한다 (유효성) — 실행 환경을 바꿔도 같아야 한다 (플래키 방지)
  const runs = REFERENCE_RUNS[ctx.taskId]
  let tests = 0
  const problems = []
  for (const run of runs) {
    const r = await runOnce(ctx, run)
    if (r.timedOut) return finish({ passed: false, message: '테스트가 너무 오래 걸립니다 (90초 초과)', hints: ['무한 대기하는 테스트(타이머를 기다리는 코드 등)가 없는지 확인하세요.'] })
    const s = r.summary
    if (s.loadError) return finish({ passed: false, message: `tests/${ctx.taskId}-*.test.mjs 를 실행하지 못했습니다`, details: [s.loadError], hints: [`tests/ 폴더에 ${ctx.taskId}- 로 시작하는 테스트 파일이 있고, 문법 오류가 없는지 확인하세요.`] })
    if (s.total === 0) return finish({ passed: false, message: '실행된 테스트가 없습니다', hints: [`work/tests/${ctx.taskId}-….test.mjs 에 it(...) 테스트를 작성하세요.`] })
    tests = s.total
    if (s.failed > 0) problems.push({ run, s })
  }
  if (problems.length) {
    const flaky = runs.length > 1 && problems.length < runs.length
    for (const { run, s } of problems) {
      console.log(`  [실패] 정상 구현에서 테스트 ${s.failed}개 실패 (${run.label})`)
      for (const f of s.failures.slice(0, 5)) console.log(`         - ${f.name}: ${f.message}`)
    }
    const hints = flaky || (runs.length > 1 && problems.length === runs.length)
      ? ['실행 환경(시간대·현재 시각·난수)이 바뀌면 결과가 달라지는 테스트입니다. 시계와 난수를 테스트가 직접 통제하세요 (vi.useFakeTimers, vi.setSystemTime, vi.spyOn(Math, "random")).']
      : ['정상 구현에서 실패하는 테스트는 기대값이 틀렸거나 준비가 잘못된 것입니다. 소스(src/)의 동작을 다시 읽어 보세요.']
    return finish({ passed: false, message: flaky ? '불안정한(플래키) 테스트입니다' : '정상 구현에서 통과하지 못하는 테스트가 있습니다', details: [`테스트 ${tests}개 중 일부가 실패`], hints })
  }
  console.log(`  [통과] 정상 구현: 테스트 ${tests}개 모두 통과${runs.length > 1 ? ` (${runs.length}가지 환경)` : ''}`)

  // 2) 뮤턴트(일부러 고장 낸 구현)에서는 실패해야 한다
  const results = await mapLimit(mutants, 3, async (m) => {
    const r = await runOnce(ctx, { overlay: mutatedSource(REF, m), seed: 1, tz: 'UTC' })
    return { m, killed: r.summary.failed > 0 || r.timedOut }
  })
  for (const { m, killed } of results) console.log(`  ${killed ? '[처치]' : '[생존]'} ${m.id} ${m.file} · ${m.where}`)
  const killed = results.filter((r) => r.killed).length
  const survivors = results.filter((r) => !r.killed)

  const passed = killed >= min
  finish({
    passed,
    message: `뮤턴트 ${killed}/${mutants.length}개 처치 (기준 ${min}개 이상), 테스트 ${tests}개`,
    details: survivors.length ? [`생존한 뮤턴트: ${survivors.map((r) => `${r.m.id}(${r.m.file} · ${r.m.where})`).join(', ')} — 이 함수의 동작이 바뀌어도 테스트가 알아채지 못했습니다`] : [],
    hints: ['생존 뮤턴트가 있는 함수를 다시 보고, 어떤 입력·검증이 빠졌는지 생각해 보세요. 경계 바로 아래·위, 잘못된 입력, 호출 인자까지 확인했나요?', 'README 의 "막혔을 때" 힌트를 차례로 열어 보세요.'],
  })
}
