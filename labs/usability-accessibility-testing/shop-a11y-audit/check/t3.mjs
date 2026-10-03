import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { readCsvTable } from '../../../../scripts/lib/csv.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { CHECKLIST_COLUMNS, gradeChecklist, parseChecklist } from './a11y-grade.mjs'

const ctx = loadLabContext()
const table = readCsvTable(path.join(ctx.workDir, 'keyboard-checklist.csv'), CHECKLIST_COLUMNS)
const { problems, cells } = table.errors.length ? { problems: table.errors, cells: new Map() } : parseChecklist(table.rows)
if (problems.length) {
  finish({ passed: false, message: 'keyboard-checklist.csv 형식을 고쳐 주세요', details: problems.slice(0, 10), hints: ['화면×항목 칸마다 result 에 pass · fail · na 를 적고, fail 이면 note 에 무엇을 눌렀고 어떻게 됐는지 적습니다.'] })
} else {
  const { detected, falseReports } = gradeChecklist(cells)
  const min = ctx.pass.min_defects ?? 1
  const maxFalse = ctx.pass.max_false_reports ?? 0
  console.log(`  키보드 수동 점검으로 검출한 결함 ${detected.length}개${detected.length ? ` (${detected.join(', ')})` : ''}`)
  console.log(`  거짓 보고(문제가 없는 칸을 fail 로): ${falseReports}칸`)
  const reasons = []
  if (detected.length < min) reasons.push(`검출한 결함 ${detected.length}개 (기준 ${min}개 이상)`)
  if (falseReports > maxFalse) reasons.push(`거짓 보고 ${falseReports}칸 (기준 ${maxFalse}칸 이하) — 직접 눌러 보고 확인한 것만 fail 로 적으세요`)
  finish({
    passed: reasons.length === 0,
    message: reasons.length === 0 ? `키보드 점검 통과: 결함 ${detected.length}개 검출, 거짓 보고 ${falseReports}칸` : '키보드 점검이 기준에 못 미칩니다',
    details: reasons,
    hints: [
      '마우스를 치우고 Tab·Shift+Tab·Enter·Space 만으로 화면의 모든 기능을 끝까지 써 보세요. 특히 돈이 오가는 동작(결제)을 끝까지 해 보세요.',
      '초점이 지금 어디 있는지 눈으로 따라갈 수 있는지 보세요. axe 는 초점 표시와 키보드 동작을 거의 확인하지 못합니다.',
    ],
  })
}
