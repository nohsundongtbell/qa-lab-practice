/**
 * 품질 게이트 시나리오. 기대 판정(expect: 'pass' | 'block')은 README 의 정책 표에서 손으로 정했다.
 * (기준 구현 gate-ref.mjs 와 일치하는지는 테스트가 따로 확인한다 — 정답을 두 곳에서 정해 서로 검증한다.)
 */
const base = () => ({
  today: '2026-10-03',
  tests: { total: 120, failed: [] },
  quarantine: [],
  coverage: { line: 85, baseline_line: 85 },
  security: { new_critical: 0, new_high: 0 },
  performance: { p95_ms: 100, baseline_p95_ms: 100 },
})
const make = (patch) => {
  const m = base()
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('.')
    const last = keys.pop()
    const target = keys.reduce((o, k) => o[k], m)
    if (value === undefined) delete target[last]
    else target[last] = value
  }
  return m
}

export const SCENARIOS = [
  { name: '모두 정상', metrics: make({}), expect: 'pass' },
  { name: '실패한 테스트 1개', metrics: make({ 'tests.failed': ['checkout > 반올림'] }), expect: 'block' },
  { name: '실패한 테스트 3개', metrics: make({ 'tests.failed': ['a', 'b', 'c'] }), expect: 'block' },
  { name: '테스트가 하나도 실행되지 않음(total 0)', metrics: make({ 'tests.total': 0 }), expect: 'block' },
  { name: '커버리지 정확히 80.0%', metrics: make({ 'coverage.line': 80, 'coverage.baseline_line': 80 }), expect: 'pass' },
  { name: '커버리지 79.9%', metrics: make({ 'coverage.line': 79.9, 'coverage.baseline_line': 79.9 }), expect: 'block' },
  { name: '커버리지 하락 정확히 2.0포인트(85 → 83)', metrics: make({ 'coverage.line': 83, 'coverage.baseline_line': 85 }), expect: 'pass' },
  { name: '커버리지 하락 2.5포인트(85 → 82.5)', metrics: make({ 'coverage.line': 82.5, 'coverage.baseline_line': 85 }), expect: 'block' },
  { name: '커버리지 상승(80 → 90)', metrics: make({ 'coverage.line': 90, 'coverage.baseline_line': 80 }), expect: 'pass' },
  { name: '커버리지가 80% 미만이지만 기준선보다 올랐다(75 → 78)', metrics: make({ 'coverage.line': 78, 'coverage.baseline_line': 75 }), expect: 'block' },
  { name: '새 critical 취약점 1개', metrics: make({ 'security.new_critical': 1 }), expect: 'block' },
  { name: '새 high 취약점 1개', metrics: make({ 'security.new_high': 1 }), expect: 'block' },
  { name: 'p95 정확히 기준선의 1.2배(100 → 120)', metrics: make({ 'performance.p95_ms': 120 }), expect: 'pass' },
  { name: 'p95 기준선의 1.21배(100 → 121)', metrics: make({ 'performance.p95_ms': 121 }), expect: 'block' },
  { name: 'p95 개선(100 → 60)', metrics: make({ 'performance.p95_ms': 60 }), expect: 'pass' },
  { name: '실패한 테스트가 격리 중(기한 안)', metrics: make({ 'tests.failed': ['flaky > 타이머'], quarantine: [{ test: 'flaky > 타이머', until: '2026-10-20' }] }), expect: 'pass' },
  { name: '격리 기한 마지막 날(오늘까지)', metrics: make({ 'tests.failed': ['flaky > 타이머'], quarantine: [{ test: 'flaky > 타이머', until: '2026-10-03' }] }), expect: 'pass' },
  { name: '격리 기한이 하루 지남', metrics: make({ 'tests.failed': ['flaky > 타이머'], quarantine: [{ test: 'flaky > 타이머', until: '2026-10-02' }] }), expect: 'block' },
  { name: '격리된 테스트 하나와 격리 안 된 실패 하나', metrics: make({ 'tests.failed': ['flaky > 타이머', 'checkout > 반올림'], quarantine: [{ test: 'flaky > 타이머', until: '2026-10-20' }] }), expect: 'block' },
  { name: '격리 목록에 있지만 이름이 다른 테스트가 실패', metrics: make({ 'tests.failed': ['flaky > 타이머2'], quarantine: [{ test: 'flaky > 타이머', until: '2026-10-20' }] }), expect: 'block' },
  { name: '격리 중인 테스트가 통과(실패 목록에 없음)', metrics: make({ quarantine: [{ test: 'flaky > 타이머', until: '2026-10-20' }] }), expect: 'pass' },
  { name: '격리 중 실패가 있어도 커버리지 미달이면 차단', metrics: make({ 'tests.failed': ['flaky > 타이머'], quarantine: [{ test: 'flaky > 타이머', until: '2026-10-20' }], 'coverage.line': 70, 'coverage.baseline_line': 70 }), expect: 'block' },
  { name: '지표 누락: coverage 없음', metrics: make({ coverage: undefined }), expect: 'block' },
  { name: '지표 누락: performance.baseline_p95_ms 없음', metrics: make({ 'performance.baseline_p95_ms': undefined }), expect: 'block' },
  { name: '지표 형식 오류: 커버리지가 문자열', metrics: make({ 'coverage.line': '85%' }), expect: 'block' },
  { name: '깨진 JSON 파일', raw: '{ "tests": ', expect: 'block' },
]
