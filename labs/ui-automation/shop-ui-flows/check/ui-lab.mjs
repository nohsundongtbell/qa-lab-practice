import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { describeErrorKind, makeConfig, runPlaywright, summarizeReport } from '../../../../scripts/lib/playwright-runner.mjs'
import { resetSut } from '../../../../scripts/lib/sut.mjs'
import { prepareRunDir, removeRunDir } from '../../../../scripts/lib/vitest-runner.mjs'
import { countExpects, findFixedSleeps, readSources, usesFixtureApi, usesPageObject } from '../../../../scripts/lib/ui-static-rules.mjs'

/** 웹 주소는 API 주소와 별개다 (.env 의 WEB_PORT). 채점기는 QA_LAB_WEB_URL 이 없으면 기본 8080 을 쓴다. */
const webUrl = () => process.env.QA_LAB_WEB_URL ?? 'http://127.0.0.1:8080'

/** 과제별 정적 규칙. 실행 결과로 판정하기 어려운 "방법"만 본다 (README 에 그대로 적혀 있다). */
const RULES = {
  t1: { minExpects: 4 },
  t2: { minExpects: 3 },
  t3: { minExpects: 3, noSleep: true, pageObject: true },
  t4: { minExpects: 3, fixtures: true },
}

function staticProblems(taskId, src) {
  const rule = RULES[taskId]
  const problems = []
  if (src.testFiles.length === 0) return [`tests/${taskId}-*.spec.mjs 파일이 없습니다`]
  const expects = src.tests.reduce((n, s) => n + countExpects(s), 0)
  if (expects < rule.minExpects) problems.push(`검증(expect)이 ${expects}개입니다 (기준 ${rule.minExpects}개 이상) — 화면에 나타난 결과를 확인하세요`)
  if (rule.noSleep) {
    const sleeps = [...new Set(src.tests.concat(Object.values(src.pages)).flatMap(findFixedSleeps))]
    if (sleeps.length) problems.push(`고정 대기(${sleeps.join(', ')})를 썼습니다 — 시간이 아니라 조건을 기다리세요`)
  }
  if (rule.pageObject && !usesPageObject(src.tests, src.pages)) problems.push('pages/ 의 페이지 객체(class)를 가져와 쓰지 않았습니다')
  if (rule.fixtures && !src.tests.some(usesFixtureApi)) problems.push('fixture API(/__admin/fixtures/…)로 테스트 데이터를 준비하지 않았습니다')
  return problems
}

/** 한 조건(변형·지연·반복)에서 과제의 테스트를 실행한다. */
async function runCondition(ctx, { variant, latency, repeat }) {
  await resetSut(ctx.baseUrl)
  const prefix = `${ctx.taskId}-`
  const dir = prepareRunDir(ctx.labDir, ctx.taskId, {
    // support/ 는 항상 원본(starter)을 쓴다. 학습자가 주소·계정 상수를 바꿔 조건을 흔들지 못하게.
    copies: [...['tests', 'pages'].map((d) => ({ from: path.join(ctx.workDir, d), to: d })), { from: path.join(ctx.labDir, 'starter', 'support'), to: 'support' }],
    files: [{ to: 'playwright.config.mjs', content: makeConfig({ baseUrl: webUrl(), prefix, variant, latency, executablePath: process.env.QA_LAB_CHROMIUM_PATH }) }],
  })
  try {
    const r = await runPlaywright({ repoRoot: ctx.repoRoot, runDir: dir, repeat, env: { QA_LAB_WEB_URL: webUrl(), QA_LAB_API_URL: ctx.baseUrl } })
    return { ...r, summary: summarizeReport(r.report) }
  } finally {
    removeRunDir(dir)
  }
}

