import path from 'node:path'
import { loadCatalog } from '../../../../scripts/lib/defects.mjs'
import { resetSut } from '../../../../scripts/lib/sut.mjs'
import { loadSpec, listOperations } from '../../../../scripts/lib/openapi-ops.mjs'

/** 이 랩의 모듈과 연결된 결함 ID (카탈로그의 modules 기준, 채점기 내부 전용). */
export function labDefectIds(ctx) {
  return [...loadCatalog(ctx.repoRoot).values()].filter((d) => (d.modules ?? []).includes(ctx.lab.module)).map((d) => d.id)
}

export const specFile = (repoRoot) => path.join(repoRoot, 'apps', 'shop', 'api', 'openapi.yaml')
export const operationsOf = (repoRoot) => listOperations(loadSpec(specFile(repoRoot)))

/**
 * 결함을 하나씩 켜 보며 `runWith(defects)` 가 실패(true)하는 결함을 모은다.
 * 전부 켠 실행이 통과하면 (아무것도 못 잡음) 하나씩 돌리지 않는다.
 * @param {(defects: string) => Promise<boolean>} failsWith 결함 집합으로 실행했을 때 학습자 검증이 실패하면 true
 */
export async function attribute(ids, failsWith, onDetect = () => {}) {
  const detected = []
  if (!(await failsWith(ids.join(',')))) return detected
  for (const id of ids) {
    if (await failsWith(id)) {
      detected.push(id)
      onDetect(id)
    }
  }
  return detected
}

export { resetSut }
