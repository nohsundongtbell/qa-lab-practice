import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { load as loadYaml } from 'js-yaml'
import { runRepro, type Repro } from '../../../../../scripts/lib/repro-runner.mjs'
import { defectsDir } from '../helpers.js'
import { startServer, type TestServer } from './server.js'

interface CatalogEntry {
  id: string
  repro: Repro
}

const catalog = loadYaml(fs.readFileSync(path.join(defectsDir, 'catalog.yaml'), 'utf8')) as { defects: CatalogEntry[] }
const allIds = catalog.defects.map((d) => d.id)

let server: TestServer
beforeAll(async () => {
  server = await startServer({ allowDevTools: true })
})
afterAll(async () => {
  await server.close()
})

const run = (repro: Repro, defects: string) => runRepro(repro, { baseUrl: server.baseUrl, defects, reset: true })

describe.each(catalog.defects.map((d) => [d.id, d] as const))('%s', (id, entry) => {
  it('결함이 없으면(none) 재현 절차가 통과한다', async () => {
    const r = await run(entry.repro, 'none')
    expect(r.failures).toEqual([])
  })

  it('이 결함만 켜면 재현된다', async () => {
    const r = await run(entry.repro, id)
    expect(r.passed, '결함이 켜졌는데 재현 절차가 통과했다').toBe(false)
  })

  it('독립성: 이 결함만 끄고 나머지를 모두 켜면 통과한다', async () => {
    const others = allIds.filter((x) => x !== id)
    const r = await run(entry.repro, others.length ? others.join(',') : 'none')
    expect(r.failures).toEqual([])
  })
})
