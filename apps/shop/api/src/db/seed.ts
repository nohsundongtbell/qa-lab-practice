import { loadConfig } from '../config.js'
import { createPool } from './pool.js'
import { resetDatabase } from './reset.js'

// docker compose 의 seed 서비스가 기동할 때마다 실행한다.
// 이미 스키마가 있으면 건너뛴다 (재기동해도 학습 중인 데이터가 지워지지 않게).
// 강제로 초기화하려면: docker compose down -v, 또는 POST /__admin/reset, 또는 SEED_FORCE=1
const config = loadConfig()
const db = createPool(config.databaseUrl)
try {
  const exists = await db.query("SELECT to_regclass('public.members') IS NOT NULL AS ok")
  if (exists.rows[0].ok && process.env.SEED_FORCE !== '1') {
    console.log('[seed] 기존 데이터가 있어 건너뜁니다. (초기화: docker compose down -v)')
  } else {
    await resetDatabase(db)
    console.log('[seed] 스키마와 시드 데이터를 만들었습니다.')
  }
} catch (err) {
  console.error('[seed] 실패:', err)
  process.exitCode = 1
} finally {
  await db.end()
}
