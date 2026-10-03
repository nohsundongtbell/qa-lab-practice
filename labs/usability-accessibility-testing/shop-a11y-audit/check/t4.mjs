import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { readCsvTable } from '../../../../scripts/lib/csv.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { formatReport, gradeReport, parseReport, REPORT_COLUMNS } from './a11y-grade.mjs'

const ctx = loadLabContext()
const table = readCsvTable(path.join(ctx.workDir, 'report.csv'), REPORT_COLUMNS)
const { problems, rows } = table.errors.length ? { problems: table.errors, rows: [] } : parseReport(table.rows)
if (problems.length) {
  finish({ passed: false, message: 'report.csv 형식을 고쳐 주세요', details: problems.slice(0, 10), hints: [`열은 ${REPORT_COLUMNS.join(',')} 입니다. 검사항목은 랩 폴더의 reference/kwcag-2.2.md 를 보세요.`] })
} else {
  const g = gradeReport(rows)
  for (const line of formatReport(g)) console.log(line)
  const min = ctx.pass.min_correct ?? g.items.length
  const maxFalse = ctx.pass.max_false_reports ?? 0
  const missing = g.items.filter((i) => !i.present).length
  const reasons = []
  if (missing) reasons.push(`보고서에 빠진 문제 ${missing}개 — t2 의 violation 과 t3 의 fail 을 모두 옮겼는지 확인하세요`)
  if (g.correct < min) reasons.push(`검사항목·심각도가 모두 맞은 문제 ${g.correct}개 (기준 ${min}개 이상)`)
  if (g.falseReports.length > maxFalse) reasons.push(`거짓 보고 ${g.falseReports.length}줄 (기준 ${maxFalse}줄 이하)`)
  finish({
    passed: reasons.length === 0,
    message: reasons.length === 0 ? `보고서 통과: ${g.correct}/${g.items.length} (자동 ${g.found.auto}, 수동 ${g.found.manual})` : '보고서가 기준에 못 미칩니다',
    details: reasons,
    hints: [
      '검사항목은 "어떤 도구가 잡았나"가 아니라 "사용자가 무엇을 못 하게 되나"로 고릅니다. reference/kwcag-2.2.md 의 설명과 대조하세요.',
      '심각도는 그 문제 때문에 키보드·화면 낭독기 사용자가 핵심 기능(가입·주문·결제)을 끝낼 수 없는지로 정합니다(상: 끝낼 수 없음, 중: 큰 어려움, 하: 불편).',
    ],
  })
}
