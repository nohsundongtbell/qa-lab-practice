import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { groupByDefect } from '../../../../scripts/lib/grading.mjs'
import { evaluatePass, formatCaseResult, loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { gradeReports, listReports } from './reports.mjs'

// t1: 재현 가능한 결함 리포트 — 형식 검사 → 재현 절차 자동 실행 → 결함 귀속, 중복 리포트 확인
const ctx = loadLabContext()
const reports = listReports(ctx.workDir)
console.log(`리포트 ${reports.length}개 (work/reports/*.md, 밑줄로 시작하는 파일 제외)`)

const formatErrors = reports.filter((r) => r.errors.length)
for (const r of formatErrors) {
  console.log(`  [형식] ${r.file}`)
  for (const e of r.errors) console.log(`         - ${e}`)
}

console.log('(재현 절차를 실행하면서 DB 를 여러 번 초기화합니다)')
const { graded } = await gradeReports(reports, ctx)
for (const r of graded.results) console.log(formatCaseResult(r).replace('[미검출]', '[재현 안 됨]'))

const duplicates = [...groupByDefect(graded.results).entries()].filter(([, files]) => files.length > 1)
const verdict = evaluatePass(graded, ctx.pass, { repoRoot: ctx.repoRoot, noun: '리포트' })
const reasons = [...verdict.reasons]
if (formatErrors.length) reasons.unshift(`형식이 맞지 않는 리포트 ${formatErrors.length}개`)
const notRepro = graded.results.filter((r) => r.status === 'undetected')
if (notRepro.length) reasons.push(`재현되지 않는 리포트 ${notRepro.length}개 — 결함이 없는 앱과 똑같이 동작합니다`)
for (const [id, files] of duplicates) reasons.push(`같은 결함(${id})을 여러 리포트가 다룹니다: ${files.join(', ')} — 하나로 합치세요`)

const hints = []
if (reports.length === 0) hints.push('work/reports/_TEMPLATE.md 를 복사해 새 파일(예: free-shipping.md)로 쓰세요. 밑줄로 시작하는 파일은 채점하지 않습니다.')
if (graded.results.some((r) => r.status === 'invalid')) hints.push('[무효]는 기대 결과가 사양과 다르다는 뜻입니다. repro 블록의 expect 에는 "사양대로라면 나와야 할 값"을 적으세요 (docs/REPRO_DSL.md).')
if (notRepro.length) hints.push('[재현 안 됨]은 그 절차로는 결함이 드러나지 않는다는 뜻입니다. 실제로 이상했던 요청을 그대로 옮겼는지 확인하세요.')
if (verdict.counted.length < (ctx.pass.min_defects ?? 0)) hints.push('README 의 "막혔을 때" 힌트를 차례로 열어 보세요.')
finish({ passed: reasons.length === 0, message: verdict.summary, details: reasons, hints })
