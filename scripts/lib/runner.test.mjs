import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, makeRepo } from '../test-support/fixtures.mjs'
import { commandFor, pickCheckFile, runCheck } from './runner.mjs'

describe('pickCheckFile', () => {
  it('공통 .mjs 는 OS 와 무관하게 그대로', () => {
    expect(pickCheckFile('check/t1.mjs', 'win32')).toBe('check/t1.mjs')
    expect(pickCheckFile('check/t1.mjs', 'darwin')).toBe('check/t1.mjs')
  })

  it('쌍은 OS 에 맞는 쪽을 고른다', () => {
    const pair = { unix: 'check/t1.sh', windows: 'check/t1.ps1' }
    expect(pickCheckFile(pair, 'win32')).toBe('check/t1.ps1')
    expect(pickCheckFile(pair, 'darwin')).toBe('check/t1.sh')
    expect(pickCheckFile(pair, 'linux')).toBe('check/t1.sh')
  })

  it('잘못된 형식이면 null', () => {
    expect(pickCheckFile({ unix: 'a.sh' })).toBeNull()
  })
})

describe('commandFor', () => {
  it('셸 문자열 없이 인자 배열로 만든다', () => {
    expect(commandFor('/x/a.mjs')).toEqual({ cmd: process.execPath, args: ['/x/a.mjs'] })
    expect(commandFor('/x/a.sh')).toEqual({ cmd: 'sh', args: ['/x/a.sh'] })
    expect(commandFor('C:\\x\\a.ps1').args).toEqual(['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'C:\\x\\a.ps1'])
    expect(() => commandFor('a.bat')).toThrow(/실행할 수 없는/)
  })
})

describe('runCheck', () => {
  const roots = []
  afterEach(() => roots.splice(0).forEach(cleanup))

  it('환경 변수로 입력을 넘기고, 종료 코드로 통과·실패를 판정한다', () => {
    const script = `
      import fs from 'node:fs'
      const e = process.env
      fs.writeFileSync(e.QA_LAB_WORK_DIR + '/env.json', JSON.stringify({ base: e.QA_LAB_BASE_URL, task: e.QA_LAB_TASK_ID, target: e.QA_LAB_TARGET, labDir: e.QA_LAB_LAB_DIR, root: e.QA_LAB_REPO_ROOT, cwd: process.cwd() }))
      process.exit(Number(e.EXIT ?? 0))
    `
    const root = makeRepo({ 'labs/m/l/check/t1.mjs': script, 'labs/m/l/work/.keep': '' })
    roots.push(root)
    const lab = { dir: path.join(root, 'labs/m/l') }
    const task = { id: 't1', check: 'check/t1.mjs' }
    const args = { lab, task, workDir: path.join(lab.dir, 'work'), target: 'work', baseUrl: 'http://127.0.0.1:3999', repoRoot: root }

    expect(runCheck(args).passed).toBe(true)
    const seen = JSON.parse(fs.readFileSync(path.join(lab.dir, 'work/env.json'), 'utf8'))
    expect(seen).toMatchObject({ base: 'http://127.0.0.1:3999', task: 't1', target: 'work', labDir: lab.dir, root })
    expect(fs.realpathSync(seen.cwd)).toBe(fs.realpathSync(lab.dir))

    process.env.EXIT = '1'
    try {
      expect(runCheck(args).passed).toBe(false)
    } finally {
      delete process.env.EXIT
    }
  })
})
