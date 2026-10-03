import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { defectsForModule } from '../../../../scripts/lib/defects.mjs'
import { formatSheet, gradeSheet, readSheet, SheetError } from '../../../../scripts/lib/answer-sheet.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { findRow, here, prepare, runOnce, TARGETS } from './perf-lab.mjs'
import { expectedAnswers, SPEC } from './perf-truth.mjs'

const ctx = loadLabContext()
const { users = 10, duration_s: durationS = 12 } = ctx.pass

try {
  const data = readSheet(path.join(ctx.workDir, 'result.yaml'), 'result.yaml')
  const ready = prepare(ctx)
  if (ready.error) finish({ passed: false, message: ready.error })
  else {
    // 기준 시나리오(check/ref)로 직접 측정한다: 결함 없음 1회 + 이 랩의 결함을 하나씩 켠 실행
    const ref = path.join(here, 'ref', 'locustfile.py')
    const measure = (defects) => runOnce(ctx, { network: ready.network, locustfile: ref, defects, users, durationS })
    const baseline = await measure('none')
    const ids = defectsForModule(ctx.repoRoot, ctx.lab.module)
    const solo = {}
    for (const id of ids) solo[id] = await measure(id)
    const truth = expectedAnswers({ baseline: baseline.stats.rows, solo: Object.fromEntries(Object.entries(solo).map(([k, v]) => [k, v.stats.rows])) }, TARGETS, findRow)
    if (truth.error) {
      finish({ passed: false, message: truth.error, hints: ['컴퓨터가 매우 바쁘거나 느리면 결함이 없는 상태에서도 목표를 못 지킬 수 있습니다. 다른 작업을 닫고 다시 시도하세요.'] })
    } else {
      const graded = gradeSheet(data, SPEC, truth.answers)
      for (const line of formatSheet(graded)) console.log(line)
      finish({
        passed: graded.correct === SPEC.length,
        message: `${SPEC.length}문제 중 ${graded.correct}개 정답`,
        hints: [
          '목표와 비교하는 값은 평균이 아니라 p95 입니다. Locust 가 마지막에 출력하는 "Response time percentiles" 표의 95% 열을 보세요.',
          '결함을 하나씩 켜서 비교하세요: QA_LAB_DEFECTS=none 으로 한 번, QA_LAB_DEFECTS=DF-018 등으로 한 번씩 실행해 어느 엔드포인트가 느려지는지 봅니다 (README).',
          '병목 결함은 이 랩의 부하 시나리오에서 응답 시간 목표를 깨뜨리는 결함입니다. 결함 ID 는 앱의 /__admin/defects 에서 볼 수 있는 활성 목록 중에서 찾으세요.',
        ],
      })
    }
  }
} catch (err) {
  if (!(err instanceof SheetError)) throw err
  finish({ passed: false, message: err.message, hints: ['work/result.yaml 의 항목을 채우세요.'] })
}
