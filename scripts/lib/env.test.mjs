import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ensureEnvFile, parseEnv, setEnvVar } from './env.mjs'

describe('parseEnv', () => {
  it('주석·빈 줄을 무시하고 따옴표를 벗긴다', () => {
    expect(parseEnv('# 주석\n\nA=1\nB = "two"\r\nC=\n#D=4\n')).toEqual({ A: '1', B: 'two', C: '' })
  })
})

describe('setEnvVar', () => {
  it('해당 줄만 바꾸고 나머지(주석 포함)는 그대로 둔다', () => {
    const text = '# 설명\nDEFECT_PROFILE=none\nWEB_PORT=8080\n'
    expect(setEnvVar(text, 'DEFECT_PROFILE', 'beginner')).toBe('# 설명\nDEFECT_PROFILE=beginner\nWEB_PORT=8080\n')
  })

  it('없으면 끝에 추가한다', () => {
    expect(setEnvVar('A=1\n', 'B', '2')).toBe('A=1\nB=2\n')
    expect(setEnvVar('A=1', 'B', '2')).toBe('A=1\nB=2\n')
  })

  it('주석 처리된 줄은 값으로 보지 않는다', () => {
    expect(setEnvVar('#DEFECT_PROFILE=x\n', 'DEFECT_PROFILE', 'none')).toBe('#DEFECT_PROFILE=x\nDEFECT_PROFILE=none\n')
  })

  it('비슷한 이름의 다른 키를 건드리지 않는다', () => {
    expect(setEnvVar('DEFECTS_ON=a\n', 'DEFECT_PROFILE', 'none')).toBe('DEFECTS_ON=a\nDEFECT_PROFILE=none\n')
  })
})

describe('ensureEnvFile', () => {
  it('.env 가 없을 때만 .env.example 을 복사한다', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-env-'))
    const p = { env: path.join(dir, '.env'), envExample: path.join(dir, '.env.example') }
    fs.writeFileSync(p.envExample, 'A=1\n')
    expect(ensureEnvFile(p)).toBe(true)
    fs.writeFileSync(p.env, 'A=changed\n')
    expect(ensureEnvFile(p)).toBe(false)
    expect(fs.readFileSync(p.env, 'utf8')).toBe('A=changed\n')
    fs.rmSync(dir, { recursive: true })
  })
})
