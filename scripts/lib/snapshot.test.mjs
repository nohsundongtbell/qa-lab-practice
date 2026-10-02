import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { snapshotFixture } from '../test-support/fixtures.mjs'
import { paths } from './paths.mjs'
import { buildSnapshot, diffSnapshots, findLesson, labIneligibleReason, lessonUrl, loadSnapshot } from './snapshot.mjs'

const source = {
  meta: {
    source: 'src@1', generatedAt: '2026-02-02', stages: [{ id: 's1', slug: 'one', order: 1, title: '이름' }],
    counts: { comingSoonModules: ['m59'] },
  },
  modules: [
    {
      id: 'm03', slug: 'test-design', title: '테스트 설계', stage: 's1', stageSlug: 'one', order: 1, level: '중급', plannedHours: 4,
      writtenHours: 2, lessonCount: 1, status: 'published', hasOverview: true, prerequisites: [], url: '/module/test-design/',
      lessons: [{ id: 'l1', slug: 'a', order: 1, url: '/lesson/test-design/a/' }],
    },
  ],
}

describe('buildSnapshot', () => {
  it('이름(title)과 스테이지 이름은 복사하지 않는다', () => {
    const snap = buildSnapshot(source, { untrackedInSource: ['m55'] })
    expect(JSON.stringify(snap)).not.toContain('title')
    expect(JSON.stringify(snap)).not.toContain('테스트 설계')
    expect(snap.modules[0]).not.toHaveProperty('plannedHours')
    expect(snap.meta.counts).toEqual({ moduleRecords: 1, lessons: 1 })
    expect(snap.meta.excludeFromLabs).toEqual({ comingSoon: ['m59'], untrackedInSource: ['m55'] })
    expect(snap._notice).toContain('원본 아님')
  })

  it('형식이 다른 입력은 거부한다', () => {
    expect(() => buildSnapshot({})).toThrow(/modules.json/)
  })
})

describe('diffSnapshots', () => {
  it('삭제·추가된 모듈과 레슨을 알려 준다', () => {
    const next = structuredClone(snapshotFixture)
    next.modules = next.modules.filter((m) => m.slug !== 'defect-management')
    next.modules[0].lessons.pop()
    next.modules.push({ ...next.modules[0], slug: 'brand-new', lessons: [{ id: 'x', slug: 'first', order: 1, url: '/x/' }] })
    const d = diffSnapshots(snapshotFixture, next)
    expect(d.removedModules).toEqual(['defect-management'])
    expect(d.addedModules).toEqual(['brand-new'])
    expect(d.removedLessons).toContain('test-design/state-transition-decision-table')
    expect(d.removedLessons).toContain('defect-management/writing-good-defect-reports')
    expect(d.addedLessons).toEqual(['brand-new/first'])
  })
})

describe('labIneligibleReason', () => {
  it('레슨 없는 모듈과 미추적 모듈은 막는다', () => {
    expect(labIneligibleReason(snapshotFixture, 'test-design')).toBeNull()
    expect(labIneligibleReason(snapshotFixture, 'testops')).toMatch(/coming-soon/)
    expect(labIneligibleReason(snapshotFixture, 'automation-architecture')).toMatch(/커밋되지 않은/)
    expect(labIneligibleReason(snapshotFixture, 'nope')).toBeNull()
  })
})

describe('조회', () => {
  it('레슨 URL 은 사이트 주소 + 끝 슬래시 경로', () => {
    const lesson = findLesson(snapshotFixture, 'test-design', 'boundary-value-analysis')
    expect(lessonUrl(snapshotFixture, lesson)).toBe('https://qa-lab.pages.dev/lesson/test-design/boundary-value-analysis/')
  })
})

describe('저장소의 실제 스냅샷', () => {
  const snap = loadSnapshot(paths().snapshot)

  it('원본 아님 표시가 있고 이름 필드가 없다', () => {
    expect(snap._notice).toContain('원본 아님')
    expect(fs.readFileSync(paths().snapshot, 'utf8')).not.toContain('"title"')
  })

  it('1차 범위의 모듈 slug 13개가 모두 있고 랩을 연결할 수 있다', () => {
    const slugs = [
      'test-design', 'defect-management', 'exploratory-testing', 'unit-integration-testing', 'structural-testing-practice',
      'data-checking-sql-logs-analytics', 'api-contract-testing', 'api-testing-tools', 'ui-automation', 'ui-automation-tools',
      'ci-cd-continuous-testing', 'performance-testing-tools', 'security-testing-tools',
    ]
    for (const s of slugs) {
      expect(snap.modules.find((m) => m.slug === s), s).toBeTruthy()
      expect(labIneligibleReason(snap, s), s).toBeNull()
    }
  })

  it('모든 레슨 URL 은 끝에 /', () => {
    for (const m of snap.modules) for (const l of m.lessons) expect(l.url.endsWith('/')).toBe(true)
  })
})
