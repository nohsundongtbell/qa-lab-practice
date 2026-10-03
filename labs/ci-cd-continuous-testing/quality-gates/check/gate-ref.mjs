/** 기준 구현(채점기 내부 검증용). 정책은 README 의 표 G1~G7. 학습자 gate.mjs 의 정답을 알려 주지 않는다. */
export function decide(m) {
  const num = (v) => typeof v === 'number' && Number.isFinite(v)
  const t = m?.tests
  const cov = m?.coverage
  const sec = m?.security
  const perf = m?.performance
  if (!t || !Array.isArray(t.failed) || !num(t.total)) return 'block'
  if (!cov || !num(cov.line) || !num(cov.baseline_line)) return 'block'
  if (!sec || !num(sec.new_critical) || !num(sec.new_high)) return 'block'
  if (!perf || !num(perf.p95_ms) || !num(perf.baseline_p95_ms)) return 'block'
  if (typeof m.today !== 'string') return 'block'
  if (t.total === 0) return 'block'
  const quarantine = Array.isArray(m.quarantine) ? m.quarantine : []
  const covered = (name) => quarantine.some((q) => q.test === name && typeof q.until === 'string' && q.until >= m.today)
  if (t.failed.some((name) => !covered(name))) return 'block'
  if (cov.line < 80) return 'block'
  if (cov.baseline_line - cov.line > 2) return 'block'
  if (sec.new_critical + sec.new_high >= 1) return 'block'
  if (perf.p95_ms > perf.baseline_p95_ms * 1.2) return 'block'
  return 'pass'
}
