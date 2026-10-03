import { describe, expect, it } from 'vitest'
import { createRandom, delayFor, parseLatencyProfile, parseUiVariant } from '../../src/lib/environment.js'

describe('환경 조건 파싱', () => {
  it('빈 값은 undefined, 알려진 값은 그대로, 모르는 값은 한국어 오류', () => {
    expect(parseUiVariant(undefined)).toBeUndefined()
    expect(parseUiVariant('v2')).toBe('v2')
    expect(() => parseUiVariant('v3')).toThrow(/알 수 없는 UI 변형/)
    expect(parseLatencyProfile('')).toBeUndefined()
    expect(parseLatencyProfile('unstable')).toBe('unstable')
    expect(() => parseLatencyProfile('fast')).toThrow(/알 수 없는 지연 프로필/)
  })
})

describe('지연', () => {
  it('none 은 0, slow 는 고정값', () => {
    const r = createRandom(1)
    expect(delayFor('none', r)).toBe(0)
    expect(delayFor('slow', r)).toBe(700)
  })

  it('unstable 은 대부분 짧고 가끔 길다 (범위와 비율)', () => {
    const r = createRandom(7)
    const samples = Array.from({ length: 2000 }, () => delayFor('unstable', r))
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(100)
    expect(Math.max(...samples)).toBeLessThan(2500)
    const long = samples.filter((ms) => ms >= 1200).length / samples.length
    expect(long).toBeGreaterThan(0.2)
    expect(long).toBeLessThan(0.4)
    expect(samples.every((ms) => (ms >= 100 && ms < 300) || (ms >= 1200 && ms < 2500))).toBe(true)
  })

  it('같은 시드면 같은 수열 (재현 가능)', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b))
    expect(Array.from({ length: 3 }, createRandom(1))).not.toEqual(Array.from({ length: 3 }, createRandom(2)))
  })
})
