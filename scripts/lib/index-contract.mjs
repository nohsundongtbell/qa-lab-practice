import { INDEX_SCHEMA_VERSION, LEVELS, PLATFORMS, SITE_BASE, STATUSES } from './constants.mjs'

/**
 * labs/index.json 의 **소비자 쪽 계약 검사** (QA-Lab 이 동기화할 때 같은 검사를 쓰도록 제안하는 참고 구현).
 * 의존성이 없는 순수 함수라 그대로 복사해 쓸 수 있다.
 *
 * 계약:
 *  - schemaVersion 이 같다 (필드 추가는 호환, 제거·의미 변경은 schemaVersion 을 올린다)
 *  - 항목은 (moduleSlug, id) 로 유일하다. 조회 키는 (moduleSlug, lessonSlug)
 *  - 모든 moduleSlug·lessonSlug 가 QA-Lab 스냅샷에 있고, 그 모듈의 레슨이다
 *  - 모르는 필드는 무시한다 (이 함수도 거절하지 않는다)
 * @returns {string[]} 문제 목록 (비어 있으면 통과)
 */
export function validateIndexContract(index, snapshot) {
  const problems = []
  if (!index || typeof index !== 'object') return ['인덱스가 객체가 아닙니다']
  if (index.schemaVersion !== INDEX_SCHEMA_VERSION) problems.push(`schemaVersion 이 ${INDEX_SCHEMA_VERSION} 이 아닙니다: ${index.schemaVersion}`)
  for (const k of ['repoUrl', 'ref']) if (typeof index[k] !== 'string' || !index[k]) problems.push(`${k} 가 없습니다`)
  if (!Array.isArray(index.labs)) return [...problems, 'labs 가 배열이 아닙니다']

  const modules = new Map((snapshot?.modules ?? []).map((m) => [m.slug, new Set(m.lessons.map((l) => l.slug))]))
  const seen = new Set()
  for (const [i, lab] of index.labs.entries()) {
    const where = `labs[${i}] (${lab?.id ?? '?'})`
    for (const k of ['id', 'moduleSlug', 'title', 'path', 'status', 'level']) if (typeof lab?.[k] !== 'string' || !lab[k]) problems.push(`${where}: ${k} 가 없습니다`)
    if (!Array.isArray(lab?.lessonSlugs)) problems.push(`${where}: lessonSlugs 가 배열이 아닙니다`)
    if (!STATUSES.includes(lab?.status)) problems.push(`${where}: status 는 ${STATUSES.join('|')} 중 하나여야 합니다`)
    if (!Object.values(LEVELS).includes(lab?.level)) problems.push(`${where}: level 은 ${Object.values(LEVELS).join('|')} 중 하나여야 합니다`)
    if (!Number.isInteger(lab?.estimatedMinutes) || lab.estimatedMinutes <= 0) problems.push(`${where}: estimatedMinutes 는 양의 정수여야 합니다`)
    if (!Array.isArray(lab?.tools)) problems.push(`${where}: tools 가 배열이 아닙니다`)
    for (const p of lab?.platforms ?? []) if (!PLATFORMS.includes(p)) problems.push(`${where}: 알 수 없는 platform ${p}`)
    if (typeof lab?.path === 'string' && (lab.path.startsWith('/') || lab.path.includes('..') || lab.path.includes('#'))) problems.push(`${where}: path 는 저장소 안의 상대 경로여야 합니다 (앵커·상위 경로 금지)`)

    const key = `${lab?.moduleSlug}\u0000${lab?.id}`
    if (seen.has(key)) problems.push(`${where}: (moduleSlug, id) 가 중복입니다`)
    seen.add(key)

    const lessons = modules.get(lab?.moduleSlug)
    if (!lessons) problems.push(`${where}: 스냅샷에 없는 moduleSlug 입니다: ${lab?.moduleSlug}`)
    else for (const l of lab.lessonSlugs ?? []) if (!lessons.has(l)) problems.push(`${where}: ${lab.moduleSlug} 모듈에 없는 lessonSlug 입니다: ${l}`)
  }
  return problems
}

/** 랩 카드의 링크: 저장소의 랩 폴더. ref 는 인덱스가 정한 값(권장: 동기화 때 커밋 SHA 로 고정). */
export function labUrl(index, lab) {
  return `${index.repoUrl.replace(/\/$/, '')}/tree/${index.ref}/${lab.path}`
}

/** 레슨 → 그 레슨에 연결된 랩. (moduleSlug, lessonSlug) 로 조회한다. planned 도 돌려주므로 화면에서 "준비 중"으로 표시한다. */
export function labsForLesson(index, moduleSlug, lessonSlug) {
  return index.labs.filter((l) => l.moduleSlug === moduleSlug && l.lessonSlugs.includes(lessonSlug))
}

/** 랩 → QA-Lab 레슨 주소(끝 / 포함, 앵커 없음). 스냅샷의 url 을 쓴다. */
export function lessonUrls(lab, snapshot) {
  const mod = snapshot.modules.find((m) => m.slug === lab.moduleSlug)
  return lab.lessonSlugs.map((slug) => `${SITE_BASE}${mod.lessons.find((l) => l.slug === slug).url}`)
}
