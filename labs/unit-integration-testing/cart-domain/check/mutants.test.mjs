import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MUTANTS, mutantsFor, mutatedSource } from './mutants.mjs'

const labDir = path.resolve(import.meta.dirname, '..')
const ref = path.join(labDir, 'check', 'ref')

describe('뮤턴트 정의', () => {
  it('id 는 유일하고, 과제마다 정의가 있다', () => {
    expect(new Set(MUTANTS.map((m) => m.id)).size).toBe(MUTANTS.length)
    for (const t of ['t1', 't2', 't3']) expect(mutantsFor(t).length).toBeGreaterThanOrEqual(6)
  })

  it('모든 뮤턴트가 정상 구현 소스에 실제로 적용되고 소스를 바꾼다', () => {
    for (const m of MUTANTS) {
      const { file, content } = mutatedSource(ref, m)
      expect(file).toBe(m.file)
      expect(content, m.id).not.toBe(fs.readFileSync(path.join(ref, 'src', m.file), 'utf8'))
    }
  })

  it('뮤턴트를 적용해도 문법이 유효한 JS 다', async () => {
    const vm = await import('node:vm')
    for (const m of MUTANTS) {
      const { content } = mutatedSource(ref, m)
      // ESM import/export 는 vm.Script 가 받지 않으므로 SourceTextModule 대신 단순 변환으로 문법만 본다
      const stripped = content.replace(/^import .*$/gm, '').replace(/^export /gm, '')
      expect(() => new vm.Script(stripped), m.id).not.toThrow()
    }
  })

  it('starter 의 src 는 정상 구현과 같다 (학습자가 읽는 코드 = 채점 기준 코드)', () => {
    for (const f of fs.readdirSync(path.join(ref, 'src'))) {
      expect(fs.readFileSync(path.join(labDir, 'starter', 'src', f), 'utf8'), f).toBe(fs.readFileSync(path.join(ref, 'src', f), 'utf8'))
    }
  })
})
