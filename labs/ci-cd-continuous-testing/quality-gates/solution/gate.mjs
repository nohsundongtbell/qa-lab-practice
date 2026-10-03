// t2 모범 답안 — 품질 게이트. 사용법: node gate.mjs <metrics.json>
// 종료 코드 0 = 통과, 1 = 차단. 지표가 없거나 형식이 틀리면 차단한다(fail closed).
import fs from 'node:fs'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

function evaluate(m) {
  const t = m?.tests
  const cov = m?.coverage
  const sec = m?.security
  const perf = m?.performance
  if (!t || !Array.isArray(t.failed) || !isNum(t.total)) return ['tests 지표(total, failed[])가 없거나 형식이 틀립니다']
  if (!cov || !isNum(cov.line) || !isNum(cov.baseline_line)) return ['coverage 지표(line, baseline_line)가 없거나 형식이 틀립니다']
  if (!sec || !isNum(sec.new_critical) || !isNum(sec.new_high)) return ['security 지표(new_critical, new_high)가 없거나 형식이 틀립니다']
  if (!perf || !isNum(perf.p95_ms) || !isNum(perf.baseline_p95_ms)) return ['performance 지표(p95_ms, baseline_p95_ms)가 없거나 형식이 틀립니다']
  if (typeof m.today !== 'string') return ['today(YYYY-MM-DD)가 없습니다']

  const problems = []
  if (t.total === 0) problems.push('테스트가 하나도 실행되지 않았습니다')

  // 격리(quarantine): 기한 안(until >= today)인 테스트의 실패는 경고만. 기한이 지났거나 목록에 없으면 차단.
  const quarantine = Array.isArray(m.quarantine) ? m.quarantine : []
  const isQuarantined = (name) => quarantine.some((q) => q.test === name && typeof q.until === 'string' && q.until >= m.today)
  const blocking = t.failed.filter((name) => !isQuarantined(name))
  const tolerated = t.failed.filter(isQuarantined)
  if (blocking.length) problems.push(`실패한 테스트 ${blocking.length}개: ${blocking.join(', ')}`)
  if (tolerated.length) console.log(`경고: 격리 중인 테스트가 실패했습니다 (${tolerated.join(', ')}) — 기한 안에 고치세요`)

  if (cov.line < 80) problems.push(`라인 커버리지 ${cov.line}% (기준 80% 이상)`)
  if (cov.baseline_line - cov.line > 2) problems.push(`커버리지가 기준선보다 ${(cov.baseline_line - cov.line).toFixed(1)}포인트 떨어졌습니다 (허용 2.0포인트)`)
  if (sec.new_critical + sec.new_high >= 1) problems.push(`새 critical ${sec.new_critical}개, high ${sec.new_high}개 취약점`)
  if (perf.p95_ms > perf.baseline_p95_ms * 1.2) problems.push(`p95 ${perf.p95_ms}ms 가 기준선 ${perf.baseline_p95_ms}ms 의 1.2배를 넘었습니다`)
  return problems
}

let problems
try {
  problems = evaluate(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')))
} catch (e) {
  problems = [`지표 파일을 읽지 못했습니다: ${e.message}`]
}
if (problems.length) {
  console.log(`게이트 차단:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log('게이트 통과')
