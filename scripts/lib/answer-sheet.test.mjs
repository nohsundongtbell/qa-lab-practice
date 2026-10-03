import { describe, expect, it } from 'vitest'
import { formatSheet, gradeSheet, isCorrect } from './answer-sheet.mjs'

describe('isCorrect', () => {
  it('text — 앞뒤 공백은 무시하고 정확히 같아야 한다', () => {
    expect(isCorrect({ kind: 'text' }, 'abc', ' abc ')).toBe(true)
    expect(isCorrect({ kind: 'text' }, 'abc', 'abd')).toBe(false)
    expect(isCorrect({ kind: 'text' }, '12', 12)).toBe(true) // YAML 이 숫자로 읽어도 글자로 비교
  })
  it('number — 허용 오차 안이면 맞다, 글자는 안 된다', () => {
    expect(isCorrect({ kind: 'number', tol: 50 }, 1850, 1810)).toBe(true)
    expect(isCorrect({ kind: 'number', tol: 50 }, 1850, 1799)).toBe(false)
    expect(isCorrect({ kind: 'number', tol: 50 }, 1850, '1850')).toBe(false)
    expect(isCorrect({ kind: 'number' }, 2, 2)).toBe(true)
    expect(isCorrect({ kind: 'number' }, 2, 3)).toBe(false)
  })
  it('set — 순서·중복과 무관하되 원소가 정확히 같아야 한다', () => {
    expect(isCorrect({ kind: 'set' }, ['/a', '/b'], ['/b', '/a', '/b'])).toBe(true)
    expect(isCorrect({ kind: 'set' }, ['/a', '/b'], ['/a'])).toBe(false)
    expect(isCorrect({ kind: 'set' }, ['/a', '/b'], ['/a', '/b', '/c'])).toBe(false)
    expect(isCorrect({ kind: 'set' }, ['/a'], '/a')).toBe(false)
  })
  it('비어 있는 답은 틀린 것이다 (빈 칸으로 통과하지 않는다)', () => {
    for (const kind of ['text', 'number', 'set']) {
      expect(isCorrect({ kind }, kind === 'set' ? [] : 0, null)).toBe(false)
      expect(isCorrect({ kind }, kind === 'set' ? [] : 0, undefined)).toBe(false)
      expect(isCorrect({ kind }, kind === 'set' ? [] : 0, '')).toBe(false)
    }
  })
})

describe('gradeSheet / formatSheet', () => {
  const spec = [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'number' }]
  it('맞은 개수와 알 수 없는 항목을 센다', () => {
    const g = gradeSheet({ a: 'x', b: 3, c: 1 }, spec, { a: 'x', b: 4 })
    expect(g.correct).toBe(1)
    expect(g.unknown).toEqual(['c'])
  })
  it('출력에 정답 값이 들어가지 않는다', () => {
    const out = formatSheet(gradeSheet({ a: 'wrong', b: 1 }, spec, { a: 'SECRET-ANSWER', b: 987654 })).join('\n')
    expect(out).toContain('[다름] a')
    expect(out).not.toContain('SECRET-ANSWER')
    expect(out).not.toContain('987654')
  })
})
