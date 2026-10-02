import { describe, expect, it } from 'vitest'
import { isRemoteArea, shippingFee } from '../../src/domain/shipping.js'
import { withDefects } from '../helpers.js'

describe('shippingFee (SPEC §5)', () => {
  it.each([
    [49_999, '06236', 3_000],
    [50_000, '06236', 0],
    [50_001, '06236', 0],
    [0, '06236', 3_000],
    [49_999, '63309', 6_000],
    [50_000, '63309', 3_000],
  ])('할인 후 %i원, 우편번호 %s → %i원', (amount, zip, fee) => {
    expect(shippingFee(amount, zip)).toBe(fee)
  })

  it('도서산간 경계', () => {
    expect(isRemoteArea('62999')).toBe(false)
    expect(isRemoteArea('63000')).toBe(true)
    expect(isRemoteArea('63644')).toBe(true)
    expect(isRemoteArea('63645')).toBe(false)
    expect(isRemoteArea('40200')).toBe(true)
    expect(isRemoteArea('40240')).toBe(true)
    expect(isRemoteArea('40241')).toBe(false)
  })

  it('DF-001 이 켜지면 정확히 50,000원에서 배송비가 붙는다', () => {
    expect(withDefects(['DF-001'], () => shippingFee(50_000, '06236'))).toBe(3_000)
  })
})
