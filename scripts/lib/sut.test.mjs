import { describe, expect, it } from 'vitest'
import { baseUrlFrom, probeSut } from './sut.mjs'

const json = (body, ok = true) => ({ ok, json: async () => body })
const fake = (routes) => async (url) => {
  const r = routes[new URL(url).pathname]
  if (r instanceof Error) throw r
  return r ?? json({}, false)
}

describe('probeSut', () => {
  it('health 가 되면 프로필까지 알려 준다', async () => {
    const f = fake({ '/health': json({ status: 'ok' }), '/__admin/defects': json({ profile: 'beginner', active: [] }) })
    expect(await probeSut('http://x', { fetchImpl: f })).toEqual({ profile: 'beginner' })
  })

  it('개발용 경로가 꺼져 있어도 살아 있는 앱으로 본다 (프로필 모름)', async () => {
    expect(await probeSut('http://x', { fetchImpl: fake({ '/health': json({ status: 'ok' }) }) })).toEqual({ profile: null })
  })

  it('연결할 수 없거나 health 가 실패하면 null', async () => {
    expect(await probeSut('http://x', { fetchImpl: fake({ '/health': new Error('ECONNREFUSED') }) })).toBeNull()
    expect(await probeSut('http://x', { fetchImpl: fake({}) })).toBeNull()
  })
})

describe('baseUrlFrom', () => {
  it('.env 의 API_PORT 를 쓴다', () => {
    expect(baseUrlFrom({ API_PORT: '4000' })).toBe('http://127.0.0.1:4000')
    expect(baseUrlFrom({})).toBe('http://127.0.0.1:3000')
  })
})
