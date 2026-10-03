import fs from 'node:fs'
import path from 'node:path'
import newman from 'newman'

export class CollectionError extends Error {}

const DEFECT_HEADER = 'X-QA-Lab-Defects'

/** 컬렉션 파일을 읽는다. 형식이 틀리면 CollectionError (한국어 메시지). */
export function readCollection(file) {
  const name = path.basename(file)
  if (!fs.existsSync(file)) throw new CollectionError(`${name} 이 없습니다. 컬렉션을 work/${name} 에 저장하세요 (Postman 은 Export → Collection v2.1).`)
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new CollectionError(`${name} 이 올바른 JSON 이 아닙니다: ${e.message}`)
  }
  if (!data || !Array.isArray(data.item) || !data.info) {
    throw new CollectionError(`${name} 이 Postman 컬렉션 형식(v2.1)이 아닙니다. info 와 item 이 있어야 합니다.`)
  }
  return data
}

function walk(items, fn) {
  for (const it of items) {
    if (Array.isArray(it.item)) walk(it.item, fn)
    else fn(it)
  }
}

/**
 * 모든 요청에 X-QA-Lab-Defects 헤더를 넣은 **사본**을 돌려준다 (원본은 바꾸지 않는다).
 * 학습자가 같은 헤더를 이미 붙였더라도 채점기 값이 이긴다 — 학습자가 띄운 프로필과 상관없이 같은 결과가 나오도록.
 */
export function withDefectHeader(collection, defects) {
  const copy = structuredClone(collection)
  walk(copy.item, (it) => {
    if (typeof it.request === 'string') it.request = { method: 'GET', url: it.request }
    const request = (it.request ??= { method: 'GET' })
    const headers = (request.header ?? []).filter((h) => String(h.key).toLowerCase() !== DEFECT_HEADER.toLowerCase())
    headers.push({ key: DEFECT_HEADER, value: defects })
    request.header = headers
  })
  return copy
}

/**
 * 컬렉션을 Newman 으로 실행한다.
 * @returns {Promise<{ requests: number, assertions: number, failures: Array<{ request: string, name: string }>, executions: Array<{ method: string, path: string, status: number }> }>}
 */
export function runCollection({ collection, baseUrl, defects, timeoutMs = 60_000 }) {
  const prepared = withDefectHeader(collection, defects)
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection: prepared,
        envVar: [{ key: 'baseUrl', value: baseUrl }],
        reporters: [],
        timeoutRequest: 10_000,
        timeout: timeoutMs,
        color: 'off',
      },
      (err, summary) => {
        if (err) return reject(new CollectionError(`컬렉션을 실행하지 못했습니다: ${err.message}`))
        const run = summary.run
        const executions = run.executions
          .filter((e) => e.response)
          .map((e) => ({ method: e.request.method, path: e.request.url.getPath(), status: e.response.code }))
        const failures = run.failures.map((f) => ({
          request: f.source?.name ?? '(알 수 없음)',
          name: f.error?.name === 'AssertionError' ? f.error.test || f.error.message : `${f.error?.name ?? '오류'} (요청 실행 실패)`,
        }))
        resolve({ requests: run.executions.length, assertions: run.stats.assertions.total, failures, executions })
      },
    )
  })
}
