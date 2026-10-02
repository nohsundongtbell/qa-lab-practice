import { describe, expect, it } from 'vitest'
import { charCount, checkName, checkQuantity, checkZipcode } from '../../src/domain/validation.js'
import { withDefects } from '../helpers.js'

describe('checkName (SPEC §1.1)', () => {
  it('글자 수는 사람이 보는 글자 단위로 센다', () => {
    expect(charCount('김수한무')).toBe(4)
    expect('value' in checkName('가'.repeat(20))).toBe(true)
    expect('error' in checkName('가'.repeat(21))).toBe(true)
    expect('error' in checkName('김')).toBe(true)
  })

  it('앞뒤 공백을 제거한 뒤 검사한다', () => {
    expect(checkName('  홍길동  ')).toEqual({ value: '홍길동' })
    expect('error' in checkName('  김  ')).toBe(true)
  })

  it('허용되지 않은 문자', () => {
    expect('error' in checkName('홍길동1')).toBe(true)
    expect('error' in checkName('Hong Gildong')).toBe(false)
  })

  it('DF-005: 바이트 수로 세면 한글 7자부터 거절된다', () => {
    expect('error' in withDefects(['DF-005'], () => checkName('가'.repeat(7)))).toBe(true)
    expect('value' in withDefects(['DF-005'], () => checkName('가'.repeat(6)))).toBe(true)
  })
})

describe('checkQuantity (SPEC §2)', () => {
  it.each([[1, true], [99, true], [0, false], [100, false], [1.5, false], ['1', false]])('%s → %s', (q, ok) => {
    expect('value' in checkQuantity(q)).toBe(ok)
  })

  it('DF-004: 0 을 허용한다', () => {
    expect(withDefects(['DF-004'], () => checkQuantity(0))).toEqual({ value: 0 })
  })
})

describe('checkZipcode', () => {
  it('숫자 5자리', () => {
    expect('value' in checkZipcode('06236')).toBe(true)
    expect('error' in checkZipcode('6236')).toBe(true)
    expect('error' in checkZipcode(6236)).toBe(true)
  })
})
