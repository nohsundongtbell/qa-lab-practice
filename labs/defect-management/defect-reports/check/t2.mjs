import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadCatalog } from '../../../../scripts/lib/defects.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { gradeReports, judgeSeverity, listReports } from './reports.mjs'

// t2: 심각도·우선순위 판단 — 재현되는 리포트마다 심각도가 팀 기준과 1단계 이내인지, 우선순위와 근거가 있는지
const ctx = loadLabContext()
const reports = listReports(ctx.workDir).filter((r) => r.errors.length === 0)
console.log('(재현 절차를 실행하면서 DB 를 여러 번 초기화합니다)')
const { byFile } = await gradeReports(reports, ctx)
const catalog = loadCatalog(ctx.repoRoot)

const judgedDefects = new Set()
const problems = []
for (const r of reports) {
  const g = byFile.get(r.file)
  if (g?.status !== 'detected' || g.defects.length === 0) {
    console.log(`  [건너뜀] ${r.file} — 재현되는 리포트만 판단합니다 (t1 을 먼저 통과하세요)`)
    continue
  }
  g.defects.forEach((id) => judgedDefects.add(id))
  const sev = judgeSeverity(r, g.defects, catalog)
  console.log(`  ${sev.ok ? '[적절]' : '[재검토]'} ${r.file} — 심각도 ${r.meta.심각도} / 우선순위 ${r.meta.우선순위}: ${sev.note}`)
  if (!sev.ok) problems.push(`${r.file}: 심각도 ${sev.note}`)
}

const min = ctx.pass.min_defects ?? 0
if (judgedDefects.size < min) problems.unshift(`재현되는 리포트가 다루는 서로 다른 결함이 ${judgedDefects.size}개입니다 (기준 ${min}개 이상)`)
finish({
  passed: problems.length === 0,
  message: `서로 다른 결함 ${judgedDefects.size}개에 대한 심각도·우선순위 판단`,
  details: problems,
  hints: ['심각도는 "사용자·사업에 미치는 영향", 우선순위는 "얼마나 빨리 고쳐야 하는가"입니다. README 의 팀 심각도 기준표로 다시 판단해 보세요.'],
})
