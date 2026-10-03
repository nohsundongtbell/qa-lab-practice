/** t2 질문 정의. 정답은 채점기가 기준 시나리오로 직접 측정해 만든다. */
export const SPEC = [
  { id: 'products', kind: 'text' },
  { id: 'quote', kind: 'text' },
  { id: 'orders', kind: 'text' },
  { id: 'bottleneck_defects', kind: 'set' },
]

/**
 * 측정 결과에서 정답을 만든다 (순수 함수).
 * - baseline: 결함 없음 실행의 통계 행. 목표를 지키지 못하면 측정 환경 문제로 보고 채점하지 않는다
 * - solo: { 결함ID: 통계 행 } 결함을 하나씩 켠 실행
 * - 엔드포인트가 slow = 어느 결함 하나라도 켜면 p95 가 목표를 넘음. 병목 결함 = 켜면 목표를 깨뜨리는 결함
 * @returns {{ error: string } | { answers: object }}
 */
export function expectedAnswers({ baseline, solo }, targets, findRow) {
  const miss = (rows, t) => {
    const row = findRow(rows, t.method, t.path)
    return !row || row.requests < 3 || row.p95 > t.maxP95
  }
  for (const [name, t] of Object.entries(targets)) {
    if (miss(baseline, t)) return { error: `결함이 없는 상태에서 ${name} 의 측정값이 목표(${t.maxP95}ms)를 넘거나 요청이 모자라 채점할 수 없습니다` }
  }
  const slow = new Set()
  const defects = []
  for (const [id, rows] of Object.entries(solo)) {
    let breaks = false
    for (const [name, t] of Object.entries(targets)) {
      if (miss(rows, t)) {
        slow.add(name)
        breaks = true
      }
    }
    if (breaks) defects.push(id)
  }
  return { answers: Object.fromEntries([...Object.keys(targets).map((n) => [n, slow.has(n) ? 'slow' : 'ok']), ['bottleneck_defects', defects]]) }
}
