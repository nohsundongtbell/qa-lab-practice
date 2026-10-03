// 입력 검사 (분석용 샘플 — 실행하지 않음)
export function isRepeatedPattern(input) {
  return /^(a+)+$/.test(input)
}

export function isValidNickname(name) {
  return /^[a-z0-9_-]{3,20}$/.test(name)
}
