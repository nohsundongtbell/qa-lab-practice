import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { compareAnalysis, readAnalysis } from './analysis.mjs'

// t3: 순환 복잡도와 정의-사용 쌍 분석 (손으로 분석한 답을 정답과 비교)
const ctx = loadLabContext()
const { answer, error } = readAnalysis(ctx.workDir)
if (error) {
  finish({ passed: false, message: error, hints: ['work/t3-analysis.yaml 의 형식은 starter 의 파일을 따르세요.'] })
} else {
  const r = compareAnalysis(answer)
  console.log(`  [${r.ccOk ? '맞음' : r.ccBlank ? '빈칸' : '다름'}] 순환 복잡도`)
  for (const [variable, v] of Object.entries(r.perVar)) {
    console.log(`  [${v.correct === v.total && v.wrong === 0 ? '맞음' : '다름'}] 변수 ${variable}: 정의-사용 쌍 ${v.total}개 중 ${v.correct}개 찾음, 틀린 쌍 ${v.wrong}개`)
  }
  const details = [...r.errors]
  if (!r.ccOk) details.push(r.ccBlank ? '순환 복잡도가 비어 있습니다' : '순환 복잡도가 다릅니다')
  if (r.correctTotal < r.total) details.push(`찾지 못한 정의-사용 쌍이 있습니다 (${r.total - r.correctTotal}개)`)
  if (r.wrongTotal > 0) details.push(`실제로는 존재하지 않는 쌍을 적었습니다 (${r.wrongTotal}개) — 정의와 사용 사이에 같은 변수를 다시 정의하는 코드가 끼어 있지 않은지 확인하세요`)
  finish({
    passed: r.passed,
    message: `정의-사용 쌍 ${r.total}개 중 ${r.correctTotal}개 일치, 순환 복잡도 ${r.ccOk ? '일치' : '불일치'}`,
    details,
    hints: ['순환 복잡도 = 판단(조건) 지점 수 + 1 입니다. else if 도 판단 지점입니다.', '정의-사용 쌍(D→U)은 "D 에서 정의한 값이, 그 변수를 다시 정의하지 않고 지나가는 어떤 실행 경로를 따라 U 에서 쓰이는" 경우입니다. 변수별로 정의를 하나씩 잡고, 그 정의가 도달할 수 있는 사용을 따라가 보세요.'],
  })
}
