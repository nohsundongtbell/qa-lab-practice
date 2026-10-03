import { describe, expect, it } from 'vitest'
import { needsSut, selectE2eLabs } from './e2e-labs.mjs'
import { paths } from './paths.mjs'

const { labsDir } = paths()
const slugs = (env) => selectE2eLabs(labsDir, env).map((l) => `${l.moduleDir}/${l.labSlug}`)

describe('selectE2eLabs / needsSut', () => {
  it('QA_LAB_E2E_ONLY 로 고르고 QA_LAB_E2E_SKIP 으로 뺀다', () => {
    expect(slugs({ QA_LAB_E2E_ONLY: 'test-design/shop-rules, unit-integration-testing/cart-domain' })).toEqual(['test-design/shop-rules', 'unit-integration-testing/cart-domain'])
    expect(slugs({ QA_LAB_E2E_SKIP: 'test-design/shop-rules' })).not.toContain('test-design/shop-rules')
    expect(slugs({}).length).toBeGreaterThan(2)
  })

  it('requires 에 docker 가 있는 랩만 실행 중인 앱이 필요하다 (lab-ci 는 그런 랩에만 앱을 띄운다)', () => {
    const [docker] = selectE2eLabs(labsDir, { QA_LAB_E2E_ONLY: 'test-design/shop-rules' })
    const [noDocker] = selectE2eLabs(labsDir, { QA_LAB_E2E_ONLY: 'unit-integration-testing/cart-domain' })
    expect(needsSut(docker)).toBe(true)
    expect(needsSut(noDocker)).toBe(false)
  })
})
