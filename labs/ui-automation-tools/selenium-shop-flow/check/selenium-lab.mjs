/**
 * 실패 메시지를 종류로만 알려 준다. 원문에는 앱의 실제 값(expected 'x' to be 'y')이 들어 있어 정답을 알려 주게 된다.
 */
export function classifyFailure(message = '') {
  if (/StaleElementReferenceError|stale element/i.test(message)) return '오래된 요소를 사용함 (화면이 다시 그려진 뒤 요소를 다시 찾으세요)'
  if (/ElementClickInterceptedError|ElementNotInteractable|not interactable|click intercepted/i.test(message)) return '요소를 누를 수 없음 (가려졌거나 아직 준비되지 않음)'
  if (/TimeoutError|Wait timed out|NoSuchElementError|no such element|Timeout/i.test(message)) return '요소를 기다리다 시간 초과'
  if (/expected|toBe|toEqual|toContain|AssertionError/i.test(message)) return '기대와 다른 값 (실제 값은 숨깁니다)'
  return '실행 중 오류'
}
