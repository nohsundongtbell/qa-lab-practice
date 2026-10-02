import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createPool } from './db/pool.js'
import { loadDefectSettings } from './defects/registry.js'
import { dropPrivileges } from './lib/privileges.js'

const config = loadConfig()
dropPrivileges(config.logFile)
const defects = loadDefectSettings({
  dir: config.defectsDir,
  profile: config.defectProfile,
  on: config.defectsOn,
  off: config.defectsOff,
})
const db = createPool(config.databaseUrl)
const app = await buildApp({ config, db, defects })

app.log.info({ profile: config.defectProfile, activeDefects: defects.active.size, devTools: config.allowDevTools }, 'QA 숍 API 시작')

const shutdown = async () => {
  await app.close()
  await db.end()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

await app.listen({ port: config.port, host: config.host })
