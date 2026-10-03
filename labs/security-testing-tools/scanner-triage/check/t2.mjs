import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { readCsvTable } from '../../../../scripts/lib/csv.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { checkScopeFile } from './common.mjs'
import { buildReport } from './report-gen.mjs'
import { formatGrade, gradeTriage, parseTriage } from './triage.mjs'

const ctx = loadLabContext()
const scope = checkScopeFile(ctx.workDir)
if (scope.length) {
  finish({ passed: false, message: '허가·범위 체크리스트(t1)를 먼저 완료하세요. 범위가 정해지기 전에는 보안 실습을 시작하지 않습니다', details: scope })
} else {
  // 정답은 항상 원본 샘플 코드로 만든 리포트에서 계산한다 (작업 폴더의 사본을 바꿔도 소용없다)
  const { findings, key } = buildReport()
  const table = readCsvTable(path.join(ctx.workDir, 'triage.csv'), ['id', 'verdict', 'duplicate_of'])
  const rows = table.errors.length ? null : table.rows
  if (!rows) finish({ passed: false, message: 'triage.csv 를 읽지 못했습니다', details: table.errors.slice(0, 5) })
  if (rows) {
    const { problems, byId } = parseTriage(rows, findings.map((f) => f.id))
    if (problems.length) {
      finish({ passed: false, message: 'triage.csv 형식을 고쳐 주세요', details: problems.slice(0, 10), hints: ['열은 id,verdict,duplicate_of,note 입니다. verdict 는 TP·FP·DUP, DUP 이면 duplicate_of 에 같은 문제의 다른 항목 id 를 적습니다.'] })
    } else {
      const c = gradeTriage(byId, key)
      for (const line of formatGrade(c)) console.log(line)
      const minCorrect = ctx.pass.min_correct ?? c.total
      const maxMissed = ctx.pass.max_missed_tp ?? 0
      const reasons = []
      if (c.correct < minCorrect) reasons.push(`정답 ${c.correct}건 (기준 ${minCorrect}건 이상)`)
      if (c.missedTp > maxMissed) reasons.push(`놓친 진짜 취약점 ${c.missedTp}건 (기준 ${maxMissed}건 이하) — 오탐보다 놓침이 더 위험합니다`)
      finish({
        passed: reasons.length === 0,
        message: reasons.length === 0 ? `분류 통과: 정답 ${c.correct}/${c.total}, 놓친 진짜 취약점 ${c.missedTp}건` : '분류가 기준에 못 미칩니다',
        details: reasons,
        hints: [
          '어떤 항목이 틀렸는지는 알려 주지 않습니다(하나씩 바꿔 보며 맞히는 것을 막기 위해서). 위 집계에서 가장 큰 줄부터 다시 보세요.',
          '판정은 리포트의 문구가 아니라 코드로 합니다. 리포트가 가리키는 파일·줄을 scan-target 에서 직접 열어, 입력이 어디서 와서 어디로 가는지, 방어 코드가 있는지 확인하세요.',
          '같은 파일·같은 줄·같은 CWE 는 같은 문제입니다. 번호가 가장 작은 항목만 TP/FP 로 판정하고 나머지는 DUP 로 묶으세요.',
        ],
      })
    }
  }
}
