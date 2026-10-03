import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { SPEC as PCAP_SPEC } from './pcap-analysis.mjs'
import { SPEC as SCENARIO_SPEC } from './scenario.mjs'

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const yaml = (...p) => load(fs.readFileSync(path.join(lab, ...p), 'utf8'))

describe('답안 파일의 항목은 채점기의 질문과 같다', () => {
  it.each([
    ['starter', 't1-scenario.yaml', SCENARIO_SPEC],
    ['solution', 't1-scenario.yaml', SCENARIO_SPEC],
    ['starter', 't4-answers.yaml', PCAP_SPEC],
    ['solution', 't4-answers.yaml', PCAP_SPEC],
  ])('%s/%s', (dir, file, spec) => {
    expect(Object.keys(yaml(dir, file)).sort()).toEqual(spec.map((q) => q.id).sort())
  })

  it('starter 의 답은 모두 비어 있다 (시작 파일만으로 통과하지 않는다)', () => {
    for (const file of ['t1-scenario.yaml', 't4-answers.yaml']) {
      for (const v of Object.values(yaml('starter', file))) expect(v === null || (Array.isArray(v) && v.length === 0)).toBe(true)
    }
  })
})

describe('starter 애드온', () => {
  it('아무 동작도 하지 않는 뼈대이고 addons 를 내보낸다', () => {
    const src = fs.readFileSync(path.join(lab, 'starter', 'addon.py'), 'utf8')
    expect(src).toContain('addons = [')
    expect(src).not.toMatch(/X-Proxied-By["']\]\s*=/)
  })
})
