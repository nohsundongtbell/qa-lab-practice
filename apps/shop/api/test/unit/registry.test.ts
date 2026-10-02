import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { isDefectOn, loadCatalogIds, loadDefectSettings, parseDefectHeader, resolveProfile, setDefaultActiveDefects } from '../../src/defects/registry.js'
import { defectsDir, withDefects } from '../helpers.js'

describe('결함 프로필', () => {
  it('none 은 비어 있고, 프로필은 누적된다', () => {
    const none = resolveProfile(defectsDir, 'none')
    const beginner = resolveProfile(defectsDir, 'beginner')
    const intermediate = resolveProfile(defectsDir, 'intermediate')
    const advanced = resolveProfile(defectsDir, 'advanced')
    expect(none.size).toBe(0)
    for (const id of beginner) expect(intermediate.has(id)).toBe(true)
    for (const id of intermediate) expect(advanced.has(id)).toBe(true)
  })

  it('카탈로그의 모든 결함은 정확히 한 프로필 파일에 등록되어 있다', () => {
    const ids = loadCatalogIds(defectsDir)
    const seen = new Map<string, string>()
    for (const p of ['none', 'beginner', 'intermediate', 'advanced']) {
      const file = loadYaml(fs.readFileSync(path.join(defectsDir, 'profiles', `${p}.yaml`), 'utf8')) as { defects?: string[] }
      for (const id of file.defects ?? []) {
        expect(seen.has(id), `${id} 가 ${seen.get(id)} 과 ${p} 에 중복`).toBe(false)
        seen.set(id, p)
      }
    }
    expect([...seen.keys()].sort()).toEqual([...ids].sort())
  })

  it('알 수 없는 프로필은 거부한다', () => {
    expect(() => resolveProfile(defectsDir, 'expert')).toThrow(/알 수 없는 결함 프로필/)
  })

  it('DEFECTS_ON / DEFECTS_OFF 로 덮어쓴다', () => {
    const s = loadDefectSettings({ dir: defectsDir, profile: 'beginner', on: ['DF-007'], off: ['DF-001'] })
    expect(s.active.has('DF-007')).toBe(true)
    expect(s.active.has('DF-001')).toBe(false)
    expect(() => loadDefectSettings({ dir: defectsDir, profile: 'none', on: ['DF-999'] })).toThrow(/catalog.yaml 에 없는/)
  })
})

describe('X-QA-Lab-Defects 헤더 해석', () => {
  const known = new Set(['DF-001', 'DF-002'])
  it('헤더 없음 / none / 목록', () => {
    expect(parseDefectHeader(undefined, known)).toBeUndefined()
    expect(parseDefectHeader('none', known)).toEqual(new Set())
    expect(parseDefectHeader('', known)).toEqual(new Set())
    expect(parseDefectHeader(' DF-001 , DF-002 ', known)).toEqual(new Set(['DF-001', 'DF-002']))
  })
  it('모르는 ID 는 거부', () => {
    expect(() => parseDefectHeader('DF-003', known)).toThrow()
  })
})

describe('isDefectOn', () => {
  it('요청 문맥이 기본 활성 집합보다 우선한다', () => {
    setDefaultActiveDefects(new Set(['DF-001']))
    expect(isDefectOn('DF-001')).toBe(true)
    expect(withDefects([], () => isDefectOn('DF-001'))).toBe(false)
    setDefaultActiveDefects(new Set())
  })
})
