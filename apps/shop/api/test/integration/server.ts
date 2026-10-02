import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app.js'
import { createPool, type Db } from '../../src/db/pool.js'
import { loadDefectSettings } from '../../src/defects/registry.js'
import { resetDatabase } from '../../src/db/reset.js'
import { defectsDir } from '../helpers.js'

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://shop:shop@127.0.0.1:55432/shop'

export interface TestServer {
  app: FastifyInstance
  db: Db
  baseUrl: string
  close: () => Promise<void>
}

/** 실제 포트로 앱을 띄운다 (임의 포트). 기본 결함 프로필은 none. */
export async function startServer(opts: { allowDevTools?: boolean; profile?: string } = {}): Promise<TestServer> {
  const db = createPool(DATABASE_URL)
  await resetDatabase(db)
  const defects = loadDefectSettings({ dir: defectsDir, profile: opts.profile ?? 'none' })
  const app = await buildApp({
    config: { allowDevTools: opts.allowDevTools ?? true, logFile: undefined, logLevel: 'silent', defectProfile: opts.profile ?? 'none' },
    db,
    defects,
    logger: false,
  })
  await app.listen({ port: 0, host: '127.0.0.1' })
  const address = app.server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return {
    app,
    db,
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      await app.close()
      await db.end()
    },
  }
}
