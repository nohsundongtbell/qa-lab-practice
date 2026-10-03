import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { dbUrlFrom } from './sut.mjs'

/**
 * 랩의 setup 스크립트를 실행한다 (lab.yaml 의 setup). 여러 번 실행해도 안전해야 한다(멱등).
 * `npm run lab` 과 `npm run check` 가 실행한다 — DB 를 초기화(`npm run reset`)한 뒤에도 채점이 동작하도록.
 */
export function runSetup({ lab, workDir, baseUrl, repoRoot, env }) {
  if (!lab.data.setup) return { ran: false, ok: true }
  const r = spawnSync(process.execPath, [path.join(lab.dir, lab.data.setup)], {
    stdio: 'inherit',
    cwd: lab.dir,
    env: {
      ...process.env,
      QA_LAB_REPO_ROOT: repoRoot,
      QA_LAB_LAB_DIR: lab.dir,
      QA_LAB_WORK_DIR: workDir,
      QA_LAB_BASE_URL: baseUrl,
      QA_LAB_DB_URL: dbUrlFrom(env),
    },
  })
  return { ran: true, ok: r.status === 0 }
}
