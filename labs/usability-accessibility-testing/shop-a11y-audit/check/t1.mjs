import fs from 'node:fs'
import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { defectsForModule } from '../../../../scripts/lib/defects.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { describeErrorKind, makeConfig, runPlaywright, summarizeReport } from '../../../../scripts/lib/playwright-runner.mjs'
import { resetSut } from '../../../../scripts/lib/sut.mjs'
import { prepareRunDir, removeRunDir } from '../../../../scripts/lib/vitest-runner.mjs'
import { scanSpecProblems } from './a11y-grade.mjs'

/**
 * t1: 학습자의 axe 스캔 테스트(tests/t1-*.spec.mjs)를 차등 오라클로 채점한다.
 *  1) 결함 없음(none)에서 통과해야 유효하다 (오탐을 걸러 내지 못한 스캔은 늘 실패하므로 아무것도 검출하지 못한다)
 *  2) 이 모듈의 결함을 하나씩 켜서 실패하면 그 결함을 검출한 것으로 본다
 * 화면은 v1, 지연 없음. 요청 헤더 X-QA-Lab-Defects 는 채점기가 정한다 (앱의 프로필과 무관).
 */
const webUrl = () => process.env.QA_LAB_WEB_URL ?? 'http://127.0.0.1:8080'
const ctx = loadLabContext()
const prefix = 't1-'
const testsDir = path.join(ctx.workDir, 'tests')
const files = fs.existsSync(testsDir) ? fs.readdirSync(testsDir).filter((f) => f.startsWith(prefix) && f.endsWith('.spec.mjs')) : []

async function runWith(defects) {
  await resetSut(ctx.baseUrl)
  const dir = prepareRunDir(ctx.labDir, `t1-${defects}`, {
    // support/ 는 항상 원본(starter)을 쓴다
    copies: [{ from: testsDir, to: 'tests' }, { from: path.join(ctx.labDir, 'starter', 'support'), to: 'support' }],
    files: [{ to: 'playwright.config.mjs', content: makeConfig({ baseUrl: webUrl(), prefix, defects, executablePath: process.env.QA_LAB_CHROMIUM_PATH }) }],
  })
  try {
    const r = await runPlaywright({ repoRoot: ctx.repoRoot, runDir: dir, env: { QA_LAB_WEB_URL: webUrl(), QA_LAB_API_URL: ctx.baseUrl } })
    return { ...r, summary: summarizeReport(r.report) }
  } finally {
    removeRunDir(dir)
  }
}

const HINTS = [
  '결함 없는 화면에서도 실패한다면 사양서(apps/shop/SPEC.md §10)가 허용하는 항목까지 위반으로 세고 있는 것입니다. 원본 결과는 저장해 두고, 단언에서는 허용된 항목만 걸러 내세요. 규칙 전체를 끄면(disableRules) 진짜 문제도 놓칩니다.',
  '검출 수가 모자라면 스캔하지 않은 화면이 있는 것입니다. 로그인해야 보이는 요소, 주문 상세처럼 데이터가 있어야 열리는 화면도 스캔하세요(support/shop.mjs 의 도우미 참고).',
]

if (files.length === 0) {
  finish({ passed: false, message: 'tests/t1-*.spec.mjs 파일이 없습니다', hints: ['npm run lab 으로 작업 폴더를 만들고 work/tests/t1-axe-scan.spec.mjs 를 채우세요.'] })
} else {
  const problems = scanSpecProblems(files.map((f) => fs.readFileSync(path.join(testsDir, f), 'utf8')))
  if (problems.length) {
    finish({ passed: false, message: '스캔 테스트가 규칙에 맞지 않습니다', details: problems, hints: HINTS })
  } else {
    const base = await runWith('none')
    const s = base.summary
    if (/Executable doesn't exist|npx playwright install/.test(base.output)) {
      finish({ passed: false, message: 'Playwright 브라우저가 설치되어 있지 않습니다', hints: ['npx playwright install chromium 을 실행한 뒤 다시 채점하세요.'] })
    } else if (base.timedOut || s.loadError || s.failed > 0 || s.passed === 0) {
      const why = base.timedOut ? '시간 초과 (4분)' : s.loadError ?? (s.passed === 0 ? '통과한 테스트가 없습니다 (건너뛴 테스트는 세지 않습니다)' : `실패 ${s.failed}개`)
      for (const f of s.failures.slice(0, 6)) console.log(`  · ${f.title}: ${describeErrorKind(f.kind) ?? f.kind}`)
      finish({ passed: false, message: `결함이 없는 화면(none)에서 통과하지 못했습니다: ${why}`, details: ['결함이 없는 화면에서 통과해야 결함 검출로 셀 수 있습니다'], hints: HINTS })
    } else {
      console.log(`  [유효] 결함 없음(none)에서 테스트 ${s.passed}개 통과`)
      const detected = []
      for (const id of defectsForModule(ctx.repoRoot, ctx.lab.module)) {
        const r = await runWith(id)
        const hit = r.summary.failed > 0 && !r.summary.loadError && !r.timedOut
        console.log(`  ${hit ? '[검출]' : '[미검출]'} ${id}`)
        if (hit) detected.push(id)
      }
      const min = ctx.pass.min_defects ?? 1
      finish({
        passed: detected.length >= min,
        message: `자동 스캔으로 검출한 결함 ${detected.length}개 (기준 ${min}개 이상)`,
        details: detected.length >= min ? [] : ['키보드로만 드러나는 문제는 자동 스캔으로 잡히지 않습니다. 그것은 t3 에서 다룹니다'],
        hints: HINTS,
      })
    }
  }
}
