// 신규 가입 쿠폰(바우처). 시간과 난수를 직접 쓰는 코드 — 테스트하기 어려운 코드의 전형이다.
const DAY_MS = 24 * 60 * 60 * 1000
export const VALID_DAYS = 30

/** 발급: 코드는 V<회원번호>-<6자리 숫자>, 유효 기간은 발급 시각부터 30일. */
export function issueVoucher(memberId) {
  const now = Date.now()
  const serial = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  return {
    code: `V${memberId}-${serial}`,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + VALID_DAYS * DAY_MS).toISOString(),
  }
}

/** 만료 여부: 만료 시각이 "지난" 뒤부터 만료다 (정확히 그 순간은 아직 유효). */
export function isExpired(voucher) {
  return Date.now() > Date.parse(voucher.expiresAt)
}

/** 상담 가능 시간: 이 컴퓨터의 현지 시각 기준 9시 이상 18시 미만. */
export function isBusinessHours() {
  const hour = new Date().getHours()
  return hour >= 9 && hour < 18
}
