import { requestContext } from '../context.js'

/** 현재 시각. 테스트·실습에서는 요청 문맥으로 덮어쓸 수 있다. */
export function now(): Date {
  return requestContext.getStore()?.now ?? new Date()
}
