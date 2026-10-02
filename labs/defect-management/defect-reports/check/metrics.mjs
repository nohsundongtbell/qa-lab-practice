import { readCsvTable } from '../../../../scripts/lib/csv.mjs'

const round1 = (n) => Math.round(n * 10) / 10
const days = (a, b) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000

/** README 의 "이 랩의 계산 규칙" 그대로 지표를 계산한다 (채점 기준값). */
export function computeMetrics(historyFile, sizeFile) {
  const history = readCsvTable(historyFile, ['id', 'module', 'severity', 'found_in', 'status', 'opened_at', 'resolved_at', 'reopened'])
  const sizes = readCsvTable(sizeFile, ['module', 'kloc'])
  if (history.errors.length || sizes.errors.length) throw new Error([...history.errors, ...sizes.errors].join('; '))

  const valid = history.rows.filter((r) => !['REJECTED', 'DUPLICATE'].includes(r.status))
  const bySeverity = { S1: 0, S2: 0, S3: 0, S4: 0 }
  for (const r of valid) bySeverity[r.severity]++
  const done = valid.filter((r) => ['RESOLVED', 'CLOSED'].includes(r.status))
  const resolved = valid.filter((r) => r.resolved_at)
  const density = sizes.rows.map((s) => ({ module: s.module, value: valid.filter((r) => r.module === s.module).length / Number(s.kloc) }))
  density.sort((a, b) => b.value - a.value)

  return {
    valid_defects: valid.length,
    by_severity: bySeverity,
    escape_rate_pct: round1((valid.filter((r) => r.found_in === 'production').length / valid.length) * 100),
    reopen_rate_pct: round1((done.filter((r) => r.reopened === 'Y').length / done.length) * 100),
    avg_resolution_days: round1(resolved.reduce((s, r) => s + days(r.opened_at, r.resolved_at), 0) / resolved.length),
    open_count: valid.filter((r) => r.status === 'OPEN').length,
    highest_density_module: density[0].module,
  }
}

export const METRIC_LABELS = {
  valid_defects: '유효 결함 수',
  by_severity: '심각도별 건수',
  escape_rate_pct: '결함 탈출률(%)',
  reopen_rate_pct: '재오픈률(%)',
  avg_resolution_days: '평균 해결 기간(일)',
  open_count: '미해결 건수',
  highest_density_module: '결함 밀도가 가장 높은 모듈',
}

/** 학습자 답과 비교. 숫자는 ±0.1 허용. 맞는 값을 알려 주지는 않는다. */
export function compareMetrics(answer, expected) {
  const results = []
  for (const [key, want] of Object.entries(expected)) {
    const got = answer?.[key]
    let ok
    if (key === 'by_severity') ok = got && typeof got === 'object' && ['S1', 'S2', 'S3', 'S4'].every((s) => Number(got[s]) === want[s] && got[s] !== null && got[s] !== '')
    else if (typeof want === 'number') ok = got !== null && got !== undefined && got !== '' && Math.abs(Number(got) - want) <= 0.1 + 1e-9
    else ok = typeof got === 'string' && got.trim() === want
    results.push({ key, label: METRIC_LABELS[key], ok, missing: got === null || got === undefined || got === '' })
  }
  return results
}
