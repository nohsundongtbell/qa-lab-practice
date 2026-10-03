import { discoverLabs } from './labs.mjs'

const list = (value) => (value ?? '').split(',').map((x) => x.trim()).filter(Boolean)

/**
 * 랩 E2E 대상: ready/beta 랩 중 QA_LAB_E2E_ONLY(쉼표로 여러 개)에 든 것, QA_LAB_E2E_SKIP 에 든 것은 뺀다.
 * @param {string} labsDir
 * @param {Record<string, string | undefined>} env
 */
export function selectE2eLabs(labsDir, env = process.env) {
  const only = list(env.QA_LAB_E2E_ONLY)
  const skip = list(env.QA_LAB_E2E_SKIP)
  return discoverLabs(labsDir)
    .filter((l) => l.data && ['ready', 'beta'].includes(l.data.status))
    .filter((l) => only.length === 0 || only.includes(`${l.moduleDir}/${l.labSlug}`))
    .filter((l) => !skip.includes(`${l.moduleDir}/${l.labSlug}`))
}

/** 실행 중인 대상 앱이 있어야 채점할 수 있는 랩인가 (lab.yaml requires 에 docker). */
export const needsSut = (lab) => (lab.data.requires ?? []).includes('docker')
