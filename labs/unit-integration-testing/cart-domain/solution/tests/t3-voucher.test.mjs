import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isBusinessHours, isExpired, issueVoucher } from '../src/voucher.mjs'

// 시계와 난수를 테스트가 직접 통제한다: 가짜 타이머로 "지금"을 고정하고, Math.random 은 값을 지정한다.
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('issueVoucher (발급)', () => {
  it('코드는 V<회원번호>-<6자리 숫자>, 기간은 발급 시각부터 정확히 30일', () => {
    vi.setSystemTime(new Date('2026-10-05T00:00:00.000Z'))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(issueVoucher(7)).toEqual({
      code: 'V7-500000',
      issuedAt: '2026-10-05T00:00:00.000Z',
      expiresAt: '2026-11-04T00:00:00.000Z',
    })
  })

  it('일련번호가 6자리보다 짧으면 앞을 0 으로 채운다', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.000001) // floor(1) → 1
    expect(issueVoucher(7).code).toBe('V7-000001')
  })
})

describe('isExpired (만료)', () => {
  const voucher = { expiresAt: '2026-11-04T00:00:00.000Z' }
  const expires = Date.parse(voucher.expiresAt)

  it('만료 시각 1ms 전과 정확히 그 순간은 유효하고, 1ms 뒤부터 만료', () => {
    vi.setSystemTime(expires - 1)
    expect(isExpired(voucher)).toBe(false)
    vi.setSystemTime(expires)
    expect(isExpired(voucher)).toBe(false)
    vi.setSystemTime(expires + 1)
    expect(isExpired(voucher)).toBe(true)
  })
})

describe('isBusinessHours (상담 가능 시간)', () => {
  // 현지 시각 생성자 new Date(년, 월, 일, 시, 분) 를 쓰면 어느 시간대에서 실행해도 같은 "현지 시각"이 된다.
  it.each([
    [8, 59, false],
    [9, 0, true],
    [17, 59, true],
    [18, 0, false],
  ])('%i시 %i분 → %s', (hour, minute, expected) => {
    vi.setSystemTime(new Date(2026, 9, 5, hour, minute, 0))
    expect(isBusinessHours()).toBe(expected)
  })
})
