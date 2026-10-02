import { describe, expect, it } from 'vitest'
import { parseItems, parseMember, parseWon, RowError, TASKS } from './cases.mjs'

describe('열 값 해석', () => {
  it('parseItems: 상품번호x수량, ; 로 여러 개, 0·음수 수량 허용(경계값 시험용)', () => {
    expect(parseItems('1x2;9x20')).toEqual([{ product: 1, qty: 2 }, { product: 9, qty: 20 }])
    expect(parseItems(' 9 × 0 ')).toEqual([{ product: 9, qty: 0 }])
    expect(parseItems('9x-1')).toEqual([{ product: 9, qty: -1 }])
    expect(() => parseItems('')).toThrow(RowError)
    expect(() => parseItems('무선마우스 2개')).toThrow(/상품번호x수량/)
  })

  it('parseWon: 쉼표·원 표기를 허용', () => {
    expect(parseWon('3,000원', 'x')).toBe(3000)
    expect(() => parseWon('삼천', 'x')).toThrow(/정수/)
  })

  it('parseMember: 별칭 또는 이메일', () => {
    expect(parseMember('KIM')).toBe('kim@example.com')
    expect(parseMember('lee@example.com')).toBe('lee@example.com')
    expect(() => parseMember('admin')).toThrow(/member/)
  })
})

describe('t1 등급', () => {
  const t = (total_spent, expected_grade) => TASKS.t1.toRepro({ total_spent, expected_grade })
  it('등급 기대 → 200 + grade, 오류 기대 → 400', () => {
    expect(t('1,000,000', 'vip').steps).toEqual([{ grade: { total_spent: '1000000' }, expect: { status: 200, json: { grade: 'VIP' } } }])
    expect(t('-1', '오류').steps[0].expect).toEqual({ status: 400 })
    expect(() => t('abc', 'GOLD')).toThrow(/숫자/)
    expect(() => t('1', 'PLATINUM')).toThrow(/expected_grade/)
  })
})

describe('t2 배송비', () => {
  it('회원 로그인 후 미리보기, 우편번호는 선택', () => {
    const r = TASKS.t2.toRepro({ member: 'jeju', items: '1x1', zipcode: '', expected_shipping_fee: '3000' })
    expect(r.steps).toEqual([{ login: 'jeju@example.com' }, { quote: { items: [{ product: 1, qty: 1 }] }, expect: { status: 200, json: { shippingFee: 3000 } } }])
    expect(TASKS.t2.toRepro({ member: 'kim', items: '9x0', zipcode: '63000', expected_shipping_fee: '오류' }).steps[1]).toEqual({ quote: { items: [{ product: 9, qty: 0 }], zipcode: '63000' }, expect: { status: 400 } })
    expect(() => TASKS.t2.toRepro({ member: 'kim', items: '1x1', zipcode: '6300', expected_shipping_fee: '0' })).toThrow(/zipcode/)
  })
})

describe('t3 쿠폰', () => {
  it('할인액 또는 거절 사유', () => {
    expect(TASKS.t3.toRepro({ member: 'kim', items: '6x1', coupon: 'SALE10', expected_discount: '5000' }).steps[1].expect).toEqual({ status: 200, json: { couponDiscount: 5000 } })
    expect(TASKS.t3.toRepro({ member: 'kim', items: '1x1', coupon: 'X', expected_discount: 'min_order_not_met' }).steps[1].expect).toEqual({
      status: 422, json: { code: 'COUPON_NOT_APPLICABLE', 'details.reason': 'MIN_ORDER_NOT_MET' },
    })
    expect(() => TASKS.t3.toRepro({ member: 'kim', items: '1x1', coupon: '', expected_discount: '0' })).toThrow(/coupon/)
  })
})

describe('t4 주문 상태', () => {
  const now = new Date('2026-10-07T01:00:30Z')
  const t = (steps, expected) => TASKS.t4.toRepro({ steps, expected }, { now })

  it('앞 동작은 성공을 기대하고, 상태 기대면 마지막 동작 뒤 상태를 조회한다', () => {
    const r = t('pay>ship>cancel', 'SHIPPED')
    const kinds = r.steps.map((s) => Object.keys(s).find((k) => !['expect', 'now'].includes(k)))
    expect(kinds).toEqual(['login', 'add_to_cart', 'order', 'pay', 'ship', 'cancel', 'get_order'])
    expect(r.steps[3].expect).toEqual({ status: 200 })
    expect(r.steps[5].expect).toBeUndefined()
    expect(r.steps[6].expect).toEqual({ status: 200, json: { status: 'SHIPPED' } })
  })

  it('상태 코드 기대면 마지막 동작의 응답 코드를 본다', () => {
    const r = t('pay>ship>cancel', '409')
    expect(r.steps.at(-1)).toMatchObject({ cancel: {}, expect: { status: 409 } })
  })

  it('wait:N 은 이후 동작의 현재 시각을 N일 미룬다 (분 단위로 고정된 기준 시각)', () => {
    const r = t('pay>ship>deliver>wait:8>refund', '409')
    expect(r.steps.find((s) => s.deliver).now).toBe('2026-10-07T01:00:00.000Z')
    expect(r.steps.at(-1).now).toBe('2026-10-15T01:00:00.000Z')
  })

  it('pay_declined 는 거절 카드로 결제하고 402 를 전제로 한다', () => {
    const r = t('pay_declined>pay', 'PAID')
    expect(r.steps[3]).toMatchObject({ pay: { card: '4000-0000-0000-0002' }, expect: { status: 402 } })
  })

  it('형식 오류', () => {
    expect(() => t('', 'PAID')).toThrow(/비어/)
    expect(() => t('wait:3', 'PAID')).toThrow(/동작이 하나 이상/)
    expect(() => t('pay>teleport', 'PAID')).toThrow(/알 수 없는 동작/)
    expect(() => t('pay', 'DONE')).toThrow(/expected/)
  })
})
