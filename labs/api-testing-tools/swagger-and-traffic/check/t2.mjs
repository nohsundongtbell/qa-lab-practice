import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { CollectionError, readCollection, runCollection } from '../../../../scripts/lib/newman-runner.mjs'
import { coverageOf, listOperations, loadSpec, matchOperation } from '../../../../scripts/lib/openapi-ops.mjs'
import { resetSut } from '../../../../scripts/lib/sut.mjs'

const ctx = loadLabContext()
const FILE = 'api.collection.json'

try {
  const collection = readCollection(path.join(ctx.workDir, FILE))
  const ops = listOperations(loadSpec(path.join(ctx.repoRoot, 'apps', 'shop', 'api', 'openapi.yaml')))
  await resetSut(ctx.baseUrl)
  const run = await runCollection({ collection, baseUrl: ctx.baseUrl, defects: 'none' })
  const cov = coverageOf(ops, run.executions)

  // 인증이 필요한 오퍼레이션이 401 을 받았다 = 토큰이 요청에 제대로 실리지 않았다
  const unauthorized = [...new Set(run.executions.filter((e) => e.status === 401 && matchOperation(ops, e.method, e.path)?.secured).map((e) => `${e.method} ${e.path}`))]
  const minOps = ctx.pass.min_operations ?? 0
  const minAssertions = ctx.pass.min_assertions ?? 0
  const failed = [...new Set(run.failures.map((f) => `${f.request} › ${f.name}`))]

  console.log(`  요청 ${run.requests}개, 검증 ${run.assertions}개 실행, 실패 ${run.failures.length}개`)
  console.log(`  오퍼레이션 커버리지: ${cov.operations.size}/${cov.totalOperations}`)
  if (cov.uncoveredOperations.length) console.log(`  호출하지 않은 오퍼레이션: ${cov.uncoveredOperations.join(', ')}`)
  console.log(`  인증이 필요한데 401 을 받은 요청: ${unauthorized.length}개`)

  const reasons = []
  if (run.assertions < minAssertions) reasons.push(`검증(pm.test) 실행 ${run.assertions}개 (기준 ${minAssertions}개 이상)`)
  if (failed.length) reasons.push(`실패한 검증 ${failed.length}개: ${failed.slice(0, 5).join(' · ')}`)
  if (cov.operations.size < minOps) reasons.push(`오퍼레이션 ${cov.operations.size}개 호출 (기준 ${minOps}개 이상)`)
  if (unauthorized.length) reasons.push(`토큰이 실리지 않은 요청 ${unauthorized.length}개: ${unauthorized.slice(0, 4).join(', ')}`)
  finish({
    passed: reasons.length === 0,
    message: reasons.length === 0 ? `명세에서 만든 컬렉션이 끝까지 실행됩니다 (요청 ${run.requests}개, 검증 ${run.assertions}개)` : '컬렉션이 기준을 채우지 못했습니다',
    details: reasons,
    hints: [
      '변환 명령(README)으로 컬렉션을 만든 뒤, 로그인 요청의 본문을 실제 이메일·비밀번호로 고치고 Tests 탭에 pm.collectionVariables.set("bearerToken", …) 를 쓰세요. 로그인 요청이 맨 앞에 와야 합니다.',
      '변환된 컬렉션의 요청 본문·경로 변수는 예시 값(<integer> 같은 것)입니다. 어떤 값을 호출해도 상관없는 검증(예: 서버 오류(5xx)가 아니다)은 컬렉션 맨 위(폴더·컬렉션의 Tests)에 한 번만 써도 모든 요청에 적용됩니다.',
      '결함 없는 앱에서 실패하는 검증은 기대가 너무 엄격한 것입니다. 예시 값으로 보낸 요청은 400·404 가 나올 수 있습니다.',
    ],
  })
} catch (err) {
  if (!(err instanceof CollectionError)) throw err
  finish({ passed: false, message: err.message, hints: [`저장소 루트에서 변환 명령을 실행해 work/${FILE} 을 만드세요 (README 의 t2).`] })
}
