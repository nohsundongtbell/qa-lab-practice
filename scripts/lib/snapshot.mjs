import fs from 'node:fs'
import { SITE_BASE } from './constants.mjs'

export const SNAPSHOT_NOTICE =
  '스냅샷, 원본 아님. 원본은 QA-Lab content/modules.json 이며 이 파일은 slug 검증용 빌드 편의 사본이다. 모듈·스테이지 이름은 의도적으로 제외했다.'

export function loadSnapshot(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/**
 * QA-Lab 분석 산출물(modules.json)에서 이름 없는 스냅샷을 만든다.
 * 이름(title)·스테이지 이름은 강의 내용이므로 복사하지 않는다.
 */
export function buildSnapshot(src, { untrackedInSource = [] } = {}) {
  if (!src?.modules || !src?.meta) throw new Error('modules.json 형식이 아닙니다 (meta, modules 필요).')
  const modules = src.modules.map((m) => ({
    id: m.id,
    slug: m.slug,
    stage: m.stage,
    order: m.order,
    level: m.level,
    status: m.status,
    prerequisites: m.prerequisites,
    url: m.url,
    lessons: m.lessons.map((l) => ({ id: l.id, slug: l.slug, order: l.order, url: l.url })),
  }))
  return {
    _notice: SNAPSHOT_NOTICE,
    meta: {
      source: src.meta.source,
      generatedAt: src.meta.generatedAt,
      siteBaseUrl: SITE_BASE,
      counts: { moduleRecords: modules.length, lessons: modules.reduce((n, m) => n + m.lessons.length, 0) },
      excludeFromLabs: { comingSoon: src.meta.counts?.comingSoonModules ?? [], untrackedInSource },
    },
    stages: (src.meta.stages ?? []).map((s) => ({ id: s.id, slug: s.slug, order: s.order })),
    modules,
  }
}

/** 두 스냅샷의 slug 변화를 요약한다. 삭제·변경된 slug 는 QA-Lab 링크가 깨질 수 있으므로 눈에 띄게 보고한다. */
export function diffSnapshots(oldSnap, newSnap) {
  const mods = (s) => new Map(s.modules.map((m) => [m.slug, m]))
  const lessons = (s) => new Set(s.modules.flatMap((m) => m.lessons.map((l) => `${m.slug}/${l.slug}`)))
  const [om, nm] = [mods(oldSnap), mods(newSnap)]
  const [ol, nl] = [lessons(oldSnap), lessons(newSnap)]
  const minus = (a, b) => [...a].filter((x) => !b.has(x)).sort()
  return {
    removedModules: minus(new Set(om.keys()), nm),
    addedModules: minus(new Set(nm.keys()), om),
    removedLessons: minus(ol, nl),
    addedLessons: minus(nl, ol),
  }
}

export function findModule(snapshot, slug) {
  return snapshot.modules.find((m) => m.slug === slug)
}

export function findLesson(snapshot, moduleSlug, lessonSlug) {
  return findModule(snapshot, moduleSlug)?.lessons.find((l) => l.slug === lessonSlug)
}

/** 랩을 연결할 수 없는 모듈인지: 레슨 0개(coming-soon) 또는 QA-Lab 에서 미추적(m55). 사유를 돌려준다. */
export function labIneligibleReason(snapshot, moduleSlug) {
  const m = findModule(snapshot, moduleSlug)
  if (!m) return null
  if (m.status === 'coming-soon' || m.lessons.length === 0) return '레슨이 아직 없는 모듈(coming-soon)에는 랩을 연결할 수 없습니다.'
  if (snapshot.meta?.excludeFromLabs?.untrackedInSource?.includes(m.id)) {
    return 'QA-Lab 에서 레슨이 아직 커밋되지 않은 모듈이라 랩을 연결할 수 없습니다.'
  }
  return null
}

export const lessonUrl = (snapshot, lesson) => `${snapshot.meta?.siteBaseUrl ?? SITE_BASE}${lesson.url}`
