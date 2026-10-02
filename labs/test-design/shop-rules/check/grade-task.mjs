import path from 'node:path'
import { readCsvTable } from '../../../../scripts/lib/csv.mjs'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { gradeCases } from '../../../../scripts/lib/grading.mjs'
import { evaluatePass, formatCaseResult, loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { RowError, TASKS } from './cases.mjs'

/** 과제 하나를 채점한다: CSV 읽기 → 행별 재현 절차 → 차등 오라클·결함 귀속 → 통과 판정. */
export async function gradeTask() {
  const ctx = loadLabContext()
  const def = TASKS[ctx.taskId]
  const file = path.join(ctx.workDir, def.file)
  const table = readCsvTable(file, def.columns)

  console.log(`케이스 표: ${def.file}${table.encoding === 'cp949' ? ' (CP949 로 읽었습니다)' : ''}`)
  if (table.errors.length) {
    return finish({ passed: false, message: `${def.file} 을(를) 읽을 수 없습니다`, details: table.errors, hints: ['starter 의 머리글(첫 줄)을 그대로 두고 그 아래에 행을 추가하세요.'] })
  }

  const cases = []
  const rowErrors = []
  for (const row of table.rows) {
    const label = `${row._line}행 ${row.name || '(이름 없음)'}`
    try {
      if (!row.name) throw new RowError('name(케이스 이름)이 비어 있습니다')
      if (!row.technique) throw new RowError('technique(사용한 기법)가 비어 있습니다')
      cases.push({ id: String(row._line), label, repro: def.toRepro(row), reset: def.reset })
    } catch (e) {
      if (!(e instanceof RowError)) throw e
      rowErrors.push(`${label}: ${e.message}`)
    }
  }
  if (rowErrors.length) {
    return finish({ passed: false, message: '형식이 잘못된 행이 있습니다', details: rowErrors, hints: ['README 의 "케이스 표 형식"을 확인하세요.'] })
  }

  if (def.reset) console.log('(이 과제는 채점하면서 DB 를 여러 번 초기화합니다)')
  const graded = await gradeCases(cases, { baseUrl: ctx.baseUrl, defectIds: ctx.defectIds })
  for (const r of graded.results) console.log(formatCaseResult(r))

  const verdict = evaluatePass(graded, ctx.pass, { repoRoot: ctx.repoRoot })
  const hints = []
  if (graded.results.some((r) => r.status === 'invalid')) hints.push(`무효 케이스는 기대값이 사양과 다른 것입니다. ${def.spec} 을(를) 다시 읽어 보세요.`)
  if (verdict.reasons.some((r) => r.includes('검출'))) hints.push('README 의 "막혔을 때" 힌트를 차례로 열어 보세요.')
  return finish({ passed: verdict.passed, message: verdict.summary, details: verdict.reasons, hints })
}