export async function gradeUiTask() {
  const ctx = loadLabContext()
  const { min_tests: minTests = 1, variants = ['v1'], latency = 'none', repeat = 1 } = ctx.pass
  const src = readSources(ctx.workDir, `${ctx.taskId}-`)
  const reasons = staticProblems(ctx.taskId, src)
  if (src.testFiles.length === 0) return finish({ passed: false, message: reasons[0], hints: [`work/tests/ 에 ${ctx.taskId}- 로 시작하고 .spec.mjs 로 끝나는 파일을 만드세요.`] })

  let ran = 0
  for (const variant of variants) {
    const r = await runCondition(ctx, { variant, latency, repeat })
    const label = `화면 ${variant} · 지연 ${latency}${repeat > 1 ? ` · ${repeat}회 반복` : ''}`
    const s = r.summary
    if (/Executable doesn't exist|npx playwright install/.test(r.output)) {
      return finish({ passed: false, message: 'Playwright 브라우저가 설치되어 있지 않습니다', hints: ['npx playwright install chromium 을 실행한 뒤 다시 채점하세요.'] })
    }
    if (r.timedOut) {
      reasons.push(`${label}: 시간 초과 (4분)`)
      continue
    }
    if (s.loadError) {
      reasons.push(`${label}: ${s.loadError}`)
      continue
    }
    const need = minTests * repeat
    const ok = s.failed === 0 && s.skipped === 0 && s.passed >= need
    console.log(`  ${ok ? '[통과]' : '[실패]'} ${label} — 통과 ${s.passed}/${s.total}`)
    for (const f of s.failures.slice(0, 6)) console.log(`         · ${f.title}: ${describeErrorKind(f.kind) ?? f.kind}`)
    if (s.skipped) console.log(`         · 건너뛴 테스트 ${s.skipped}개 (test.skip · fixme 는 통과로 세지 않습니다)`)
    if (s.failed) reasons.push(`${label}: 실패 ${s.failed}개`)
    else if (s.skipped || s.passed < need) reasons.push(`${label}: 통과한 테스트 ${Math.floor(s.passed / repeat)}개 (기준 ${minTests}개 이상, 건너뛴 것은 제외)`)
    else ran++
  }
  finish({
    passed: reasons.length === 0 && ran === variants.length,
    message: reasons.length === 0 ? `모든 조건에서 통과 (${variants.map((v) => `화면 ${v}`).join(', ')}${latency !== 'none' ? ` · 지연 ${latency}` : ''}${repeat > 1 ? ` · ${repeat}회 반복` : ''})` : '조건을 채우지 못했습니다',
    details: reasons,
    hints: HINTS[ctx.taskId],
  })
}

const HINTS = {
  t1: ['로그인 → 상품 담기 → 장바구니 금액 → 주문 → 주문 상태 순서로 화면에서 확인하세요. 역할과 이름으로 찾는 로케이터(getByRole, getByLabel)를 우선 쓰세요.', '"기대와 다른 값"이면 사양서(apps/shop/SPEC.md)로 기대값을 다시 계산해 보세요. 실제 값은 알려 주지 않습니다.'],
  t2: ['화면 v2 에서 실패한다면 CSS 클래스·순서(nth)·XPath 에 기대고 있는 것입니다. 사용자가 보는 이름(역할·레이블·글자)이나 data-testid 로 찾으세요.', '내 컴퓨터에서 v2 를 보려면 http://127.0.0.1:8080/?ui=v2 를 열거나 테스트에서 extraHTTPHeaders 로 X-QA-Lab-UI-Variant: v2 를 보내세요.'],
  t3: ['고정 대기(waitForTimeout)를 지우고 Playwright 의 자동 대기·웹 우선 단언(await expect(locator).toBeVisible())에 맡기세요. 텍스트를 한 번 읽어 비교(innerText 후 expect(값))하는 코드는 로딩 전에 읽어 흔들립니다.', '지연 환경을 직접 보려면 테스트에서 extraHTTPHeaders 로 X-QA-Lab-Latency: unstable 을 보내세요.'],
  t4: ['화면을 여러 번 눌러야 만들 수 있는 상태는 fixture API(POST /__admin/fixtures/orders)로 한 번에 만드세요. 만든 주문의 id 로 주문 상세 화면(#/orders/<id>)을 바로 엽니다.', '테스트는 서로 독립이어야 합니다. 2번 반복 실행해도 통과하도록, 기존 데이터의 번호를 가정하지 말고 fixture 가 돌려준 id 를 쓰세요.'],
}
