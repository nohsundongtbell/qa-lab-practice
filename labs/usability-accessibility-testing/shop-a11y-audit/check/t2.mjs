import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { readCsvTable } from '../../../../scripts/lib/csv.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { formatTriage, gradeTriage, parseTriage, TRIAGE_COLUMNS } from './a11y-grade.mjs'

const ctx = loadLabContext()
const table = readCsvTable(path.join(ctx.workDir, 'triage.csv'), TRIAGE_COLUMNS)
const { problems, rows } = table.errors.length ? { problems: table.errors, rows: [] } : parseTriage(table.rows)
if (problems.length) {
  finish({ passed: false, message: 'triage.csv 형식을 고쳐 주세요', details: problems.slice(0, 10), hints: [`열은 ${TRIAGE_COLUMNS.join(',')} 입니다. category 는 violation · false-positive · needs-review 중 하나입니다.`] })
} else {
  const c = gradeTriage(rows)
  for (const line of formatTriage(c)) console.log(line)
  const min = ctx.pass.min_correct ?? c.total
  finish({
    passed: c.score >= min,
    message: c.score >= min ? `분류 통과: 점수 ${c.score} (기준 ${min} 이상)` : `분류 점수 ${c.score} (기준 ${min} 이상)`,
    hints: [
      '어느 항목이 틀렸는지는 알려 주지 않습니다. 위 집계에서 가장 큰 줄부터 다시 보세요.',
      'violation 은 사양서(apps/shop/SPEC.md §10)를 어긴 것이 확실한 것, false-positive 는 도구가 잡았지만 사양상 문제가 아닌 것, needs-review 는 도구가 판정을 미뤄(axe 의 incomplete) 사람이 직접 봐야 하는 것입니다.',
      '오탐을 violation 으로 분류하면 감점됩니다. 개발자에게 가짜 버그를 보내는 비용을 생각해 보세요.',
    ],
  })
}
