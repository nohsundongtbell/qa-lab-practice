import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { resetSut } from '../../../../scripts/lib/sut.mjs'
import { countExpects, findFixedSleeps, readSources } from '../../../../scripts/lib/ui-static-rules.mjs'
import { prepareRunDir, removeRunDir, runVitest, summarize } from '../../../../scripts/lib/vitest-runner.mjs'
import { classifyFailure } from './selenium-lab.mjs'

const CONFIG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vitest.config.mjs')
const MIN_EXPECTS = 4

const ctx = loadLabContext()
const { min_tests: minTests = 1, variants = ['v1'], latency = 'none', repeat = 1 } = ctx.pass
const webUrl = process.env.QA_LAB_WEB_URL ?? 'http://127.0.0.1:8080'

async function runOnce(variant) {
  await resetSut(ctx.baseUrl)
  const dir = prepareRunDir(ctx.labDir, 't1', {
    // support/ 는 항상 원본(starter)을 쓴다
    copies: [{ from: path.join(ctx.workDir, 'tests'), to: 'tests' }, { from: path.join(ctx.labDir, 'starter', 'support'), to: 'support' }],
  })
  try {
    const r = await runVitest({
      repoRoot: ctx.repoRoot, runDir: dir, config: CONFIG, filter: 'tests/t1-', timeoutMs: 180_000,
      env: { QA_LAB_WEB_URL: webUrl, QA_LAB_API_URL: ctx.baseUrl, QA_LAB_UI_VARIANT: variant, QA_LAB_LATENCY: latency },
    })
    return { ...r, summary: summarize(r.report) }
  } finally {
    removeRunDir(dir)
  }
}

const src = readSources(ctx.workDir, 't1-', '.test.mjs')
if (src.testFiles.length === 0) {
  finish({ passed: false, message: 'tests/t1-*.test.mjs 파일이 없습니다', hints: ['work/tests/ 에 t1- 로 시작하고 .test.mjs 로 끝나는 파일을 만드세요.'] })
} else {
  const reasons = []
  const expects = src.tests.reduce((n, s) => n + countExpects(s), 0)
  if (expects < MIN_EXPECTS) reasons.push(`검증(expect)이 ${expects}개입니다 (기준 ${MIN_EXPECTS}개 이상) — 화면에 나타난 결과를 확인하세요`)
  const sleeps = [...new Set(src.tests.flatMap(findFixedSleeps))]
  if (sleeps.length) reasons.push(`고정 대기(${sleeps.join(', ')})를 썼습니다 — 시간이 아니라 조건(driver.wait(until…))을 기다리세요`)

  let aborted = false
  for (const variant of variants) {
    for (let i = 1; i <= repeat && !aborted; i++) {
      const r = await runOnce(variant)
      const s = r.summary
      const label = `화면 ${variant} · 지연 ${latency} · ${i}/${repeat}회`
      if (/session not created|Unable to obtain browser driver|SessionNotCreated|Selenium Manager/i.test(`${r.output}\n${s.failures.map((f) => f.message).join('\n')}`)) {
        reasons.push('브라우저(Chrome) 또는 드라이버를 시작하지 못했습니다 — Chrome 이 설치되어 있고 인터넷에 연결되어 있는지 확인하세요(드라이버는 처음에 자동으로 받습니다)')
        console.log(`  [실패] ${label} — Chrome 을 시작하지 못했습니다`)
        aborted = true
        break
      }
      if (r.timedOut) { reasons.push(`${label}: 시간 초과`); console.log(`  [실패] ${label} — 시간 초과`); continue }
      if (s.loadError) { reasons.push(`${label}: ${s.loadError}`); console.log(`  [실패] ${label} — ${s.loadError}`); continue }
      const ok = s.failed === 0 && s.passed >= minTests
      console.log(`  ${ok ? '[통과]' : '[실패]'} ${label} — 통과 ${s.passed}/${s.total}`)
      for (const f of s.failures.slice(0, 5)) console.log(`         · ${f.name}: ${classifyFailure(f.message)}`)
      if (!ok) reasons.push(s.failed ? `${label}: 실패 ${s.failed}개` : `${label}: 통과한 테스트 ${s.passed}개 (기준 ${minTests}개 이상)`)
    }
  }
  finish({
    passed: reasons.length === 0,
    message: reasons.length === 0 ? `모든 조건에서 통과 (${variants.map((v) => `화면 ${v}`).join(', ')} · 지연 ${latency} · 각 ${repeat}회)` : '조건을 채우지 못했습니다',
    details: reasons,
    hints: [
      'Selenium 은 Playwright 처럼 자동으로 기다리지 않습니다. 요소가 나타나기를 driver.wait(until.elementLocated(…), 5000) 로 기다린 뒤 다루세요. 클릭 직후 화면이 바뀌는 것도 마찬가지입니다.',
      '화면 v2 에서 실패하면 CSS 클래스·순서에 기대고 있는 것입니다. aria-label, 버튼 글자, label 텍스트(XPath), data-testid 로 찾으세요.',
      '"기대와 다른 값"이면 사양서(apps/shop/SPEC.md)로 기대값을 다시 계산해 보세요. 실제 값은 알려 주지 않습니다.',
    ],
  })
}
