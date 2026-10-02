import { describe, expect, it } from 'vitest'
import { parseArgs, UsageError } from './args.mjs'

describe('parseArgs', () => {
  it('위치 인자와 플래그를 나눈다', () => {
    expect(parseArgs(['lab-a', '--profile', 'beginner', '--follow'], { string: ['profile'], boolean: ['follow'] })).toEqual({
      _: ['lab-a'],
      flags: { profile: 'beginner', follow: true },
    })
  })

  it('--이름=값 형식도 받는다', () => {
    expect(parseArgs(['--lines=20'], { string: ['lines'] }).flags.lines).toBe('20')
  })

  it('알 수 없는 옵션은 거부한다', () => {
    expect(() => parseArgs(['--nope'], {})).toThrow(UsageError)
  })

  it('값이 필요한 옵션에 값이 없으면 거부한다', () => {
    expect(() => parseArgs(['--profile'], { string: ['profile'] })).toThrow(/값이 필요/)
    expect(() => parseArgs(['--profile', '--follow'], { string: ['profile'], boolean: ['follow'] })).toThrow(/값이 필요/)
  })

  it('불리언 옵션에 값을 주면 거부한다', () => {
    expect(() => parseArgs(['--follow=yes'], { boolean: ['follow'] })).toThrow(UsageError)
  })
})
