import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dockerProblem } from '../../../../scripts/lib/docker.mjs'
import { apiNetwork, findRow, runLocust } from '../../../../scripts/lib/locust-runner.mjs'
import { resetSut } from '../../../../scripts/lib/sut.mjs'
import { prepareRunDir, removeRunDir } from '../../../../scripts/lib/vitest-runner.mjs'

export const here = path.dirname(fileURLToPath(import.meta.url))

/** SPEC §9 의 응답 시간 목표 (p95, ms). 동시 사용자 10명 기준. */
export const TARGETS = {
  products: { method: 'GET', path: '/api/products', maxP95: 100 },
  quote: { method: 'POST', path: '/api/quote', maxP95: 100 },
  orders: { method: 'GET', path: '/api/orders', maxP95: 200 },
}

/** 도커 사용 준비 확인. 문제가 있으면 한국어 사유, 없으면 { network }. */
export function prepare(ctx) {
  const problem = dockerProblem(ctx.repoRoot)
  if (problem) return { error: problem }
  const network = apiNetwork(ctx.repoRoot)
  if (!network) return { error: '대상 앱(api)이 실행 중이 아닙니다. npm run up 으로 먼저 기동하세요.' }
  return { network }
}

/**
 * locustfile 한 벌을 한 번 실행한다. 실행 전에 DB 를 초기화한다.
 * @returns {Promise<{ exitCode, output, stats }>}
 */
export async function runOnce(ctx, { network, locustfile, defects, users, durationS }) {
  await resetSut(ctx.baseUrl)
  const dir = prepareRunDir(ctx.labDir, 'locust', { files: [{ to: path.join('src', 'locustfile.py'), content: fs.readFileSync(locustfile) }, { to: path.join('out', '.keep'), content: '' }] })
  try {
    return runLocust({
      repoRoot: ctx.repoRoot, network, locustDir: path.join(dir, 'src'), outDir: path.join(dir, 'out'), users, durationS,
      env: defects === undefined ? {} : { QA_LAB_DEFECTS: defects },
    })
  } finally {
    removeRunDir(dir)
  }
}

export { findRow, removeRunDir }
