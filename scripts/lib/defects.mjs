import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { PROFILES } from './constants.mjs'

/** 프로필의 누적 결함 ID 목록 (extends 사슬을 따라간다). API 의 resolveProfile 과 같은 규칙. */
export function profileDefects(root, profile, seen = []) {
  if (!PROFILES.includes(profile)) throw new Error(`알 수 없는 결함 프로필입니다: ${profile}`)
  if (seen.includes(profile)) throw new Error(`프로필 extends 가 순환합니다: ${[...seen, profile].join(' → ')}`)
  const file = loadYaml(fs.readFileSync(path.join(root, 'defects', 'profiles', `${profile}.yaml`), 'utf8')) ?? {}
  const ids = file.extends ? profileDefects(root, file.extends, [...seen, profile]) : []
  for (const id of file.defects ?? []) if (!ids.includes(id)) ids.push(id)
  return ids
}

/** 결함 카탈로그 (채점기 전용 — 학습자에게 내용을 그대로 보여 주지 않는다). */
export function loadCatalog(root) {
  const catalog = loadYaml(fs.readFileSync(path.join(root, 'defects', 'catalog.yaml'), 'utf8'))
  return new Map((catalog?.defects ?? []).map((d) => [d.id, d]))
}

/** 카탈로그에서 이 모듈과 연결된 결함 ID (채점기 내부 전용). 카탈로그 순서를 따른다. */
export function defectsForModule(root, moduleSlug) {
  return [...loadCatalog(root).values()].filter((d) => (d.modules ?? []).includes(moduleSlug)).map((d) => d.id)
}
