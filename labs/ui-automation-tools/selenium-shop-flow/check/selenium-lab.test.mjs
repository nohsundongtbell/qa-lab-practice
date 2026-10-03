import { describe, expect, it } from 'vitest'
import { classifyFailure } from './selenium-lab.mjs'

describe('classifyFailure — 원인 종류만, 값은 숨긴다', () => {
  it.each([
    ['NoSuchElementError: no such element: Unable to locate element', '요소를 기다리다 시간 초과'],
    ['TimeoutError: Waiting for element to be located By(css selector, x)', '요소를 기다리다 시간 초과'],
    ['StaleElementReferenceError: stale element reference', '오래된 요소를 사용함 (화면이 다시 그려진 뒤 요소를 다시 찾으세요)'],
    ['ElementClickInterceptedError: element click intercepted', '요소를 누를 수 없음 (가려졌거나 아직 준비되지 않음)'],
    ["AssertionError: expected '50,000원' to be '100,000원'", '기대와 다른 값 (실제 값은 숨깁니다)'],
    ['ReferenceError: x is not defined', '실행 중 오류'],
  ])('%s', (message, label) => {
    expect(classifyFailure(message)).toBe(label)
  })

  it('분류 결과에 메시지 속 값이 들어가지 않는다', () => {
    expect(classifyFailure("AssertionError: expected '50,000원' to be '100,000원'")).not.toMatch(/원/)
  })
})
