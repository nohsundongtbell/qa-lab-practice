import { describe, expect, it } from 'vitest'
import { defectsForModule, loadCatalog, profileDefects } from './defects.mjs'
import { repoRoot } from './paths.mjs'

describe('profileDefects (실제 저장소)', () => {
  it('누적 프로필: none ⊂ beginner ⊂ intermediate ⊆ advanced', () => {
    const [none, b, i, a] = ['none', 'beginner', 'intermediate', 'advanced'].map((p) => profileDefects(repoRoot, p))
    expect(none).toEqual([])
    expect(b.length).toBeGreaterThan(0)
    for (const id of b) expect(i).toContain(id)
    for (const id of i) expect(a).toContain(id)
  })

  it('모든 프로필 결함이 카탈로그에 있다', () => {
    const catalog = loadCatalog(repoRoot)
    for (const id of profileDefects(repoRoot, 'advanced')) expect(catalog.has(id), id).toBe(true)
  })

  it('알 수 없는 프로필은 거부', () => {
    expect(() => profileDefects(repoRoot, 'expert')).toThrow(/알 수 없는/)
  })
})

describe('defectsForModule', () => {
  it('카탈로그의 modules 로 모듈에 연결된 결함을 찾는다', () => {
    expect(defectsForModule(repoRoot, 'performance-testing-tools')).toEqual(['DF-018', 'DF-019'])
    expect(defectsForModule(repoRoot, 'api-contract-testing')).toEqual(['DF-013', 'DF-014', 'DF-015', 'DF-016', 'DF-017'])
    expect(defectsForModule(repoRoot, 'no-such-module')).toEqual([])
  })
})
