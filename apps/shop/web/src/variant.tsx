import { createContext, useContext } from 'react'

/**
 * 환경 조건 UI_VARIANT (결함이 아님): 같은 화면을 다른 DOM 구조로 그린다.
 * v1 → v2 에서 바뀌는 것: CSS 클래스, 감싸는 요소, 요소 순서, 제목 수준, id.
 * 바뀌지 않는 것: 보이는 글자, 접근 가능한 이름(label·aria-label), 역할, data-testid.
 */
export type Variant = 'v1' | 'v2'
const VariantContext = createContext<Variant>('v1')
export const VariantProvider = VariantContext.Provider
export const useVariant = () => useContext(VariantContext)

export interface Environment {
  uiVariant: Variant
  latencyProfile: string
}

/** 시작할 때 서버에서 읽는다. 주소에 ?ui=v2 가 있으면 그 변형을 요청한다 (개발용 기능이 켜져 있을 때). 실패하면 v1. */
export async function loadEnvironment(): Promise<Environment> {
  const headers: Record<string, string> = {}
  const ui = new URLSearchParams(location.search).get('ui')
  if (ui) headers['x-qa-lab-ui-variant'] = ui
  try {
    const res = await fetch('/__qa/environment', { headers })
    if (res.ok) {
      const env = (await res.json()) as Environment
      if (env.uiVariant === 'v1' || env.uiVariant === 'v2') return env
    }
  } catch {
    /* 서버에 닿지 않으면 기본값 */
  }
  return { uiVariant: 'v1', latencyProfile: 'none' }
}
