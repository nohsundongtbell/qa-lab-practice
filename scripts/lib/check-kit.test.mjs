import { describe, expect, it } from 'vitest'
import { checkEnv, finish, formatResult } from './check-kit.mjs'

describe('checkEnv', () => {
  it('QA_LAB_* 환경 변수를 읽고 기본값을 채운다', () => {
    expect(checkEnv({ QA_LAB_BASE_URL: 'http://x', QA_LAB_WORK_DIR: '/w', QA_LAB_TASK_ID: 't2' })).toMatchObject({ baseUrl: 'http://x', workDir: '/w', taskId: 't2', target: 'work' })
    expect(checkEnv({}).baseUrl).toBe('http://127.0.0.1:3000')
  })
})

describe('formatResult', () => {
  it('통과 시 힌트를 보여 주지 않는다', () => {
    expect(formatResult({ passed: true, message: '결함 3개 검출', hints: ['무시됨'] })).toBe('[통과] 결함 3개 검출')
  })

  it('실패 시 세부 항목과 힌트를 보여 준다', () => {
    expect(formatResult({ passed: false, message: '결함 1개만 검출', details: ['DF 한 개'], hints: ['경계 바로 위·아래 값을 넣어 보세요'] })).toBe(
      '[실패] 결함 1개만 검출\n  - DF 한 개\n  힌트: 경계 바로 위·아래 값을 넣어 보세요',
    )
  })
})

describe('finish', () => {
  it('출력하고 종료 코드(0/1)를 정한다', () => {
    const out = []
    const codes = []
    expect(finish({ passed: true, message: 'ok' }, { out: (s) => out.push(s), exit: (c) => codes.push(c) })).toBe(true)
    expect(finish({ passed: false, message: 'no' }, { out: (s) => out.push(s), exit: (c) => codes.push(c) })).toBe(false)
    expect(codes).toEqual([0, 1])
    expect(out).toEqual(['[통과] ok', '[실패] no'])
  })
})
