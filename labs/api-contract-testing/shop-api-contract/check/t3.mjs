import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { operationsOf } from './api-lab.mjs'
import { validateCollection } from './collection-grade.mjs'
import { coverageOf } from './spec-ops.mjs'

const ctx = loadLabContext()
const valid = await validateCollection(ctx)
if (!valid.ok) finish(valid.result)
else {
  const cov = coverageOf(operationsOf(ctx.repoRoot), valid.none.executions)
  const minOps = ctx.pass.min_operations ?? 0
  const minStatuses = ctx.pass.min_statuses ?? 0
  console.log(`  오퍼레이션 커버리지: ${cov.operations.size}/${cov.totalOperations}`)
  console.log(`  상태 코드 커버리지: ${cov.statuses.size}/${cov.totalStatuses} (문서에 적힌 상태 코드를 실제로 받아 본 수)`)
  if (cov.uncoveredOperations.length) console.log(`  호출하지 않은 오퍼레이션: ${cov.uncoveredOperations.join(', ')}`)
  const reasons = []
  if (cov.operations.size < minOps) reasons.push(`오퍼레이션 ${cov.operations.size}개 (기준 ${minOps}개 이상)`)
  if (cov.statuses.size < minStatuses) reasons.push(`상태 코드 ${cov.statuses.size}개 (기준 ${minStatuses}개 이상)`)
  finish({
    passed: reasons.length === 0,
    message: reasons.length === 0 ? `오퍼레이션 ${cov.operations.size}개, 상태 코드 ${cov.statuses.size}개 커버 (기준 ${minOps}개·${minStatuses}개 이상)` : '커버리지가 기준에 못 미칩니다',
    details: reasons,
    hints: [
      '오류 응답(401, 404, 409 …)은 일부러 잘못된 요청을 보내야 받을 수 있습니다. API 문서(http://127.0.0.1:3000/docs)의 오퍼레이션마다 어떤 상태 코드가 적혀 있는지 보세요.',
      '관리자 API(ship·deliver)는 admin@example.com 으로 로그인한 토큰이 필요합니다. 일반 회원 토큰으로 호출하면 403 을 받아 볼 수 있습니다.',
      '요청 순서에 의존하는 흐름(주문 → 결제 → 출고 → 배송 완료 → 환불)은 앞 응답의 id 를 컬렉션 변수에 저장해 이어 쓰세요.',
    ],
  })
}
