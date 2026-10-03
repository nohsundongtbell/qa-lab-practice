import { describe, expect, it } from 'vitest'
import { classifyError, makeConfig, summarizeReport } from './playwright-runner.mjs'

const test = (status, message, expectedStatus = 'passed') => ({ status, expectedStatus, results: [{ status: status === 'expected' ? 'passed' : 'failed', error: message ? { message } : undefined }] })
const report = (specs, errors = []) => ({ suites: [{ title: 't1-a.spec.mjs', specs: [], suites: [{ title: '구매', specs }] }], errors })

describe('summarizeReport', () => {
  it('통과·실패·건너뜀을 세고 실패는 제목과 오류 종류만 남긴다', () => {
    const s = summarizeReport(report([
      { title: '성공', tests: [test('expected')] },
      { title: '값이 다름', tests: [test('unexpected', 'Error: expect(locator).toHaveText(expected)\nExpected: "100,000원"\nReceived: "50,000원"')] },
      { title: '못 찾음', tests: [test('unexpected', 'Error: locator.click: Timeout 5000ms exceeded.\n waiting for getByRole("button")')] },
      { title: '건너뜀', tests: [{ status: 'skipped', expectedStatus: 'skipped', results: [{ status: 'skipped' }] }] },
    ]))
    expect(s).toMatchObject({ total: 4, passed: 1, failed: 2, skipped: 1, loadError: null })
    expect(s.failures).toEqual([
      { title: 't1-a.spec.mjs › 구매 › 값이 다름', kind: 'assertion' },
      { title: 't1-a.spec.mjs › 구매 › 못 찾음', kind: 'timeout' },
    ])
    expect(JSON.stringify(s)).not.toContain('50,000원') // 실제 값이 새어 나가지 않는다
  })

  it('반복 실행은 반복마다 센다', () => {
    const s = summarizeReport(report([{ title: 'a', tests: [test('expected'), test('expected'), test('unexpected', 'Timeout 5000ms exceeded')] }]))
    expect(s).toMatchObject({ passed: 2, failed: 1 })
  })

  it('보고서가 없거나 로드 오류가 있으면 loadError', () => {
    expect(summarizeReport(null).loadError).toMatch(/실행하지 못했습니다/)
    expect(summarizeReport(report([], [{ message: '\nSyntaxError: Unexpected token' }])).loadError).toBe('SyntaxError: Unexpected token')
  })
})

describe('classifyError / makeConfig', () => {
  it.each([
    ['Timeout 5000ms exceeded', 'timeout'],
    ['locator.fill: Timeout 30000ms exceeded', 'timeout'],
    ['expect(received).toBe(expected)', 'assertion'],
    ["expect(locator).toHaveText(expected) failed\nCall log:\n  - waiting for getByTestId('cart-total')\n    14 × locator resolved to <dd>7,990원</dd>\n       - unexpected value \"7,990원\"", 'assertion'],
    ["expect(locator).toBeVisible() failed\nCall log:\n  - waiting for getByText('없음')", 'timeout'],
    ['ReferenceError: x is not defined', 'other'],
  ])('%s', (msg, kind) => expect(classifyError(msg)).toBe(kind))

  it('설정에 변형·지연 헤더와 파일 패턴이 들어가고, 브라우저 경로는 있을 때만 넣는다', () => {
    const c = makeConfig({ baseUrl: 'http://127.0.0.1:8080', prefix: 't2-', variant: 'v2', latency: 'unstable' })
    expect(c).toContain("'X-QA-Lab-UI-Variant': \"v2\"")
    expect(c).toContain("'X-QA-Lab-Latency': \"unstable\"")
    expect(c).toContain("'X-QA-Lab-Defects': 'none'") // 앱의 결함 프로필과 무관하게 같은 조건에서 채점
    expect(c).toContain('"t2-*.spec.mjs"')
    expect(c).toContain('launchOptions: {}')
    expect(makeConfig({ baseUrl: 'x', prefix: 't1-', executablePath: '/opt/chrome' })).toContain('"/opt/chrome"')
  })
})
