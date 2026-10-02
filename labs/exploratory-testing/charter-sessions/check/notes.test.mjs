import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { bugCases, parseCharters, parseSession } from './notes.mjs'

const labDir = path.resolve(import.meta.dirname, '..')
const read = (...p) => fs.readFileSync(path.join(labDir, ...p), 'utf8')

describe('parseCharters', () => {
  it('모범 차터 3개는 완성, 템플릿은 빈 항목을 알려 준다', () => {
    expect(parseCharters(read('solution', 'charters.md'))).toMatchObject({ errors: [] })
    expect(parseCharters(read('solution', 'charters.md')).complete).toHaveLength(3)
    const t = parseCharters(read('starter', 'charters.md'))
    expect(t.complete).toHaveLength(0)
    expect(t.errors[0]).toMatch(/차터 1: 비어 있는 항목 — 탐험 대상, 자원, 알아낼 정보, 리스크/)
  })

  it('탐험 대상이 같은 차터는 오류', () => {
    const md = '## 차터 1\n- 탐험 대상: 쿠폰\n- 자원: a\n- 알아낼 정보: b\n- 리스크: c\n## 차터 2\n- 탐험 대상: 쿠폰\n- 자원: a\n- 알아낼 정보: b\n- 리스크: c\n'
    expect(parseCharters(md).errors.join()).toMatch(/탐험 대상이 같은/)
  })
})

describe('parseSession', () => {
  const good = read('solution', 'sessions', 'session-2-discounts.md')

  it('모범 세션 노트: 메타·버그 4개·증거(X-Request-Id)', () => {
    const s = parseSession(good, [1, 2, 3])
    expect(s.errors).toEqual([])
    expect(s.bugs.map((b) => b.title)).toHaveLength(4)
    expect(s.bugs.every((b) => b.repro && !b.error)).toBe(true)
    expect(s.bugs[0].hasRequestId).toBe(true)
    expect(s.bugs[1].hasRequestId).toBe(false)
  })

  it('템플릿 그대로면 메타와 절이 비었다고 알려 준다', () => {
    const s = parseSession(read('starter', 'sessions', '_TEMPLATE.md'), [1])
    expect(s.errors.join('\n')).toMatch(/"- 차터: …" 가 비어 있습니다/)
    expect(s.errors.join('\n')).toMatch(/"## 테스트 노트" 절이 비어 있습니다/)
  })

  it.each([
    [['- 차터: 차터 2', '- 차터: 차터 7'], /차터 7 가 없습니다/],
    [['- 차터: 차터 2', '- 차터: 쿠폰 차터'], /차터 번호/],
    [['- 시작: 2026-10-03 15:00', '- 시작: 오후 3시'], /YYYY-MM-DD HH:MM/],
    [['- 시간 상자(분): 60', '- 시간 상자(분): 240'], /15~120분/],
    [['준비 10 / 테스트 65 / 버그 조사 25', '준비 10 / 테스트 65'], /합이 100/],
  ])('메타 오류: %j', ([from, to], message) => {
    expect(parseSession(good.replace(from, to), [1, 2, 3]).errors.join()).toMatch(message)
  })

  it('버그에 설명이 없거나 repro 가 없으면 버그별 오류', () => {
    const md = good.replace(/### 버그 3:[\s\S]*?```repro[\s\S]*?```/, '### 버그 3: 설명 없음\n```repro\nsteps:\n  - me: {}\n```').replace(/(### 버그 4:[^\n]*\n)[\s\S]*?(?=## 이슈)/, '$1설명만\n\n')
    const bugs = parseSession(md, [1, 2, 3]).bugs
    expect(bugs[2].error).toMatch(/버그 설명/)
    expect(bugs[3].error).toMatch(/정확히 하나/)
  })

  it('bugCases: 형식이 맞는 세션의 버그만, 문제 있는 버그는 오류 목록으로', () => {
    const ok = { file: 'sessions/a.md', ...parseSession(good, [1, 2, 3]) }
    const bad = { file: 'sessions/b.md', errors: ['x'], bugs: [{ title: 't', repro: { steps: [{ me: {} }] } }] }
    const withErr = { file: 'sessions/c.md', errors: [], bugs: [{ title: 'e', error: 'repro 없음' }] }
    const { cases, errors } = bugCases([ok, bad, withErr])
    expect(cases).toHaveLength(4)
    expect(cases[0]).toMatchObject({ reset: true, label: expect.stringContaining('sessions/a.md') })
    expect(errors).toEqual(['sessions/c.md — e: repro 없음'])
  })
})
