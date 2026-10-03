import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { applyMutation, prepareRunDir, removeRunDir, summarize } from './vitest-runner.mjs'

const dirs = []
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })))

describe('applyMutation', () => {
  it('첫 번째 일치만 바꾼다', () => {
    expect(applyMutation('a >= 1; b >= 2', { id: 'X', from: '>=', to: '>' })).toBe('a > 1; b >= 2')
  })
  it('바꿀 곳이 없으면 던진다 (뮤턴트 정의가 낡았다는 신호)', () => {
    expect(() => applyMutation('abc', { id: 'X', from: 'zzz', to: 'y' })).toThrow(/뮤턴트 X/)
    expect(() => applyMutation('abc', { id: 'Y', from: 'abc', to: 'abc' })).toThrow(/바뀌지 않았습니다/)
  })
})

describe('prepareRunDir', () => {
  it('랩 폴더 아래 .runs 에 만들고 파일을 채우며, 없는 원본은 건너뛴다', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-run-'))
    dirs.push(base)
    fs.mkdirSync(path.join(base, 'src'))
    fs.writeFileSync(path.join(base, 'src', 'a.mjs'), 'A')
    const dir = prepareRunDir(base, 't1', { copies: [{ from: path.join(base, 'src'), to: 'src' }, { from: path.join(base, 'nope'), to: 'x' }], files: [{ to: 'src/b.mjs', content: 'B' }] })
    expect(dir.startsWith(path.join(base, '.runs'))).toBe(true)
    expect(fs.readFileSync(path.join(dir, 'src', 'a.mjs'), 'utf8')).toBe('A')
    expect(fs.readFileSync(path.join(dir, 'src', 'b.mjs'), 'utf8')).toBe('B')
    expect(fs.existsSync(path.join(dir, 'x'))).toBe(false)
    removeRunDir(dir)
    expect(fs.existsSync(dir)).toBe(false)
  })
  it('실행마다 다른 폴더를 쓴다 (병렬 실행 충돌 방지)', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-run-'))
    dirs.push(base)
    expect(prepareRunDir(base, 't1')).not.toBe(prepareRunDir(base, 't1'))
  })
})

describe('summarize', () => {
  it('실패한 테스트의 이름과 첫 줄 메시지를 모은다', () => {
    const s = summarize({
      numTotalTests: 3, numPassedTests: 2, numFailedTests: 1,
      testResults: [{ status: 'failed', assertionResults: [{ status: 'passed', fullName: 'a' }, { status: 'failed', fullName: 'b 테스트', failureMessages: ['AssertionError: x\n  at ...'] }] }],
    })
    expect(s).toMatchObject({ total: 3, passed: 2, failed: 1, loadError: null })
    expect(s.failures).toEqual([{ name: 'b 테스트', message: 'AssertionError: x' }])
  })
  it('테스트 파일 자체가 깨지면 loadError', () => {
    expect(summarize({ numTotalTests: 0, numFailedTests: 0, testResults: [{ status: 'failed', message: '\nSyntaxError: nope\n', assertionResults: [] }] }).loadError).toBe('SyntaxError: nope')
  })
  it('보고서가 없으면 loadError', () => {
    expect(summarize(null).loadError).toMatch(/실행하지 못했습니다/)
  })
})
