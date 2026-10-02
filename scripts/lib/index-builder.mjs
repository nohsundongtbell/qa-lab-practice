import fs from 'node:fs'
import path from 'node:path'
import { INDEX_SCHEMA_VERSION, LEVELS, REPO_REF, REPO_URL } from './constants.mjs'

/**
 * labs/index.json (QA-Lab 연동안 S1 `content/labs.json` 과 같은 모양) 을 만든다.
 * 시각 정보는 넣지 않는다 — 같은 입력이면 같은 출력이어야 CI 에서 비교할 수 있다.
 * @param {Array<{ moduleDir: string, labSlug: string, data: object }>} labs 검증을 통과한 랩
 */
export function buildIndex(labs, snapshot) {
  const entries = []
  for (const lab of labs) {
    const d = lab.data
    const base = {
      id: `${lab.moduleDir}/${lab.labSlug}`,
      title: d.title_ko,
      path: `labs/${lab.moduleDir}/${lab.labSlug}`,
      status: d.status,
      estimatedMinutes: d.est_minutes,
      level: LEVELS[d.level],
      tools: d.tools ?? [],
      platforms: d.platforms,
    }
    // QA-Lab 쪽 조회 키가 (moduleSlug, lessonSlug) 이므로 also_for 는 모듈별 항목으로 펼친다.
    entries.push({ ...base, moduleSlug: d.module, lessonSlugs: d.lessons ?? [] })
    for (const a of d.also_for ?? []) entries.push({ ...base, moduleSlug: a.module, lessonSlugs: a.lessons ?? [] })
  }
  entries.sort((a, b) => a.moduleSlug.localeCompare(b.moduleSlug) || a.id.localeCompare(b.id))
  const ordered = entries.map((e) => ({
    id: e.id, moduleSlug: e.moduleSlug, lessonSlugs: e.lessonSlugs, title: e.title, path: e.path,
    status: e.status, estimatedMinutes: e.estimatedMinutes, level: e.level, tools: e.tools, platforms: e.platforms,
  }))
  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    repoUrl: REPO_URL,
    ref: REPO_REF,
    snapshot: { source: snapshot.meta?.source ?? null, generatedAt: snapshot.meta?.generatedAt ?? null },
    labs: ordered,
  }
}

export const serializeIndex = (index) => `${JSON.stringify(index, null, 2)}\n`

export function writeIndex(file, index) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, serializeIndex(index))
}
