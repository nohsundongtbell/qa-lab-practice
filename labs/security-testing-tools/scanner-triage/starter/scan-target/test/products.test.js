// 테스트 코드 (분석용 샘플 — 실행하지 않음). 운영 코드에 포함되지 않는다.
const TEST_PASSWORD = 'qa-lab-1234'

export function sanityCheck() {
  return eval('1 + 1') === 2 && TEST_PASSWORD.length > 0
}
