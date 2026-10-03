import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

/**
 * 학습자의 Playwright 테스트를 격리된 폴더(<랩>/.runs/…)에서 실행한다.
 * 설정 파일은 채점기가 만들어 넣는다 — 학습자의 설정(baseURL·헤더·타임아웃)과 상관없이 같은 조건에서 실행되도록.
 */

/** 채점용 playwright.config.mjs 내용. */
export function makeConfig({ baseUrl, prefix, variant = 'v1', latency = 'none', executablePath }) {
  const launch = executablePath ? `{ executablePath: ${JSON.stringify(executablePath)}, args: ['--no-sandbox'] }` : '{}'
  return `import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests',
  testMatch: ${JSON.stringify(`${prefix}*.spec.mjs`)},
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 1,
  retries: 0,
  reporter: [['json', { outputFile: 'report.json' }]],
  use: {
    baseURL: ${JSON.stringify(baseUrl)},
    headless: true,
    extraHTTPHeaders: { 'X-QA-Lab-UI-Variant': ${JSON.stringify(variant)}, 'X-QA-Lab-Latency': ${JSON.stringify(latency)}, 'X-QA-Lab-Defects': 'none' },
    launchOptions: ${launch},
  },
})
`
}

/** @returns {Promise<{ exitCode: number|null, report: object|null, output: string, timedOut: boolean }>} */
export function runPlaywright({ repoRoot, runDir, repeat = 1, timeoutMs = 240_000, env = {} }) {
  const cli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js')
  const args = [cli, 'test', '--config', path.join(runDir, 'playwright.config.mjs'), `--repeat-each=${repeat}`]
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: runDir, env: { ...process.env, CI: '1', PW_TEST_HTML_REPORT_OPEN: 'never', ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (d) => (output += d))
    child.stderr.on('data', (d) => (output += d))
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ exitCode: null, report: null, output: String(err), timedOut: false })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      let report = null
      try {
        report = JSON.parse(fs.readFileSync(path.join(runDir, 'report.json'), 'utf8'))
      } catch {
        /* 설정·문법 오류 등으로 보고서가 없을 수 있다 */
      }
      resolve({ exitCode: code, report, output, timedOut })
    })
  })
}

/**
 * 오류 종류만 알려 준다. 메시지 원문에는 앱의 실제 값(Received: …)이 들어 있어 정답을 알려 주게 되므로 숨긴다.
 * @returns {'timeout'|'assertion'|'other'}
 */
export function classifyError(message = '') {
  if (/Timeout \d+ms exceeded|waiting for (locator|getBy)|locator\.\w+: Timeout/i.test(message)) return 'timeout'
  if (/expect\(|toHaveText|toBe|toEqual|toContain|toHaveURL|toBeVisible|Expected|Received/.test(message)) return 'assertion'
  return 'other'
}

const KIND_LABEL = { timeout: '요소를 기다리다 시간 초과', assertion: '기대와 다른 값 (실제 값은 숨깁니다)', other: '실행 중 오류' }
export const describeErrorKind = (kind) => KIND_LABEL[kind]

/**
 * JSON 보고서 요약. repeat 로 반복한 실행은 (제목, 반복 번호)마다 한 번씩 센다.
 * @returns {{ total: number, passed: number, failed: number, skipped: number, failures: Array<{ title: string, kind: string }>, loadError: string|null }}
 */
export function summarizeReport(report) {
  if (!report) return { total: 0, passed: 0, failed: 0, skipped: 0, failures: [], loadError: '테스트를 실행하지 못했습니다 (설정이나 문법 오류일 수 있습니다)' }
  let passed = 0
  let failed = 0
  let skipped = 0
  const failures = []
  const walk = (suite, titles) => {
    for (const s of suite.suites ?? []) walk(s, [...titles, s.title].filter(Boolean))
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const last = t.results?.[t.results.length - 1]
        if (t.status === 'skipped' || t.expectedStatus === 'skipped' || last?.status === 'skipped') skipped++
        else if (t.status === 'expected') passed++
        else {
          failed++
          failures.push({ title: [...titles, spec.title].join(' › '), kind: classifyError(last?.error?.message ?? last?.errors?.[0]?.message ?? '') })
        }
      }
    }
  }
  for (const s of report.suites ?? []) walk(s, [s.title].filter(Boolean))
  const loadError = (report.errors ?? []).length ? String(report.errors[0].message ?? '').split('\n').find((l) => l.trim()) ?? '테스트 파일을 읽지 못했습니다' : null
  return { total: passed + failed + skipped, passed, failed, skipped, failures, loadError }
}
