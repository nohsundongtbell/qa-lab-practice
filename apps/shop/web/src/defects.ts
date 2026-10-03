/**
 * 웹 화면 결함의 켜짐 여부. 시작할 때 /__qa/environment 의 webDefects 로 받는다 (API 의 요청 문맥과 같은 규칙:
 * 프로필 기본값, 로컬 실습 모드에서는 X-QA-Lab-Defects 헤더로 덮어쓴다).
 * 결함 분기의 유일한 진입점이다. 결함 하나는 코드에서 이 함수로 한 곳에서만 분기한다.
 */
let active: ReadonlySet<string> = new Set()

export function setActiveDefects(flags: Record<string, boolean> | undefined): void {
  active = new Set(Object.entries(flags ?? {}).filter(([, on]) => on).map(([id]) => id))
}

export function isDefectOn(id: string): boolean {
  return active.has(id)
}
