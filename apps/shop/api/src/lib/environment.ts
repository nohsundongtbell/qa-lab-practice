/**
 * 환경 조건 — 결함이 아니라 "앱이 놓인 상황"이다 (카탈로그와 따로 관리한다).
 *  - UI_VARIANT: 웹 화면의 DOM 구조 변형 (동작은 같다)
 *  - LATENCY_PROFILE: API 응답 지연 (none | slow | unstable)
 * 둘 다 환경 변수가 기본값이고, 로컬 실습 모드(ALLOW_DEV_TOOLS=1)에서는 요청 헤더로 그 요청만 덮어쓸 수 있다.
 */
export const UI_VARIANTS = ['v1', 'v2'] as const
export type UiVariant = (typeof UI_VARIANTS)[number]
export const LATENCY_PROFILES = ['none', 'slow', 'unstable'] as const
export type LatencyProfile = (typeof LATENCY_PROFILES)[number]

export function parseUiVariant(value: string | undefined): UiVariant | undefined {
  if (value === undefined || value === '') return undefined
  if ((UI_VARIANTS as readonly string[]).includes(value)) return value as UiVariant
  throw new Error(`알 수 없는 UI 변형입니다: ${value} (${UI_VARIANTS.join(' | ')})`)
}

export function parseLatencyProfile(value: string | undefined): LatencyProfile | undefined {
  if (value === undefined || value === '') return undefined
  if ((LATENCY_PROFILES as readonly string[]).includes(value)) return value as LatencyProfile
  throw new Error(`알 수 없는 지연 프로필입니다: ${value} (${LATENCY_PROFILES.join(' | ')})`)
}

/** 난수 주입점. 같은 시드면 같은 수열이 나온다 (mulberry32). */
export type Random = () => number
export function createRandom(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 이 요청에 줄 지연(ms). none 은 0, slow 는 고정, unstable 은 대부분 짧고 가끔 매우 길다. */
export function delayFor(profile: LatencyProfile, random: Random): number {
  if (profile === 'none') return 0
  if (profile === 'slow') return 700
  return random() < 0.7 ? 100 + Math.floor(random() * 200) : 1200 + Math.floor(random() * 1300)
}
