import { describe, expect, it } from 'vitest'
import { isBusinessHours, isExpired, issueVoucher } from '../src/voucher.mjs'

// 이 테스트는 "가끔" 실패합니다 — 실제 시계에 기대고 있기 때문입니다 (플래키 테스트).
// 먼저 왜 흔들리는지 확인하고(여러 번 실행해 보세요), 시계와 난수를 테스트가 직접 통제하도록 고치세요.
describe('issueVoucher (발급)', () => {
  it('유효 기간은 발급 시각부터 정확히 30일이다', () => {
    const voucher = issueVoucher(7)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    expect(Date.parse(voucher.expiresAt) - Date.now()).toBe(thirtyDays)
  })
})

// TODO: 코드 형식 V<회원번호>-<6자리> (난수를 고정), 만료 경계(정확히 그 순간은 유효), 상담 시간 경계(9시 · 18시)
void isBusinessHours
void isExpired
