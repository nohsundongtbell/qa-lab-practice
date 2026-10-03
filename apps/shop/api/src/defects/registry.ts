import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { requestContext } from '../context.js'

export const PROFILES = ['none', 'beginner', 'intermediate', 'advanced'] as const
export type Profile = (typeof PROFILES)[number]

const ID_PATTERN = /^DF-\d{3}$/

interface ProfileFile {
  profile: string
  extends?: string
  defects?: string[]
}

export interface DefectSettings {
  /** catalog.yaml 에 정의된 모든 결함 ID */
  known: ReadonlySet<string>
  /** 프로필과 DEFECTS_ON/OFF 로 정해진 기본 활성 집합 */
  active: ReadonlySet<string>
  /** 웹 화면에서 분기하는 결함 (catalog 의 surface: web). 웹은 /__qa/environment 로 켜짐 여부를 받는다 */
  web: ReadonlySet<string>
}

function readYaml<T>(file: string): T {
  return loadYaml(fs.readFileSync(file, 'utf8')) as T
}

export function loadCatalogIds(dir: string): Set<string> {
  const catalog = readYaml<{ defects?: Array<{ id: string }> }>(path.join(dir, 'catalog.yaml'))
  const ids = new Set<string>()
  for (const d of catalog.defects ?? []) {
    if (!ID_PATTERN.test(d.id)) throw new Error(`결함 ID 형식이 잘못되었습니다: ${d.id}`)
    if (ids.has(d.id)) throw new Error(`결함 ID가 중복되었습니다: ${d.id}`)
    ids.add(d.id)
  }
  return ids
}

/** catalog 에서 surface 가 web 인 결함 ID. */
export function loadWebDefectIds(dir: string): Set<string> {
  const catalog = readYaml<{ defects?: Array<{ id: string; surface?: string }> }>(path.join(dir, 'catalog.yaml'))
  return new Set((catalog.defects ?? []).filter((d) => d.surface === 'web').map((d) => d.id))
}

/** 프로필 파일을 extends 사슬을 따라 읽어 누적 결함 목록을 만든다. */
export function resolveProfile(dir: string, profile: string, seen: string[] = []): Set<string> {
  if (!(PROFILES as readonly string[]).includes(profile)) {
    throw new Error(`알 수 없는 결함 프로필입니다: ${profile} (사용 가능: ${PROFILES.join(', ')})`)
  }
  if (seen.includes(profile)) throw new Error(`프로필 extends 가 순환합니다: ${[...seen, profile].join(' → ')}`)
  const file = readYaml<ProfileFile>(path.join(dir, 'profiles', `${profile}.yaml`))
  const result = file.extends ? resolveProfile(dir, file.extends, [...seen, profile]) : new Set<string>()
  for (const id of file.defects ?? []) result.add(id)
  return result
}

export function loadDefectSettings(opts: {
  dir: string
  profile: string
  on?: string[]
  off?: string[]
}): DefectSettings {
  const known = loadCatalogIds(opts.dir)
  const active = resolveProfile(opts.dir, opts.profile)
  for (const id of opts.on ?? []) active.add(id)
  for (const id of opts.off ?? []) active.delete(id)
  for (const id of active) {
    if (!known.has(id)) throw new Error(`catalog.yaml 에 없는 결함 ID입니다: ${id}`)
  }
  return { known, active, web: loadWebDefectIds(opts.dir) }
}

/**
 * X-QA-Lab-Defects 헤더 값을 해석한다.
 * - 헤더 없음 → undefined (기본 활성 집합 사용)
 * - '' 또는 'none' → 빈 집합
 * - 'DF-001,DF-003' → 해당 결함만 활성
 */
export function parseDefectHeader(value: string | undefined, known: ReadonlySet<string>): Set<string> | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'none') return new Set()
  const ids = trimmed.split(',').map((s) => s.trim()).filter(Boolean)
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`알 수 없는 결함 ID입니다: ${id}`)
  }
  return new Set(ids)
}

let defaultActive: ReadonlySet<string> = new Set()

export function setDefaultActiveDefects(active: ReadonlySet<string>): void {
  defaultActive = active
}

/**
 * 결함 분기의 유일한 진입점. 결함 하나는 코드에서 이 함수로 한 곳에서만 분기한다.
 */
export function isDefectOn(id: string): boolean {
  const store = requestContext.getStore()
  return (store?.defects ?? defaultActive).has(id)
}
