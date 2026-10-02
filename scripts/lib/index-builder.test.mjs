import { describe, expect, it } from 'vitest'
import { load } from 'js-yaml'
import { snapshotFixture, validLabYaml } from '../test-support/fixtures.mjs'
import { buildIndex, serializeIndex } from './index-builder.mjs'

const lab = (yaml, moduleDir = 'test-design', labSlug = 'shop-pricing') => ({ moduleDir, labSlug, data: load(yaml) })

describe('buildIndex', () => {
  it('S1 모양(schemaVersion, repoUrl, ref, labs[])을 만든다', () => {
    const index = buildIndex([lab(validLabYaml)], snapshotFixture)
    expect(index).toEqual({
      schemaVersion: 1,
      repoUrl: 'https://github.com/nohsundongtbell/qa-lab-practice',
      ref: 'main',
      snapshot: { source: 'fixture@0', generatedAt: '2026-01-01' },
      labs: [
        {
          id: 'test-design/shop-pricing',
          moduleSlug: 'test-design',
          lessonSlugs: ['boundary-value-analysis'],
          title: '배송비 규칙 테스트 설계',
          path: 'labs/test-design/shop-pricing',
          status: 'beta',
          estimatedMinutes: 60,
          level: '입문',
          tools: [],
          platforms: ['macos', 'windows', 'linux'],
        },
      ],
    })
  })

  it('also_for 는 같은 id 로 모듈별 항목을 펼친다', () => {
    const yaml = `${validLabYaml}also_for:\n  - module: defect-management\n    lessons: [writing-good-defect-reports]\n`
    const labs = buildIndex([lab(yaml)], snapshotFixture).labs
    expect(labs.map((l) => [l.moduleSlug, l.id, l.lessonSlugs])).toEqual([
      ['defect-management', 'test-design/shop-pricing', ['writing-good-defect-reports']],
      ['test-design', 'test-design/shop-pricing', ['boundary-value-analysis']],
    ])
  })

  it('lessons 가 없으면 모듈 단위 실습(빈 배열)', () => {
    const yaml = validLabYaml.replace('lessons: [boundary-value-analysis]\n', '')
    expect(buildIndex([lab(yaml)], snapshotFixture).labs[0].lessonSlugs).toEqual([])
  })

  it('입력 순서와 상관없이 같은 결과를 낸다 (결정적, 시각 정보 없음)', () => {
    const a = lab(validLabYaml, 'test-design', 'a-lab')
    const b = lab(validLabYaml, 'test-design', 'b-lab')
    const c = lab(validLabYaml.replace('module: test-design', 'module: defect-management').replace('lessons: [boundary-value-analysis]', 'lessons: []'), 'defect-management', 'c-lab')
    const one = serializeIndex(buildIndex([a, b, c], snapshotFixture))
    expect(serializeIndex(buildIndex([c, b, a], snapshotFixture))).toBe(one)
    expect(one).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
    expect(one.endsWith('}\n')).toBe(true)
  })

  it('랩이 없어도 올바른 인덱스를 만든다', () => {
    expect(buildIndex([], snapshotFixture).labs).toEqual([])
  })
})
