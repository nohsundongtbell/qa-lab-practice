import { describe, expect, it } from 'vitest'
import { estimateDelivery, isBusinessDay, parseDate, toKst } from '../../src/domain/calendar.js'
import { withDefects } from '../helpers.js'

const at = (iso: string) => new Date(iso)

describe('toKst', () => {
  it('UTC 15:00 은 KST 다음 날 00시다', () => {
    const { date, hour } = toKst(at('2026-10-06T15:00:00Z'))
    expect(date.toISOString().slice(0, 10)).toBe('2026-10-07')
    expect(hour).toBe(0)
  })
})

describe('isBusinessDay', () => {
  it('주말과 휴일 표를 제외한다', () => {
    expect(isBusinessDay(parseDate('2026-10-07'))).toBe(true) // 수
    expect(isBusinessDay(parseDate('2026-10-09'))).toBe(false) // 휴일 표
    expect(isBusinessDay(parseDate('2026-10-10'))).toBe(false) // 토
    expect(isBusinessDay(parseDate('2026-10-11'))).toBe(false) // 일
  })

  it('존재하지 않는 날짜는 거부한다', () => {
    expect(() => parseDate('2026-02-30')).toThrow(RangeError)
  })
})

describe('estimateDelivery (SPEC §6)', () => {
  it('영업일 13:59:59 결제는 당일 출고', () => {
    expect(estimateDelivery(at('2026-10-07T13:59:59+09:00'), '06236')).toEqual({ shipDate: '2026-10-07', deliveryDate: '2026-10-08' })
  })

  it('영업일 14:00 결제는 다음 영업일 출고, 휴일을 건너뛴다', () => {
    expect(estimateDelivery(at('2026-10-07T14:00:00+09:00'), '06236')).toEqual({ shipDate: '2026-10-08', deliveryDate: '2026-10-12' })
  })

  it('주말 결제는 다음 영업일 출고', () => {
    expect(estimateDelivery(at('2026-10-10T09:00:00+09:00'), '06236')).toEqual({ shipDate: '2026-10-12', deliveryDate: '2026-10-13' })
  })

  it('도서산간은 하루 더 걸린다', () => {
    expect(estimateDelivery(at('2026-10-07T10:00:00+09:00'), '63309')).toEqual({ shipDate: '2026-10-07', deliveryDate: '2026-10-12' })
  })

  it('KST 자정 직후(UTC 전날)도 KST 날짜로 판단한다', () => {
    // 2026-10-12(월) 00:30 KST = 2026-10-11(일) 15:30 UTC
    expect(estimateDelivery(at('2026-10-11T15:30:00Z'), '06236')).toEqual({ shipDate: '2026-10-12', deliveryDate: '2026-10-13' })
  })

  it('DF-010 이 켜지면 KST 오후 결제가 당일 출고로 계산된다', () => {
    const r = withDefects(['DF-010'], () => estimateDelivery(at('2026-10-07T15:00:00+09:00'), '06236'))
    expect(r.shipDate).toBe('2026-10-07')
  })
})
