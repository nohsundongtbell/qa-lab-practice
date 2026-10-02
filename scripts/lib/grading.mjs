import { ReproError, runRepro } from './repro-runner.mjs'

/**
 * 차등 오라클 + 결함 귀속 채점.
 *
 * 케이스(재현 절차) 하나마다:
 *  1. 결함 없는 버전(none)에서 실행 → 통과해야 "유효". 실패하면 기대값이 사양과 다른 것(invalid).
 *  2. 랩의 결함을 모두 켜고 실행 → 통과하면 "검출 못 함"(undetected).
 *  3. 실패하면 결함을 하나씩만 켜서 다시 실행 → 실패하게 만드는 결함이 이 케이스가 "잡은" 결함이다.
 *
 * @param {Array<{ id: string, label: string, repro: object, reset?: boolean }>} cases
 * @param {{ baseUrl: string, defectIds: string[], fetch?: typeof fetch, onProgress?: (msg: string) => void }} opts
 * @returns {Promise<{ results: Array<{ id: string, label: string, status: 'error'|'invalid'|'undetected'|'detected', defects: string[], failures?: object[], error?: string }>, detected: Set<string> }>}
 */
export async function gradeCases(cases, opts) {
  const { baseUrl, defectIds, onProgress = () => {} } = opts
  const run = (c, defects) => runRepro(c.repro, { baseUrl, defects, reset: Boolean(c.reset), fetch: opts.fetch })
  const results = []
  const detected = new Set()

  for (const [i, c] of cases.entries()) {
    onProgress(`(${i + 1}/${cases.length}) ${c.label}`)
    const base = { id: c.id, label: c.label, defects: [] }
    try {
      const none = await run(c, 'none')
      if (!none.passed) {
        results.push({ ...base, status: 'invalid', failures: none.failures })
        continue
      }
      if (defectIds.length === 0) {
        results.push({ ...base, status: 'undetected' })
        continue
      }
      const all = await run(c, defectIds.join(','))
      if (all.passed) {
        results.push({ ...base, status: 'undetected' })
        continue
      }
      const caught = []
      for (const id of defectIds) {
        if (!(await run(c, id)).passed) caught.push(id)
      }
      caught.forEach((id) => detected.add(id))
      results.push({ ...base, status: 'detected', defects: caught })
    } catch (err) {
      if (!(err instanceof ReproError)) throw err
      results.push({ ...base, status: 'error', error: err.message })
    }
  }
  return { results, detected }
}

/** 같은 결함을 잡은 케이스들을 묶는다 (리포트 중복 판정 등에 쓴다). */
export function groupByDefect(results) {
  const map = new Map()
  for (const r of results) for (const id of r.defects) map.set(id, [...(map.get(id) ?? []), r.id])
  return map
}
