import { AsyncLocalStorage } from 'node:async_hooks'

/** 요청 하나에만 적용되는 실행 문맥. 결함 활성 집합과 "현재 시각" 덮어쓰기를 담는다. */
export interface RequestContext {
  defects: ReadonlySet<string>
  now?: Date
}

export const requestContext = new AsyncLocalStorage<RequestContext>()
