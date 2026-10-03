import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { prepareRunDir, removeRunDir, runVitest, summarize } from '../../../../scripts/lib/vitest-runner.mjs'
import { attribute, labDefectIds, resetSut } from './api-lab.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const CONFIG = path.join(here, 'vitest.config.mjs')

/** 결함 집합(defects)을 켠 앱에 대해 work/tests 의 t2- 테스트를 실행한다. support/ 는 항상 원본(starter)을 쓴다. */
async function runOnce(ctx, defects) {
  await resetSut(ctx.baseUrl)
  const dir = prepareRunDir(ctx.labDir, 't2', {
    copies: [{ from: path.join(ctx.workDir, 'tests'), to: 'tests' }, { from: path.join(ctx.labDir, 'starter', 'support'), to: 'support' }],
  })
  try {
    const r = await runVitest({
      repoRoot: ctx.repoRoot, runDir: dir, config: CONFIG, filter: 'tests/t2-',
      env: { QA_LAB_BASE_URL: ctx.baseUrl, QA_LAB_DEFECTS: defects },
    })
    return { ...r, summary: summarize(r.report) }
  } finally {
    removeRunDir(dir)
  }
}

const ctx = loadLabContext()
const none = await runOnce(ctx, 'none')
const s = none.summary

if (none.timedOut) finish({ passed: false, message: '테스트가 너무 오래 걸립니다 (90초 초과)' })
else if (s.loadError) {
  finish({ passed: false, message: 'tests/t2-*.test.mjs 를 실행하지 못했습니다', details: [s.loadError], hints: ['tests/ 폴더에 t2- 로 시작하는 테스트 파일이 있고, 문법 오류가 없는지 확인하세요.'] })
} else if (s.total === 0) {
  finish({ passed: false, message: '실행된 테스트가 없습니다', hints: ['work/tests/t2-contract.test.mjs 에 it(...) 테스트를 작성하세요.'] })
} else if (s.failed > 0) {
  // 실패 메시지에는 앱의 실제 값이 들어 있으므로 테스트 이름만 보여 준다.
  finish({
    passed: false,
    message: `결함이 없는 버전에서도 실패하는 테스트가 ${s.failed}개 있습니다`,
    details: s.failures.slice(0, 8).map((f) => f.name),
    hints: ['결함 없는 앱에서 실패하는 테스트는 기대가 명세(api/openapi.yaml)와 다르거나 준비 단계(로그인·주문 생성)가 잘못된 것입니다. 명세를 다시 읽어 보세요.'],
  })
} else {
  console.log(`  [통과] 결함 없는 버전: 테스트 ${s.total}개 모두 통과`)
  const detected = await attribute(labDefectIds(ctx), async (defects) => (await runOnce(ctx, defects)).summary.failed > 0, (id) => console.log(`  [검출] ${id}`))
  const min = ctx.pass.min_defects ?? 0
  finish({
    passed: detected.length >= min,
    message: `서로 다른 결함 ${detected.length}개 검출 (기준 ${min}개 이상), 테스트 ${s.total}개`,
    hints: [
      '계약 테스트는 응답을 명세(OpenAPI)와 대조하는 것입니다. support/contract.mjs 의 expectMatchesSpec 으로 응답마다 대조해 보세요.',
      '정상 응답(200)만 보지 마세요. 없는 주문 조회(404)나 잘못된 입력(400)의 응답도 명세에 정의되어 있습니다.',
      '명세에 없는 상태 코드(예: 500)를 받는 것 자체가 계약 위반입니다.',
    ],
  })
}
