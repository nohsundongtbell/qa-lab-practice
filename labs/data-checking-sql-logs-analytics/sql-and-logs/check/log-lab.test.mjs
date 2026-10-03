import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { compareAnswers, t3Fields, t4Fields } from './log-lab.mjs'
import { buildLogs } from '../setup/logs.mjs'

const logs = buildLogs()
const asAnswer = (fields) => Object.fromEntries(fields.map((f) => [f.key, f.expected]))

describe('compareAnswers', () => {
  it('정답은 모두 맞다', () => {
    expect(compareAnswers(asAnswer(t3Fields(logs)), t3Fields(logs)).every((r) => r.ok)).toBe(true)
    expect(compareAnswers(asAnswer(t4Fields(logs)), t4Fields(logs)).every((r) => r.ok)).toBe(true)
  })

  it('숫자는 문자열이어도, 문자열은 대소문자·공백이 달라도 맞다', () => {
    const f = t4Fields(logs)
    const answer = { ...asAnswer(f), attempts: ' 3 ', gateway_tx_id: ` ${f[1].expected.toLowerCase()} ` }
    expect(compareAnswers(answer, f).every((r) => r.ok)).toBe(true)
  })

  it('빈칸·다른 값을 구분하고, 정답 값은 결과에 담지 않는다', () => {
    const f = t3Fields(logs)
    const r = compareAnswers({ total_requests: 1, count_5xx: '', most_5xx_endpoint: null }, f)
    expect(r.map((x) => [x.key, x.ok, x.blank])).toEqual([
      ['total_requests', false, false], ['count_5xx', false, true], ['most_5xx_endpoint', false, true], ['first_5xx_at', false, true], ['last_5xx_at', false, true],
    ])
    expect(JSON.stringify(r)).not.toContain(String(f[0].expected))
  })

  it('숫자 항목에 숫자가 아닌 값을 적으면 다름', () => {
    expect(compareAnswers({ attempts: 'abc' }, t4Fields(logs)).find((r) => r.key === 'attempts').ok).toBe(false)
  })

  it('YAML 에서 따옴표 없는 시각(13:02:46)도 문자열로 읽혀 맞다', () => {
    const answer = load(`first_5xx_at: ${t3Fields(logs)[3].expected}\nlast_5xx_at: ${t3Fields(logs)[4].expected}\n`)
    expect(typeof answer.first_5xx_at).toBe('string')
    expect(compareAnswers(answer, t3Fields(logs)).filter((r) => r.key.endsWith('_at')).every((r) => r.ok)).toBe(true)
  })
})
