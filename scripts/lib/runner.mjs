import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { checkFiles } from './lab-schema.mjs'

/** 현재 OS 에서 실행할 check 파일을 고른다. */
export function pickCheckFile(check, platform = process.platform) {
  const files = checkFiles(check)
  if (!files) return null
  if (files[0].platform === 'any') return files[0].file
  return (platform === 'win32' ? files.find((f) => f.platform === 'windows') : files.find((f) => f.platform === 'unix')).file
}

/** check 스크립트를 실행하는 명령(셸 없이 인자 배열). */
export function commandFor(file, platform = process.platform) {
  if (file.endsWith('.mjs')) return { cmd: process.execPath, args: [file] }
  if (file.endsWith('.ps1')) return { cmd: 'powershell', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file] }
  if (file.endsWith('.sh')) return { cmd: 'sh', args: [file] }
  throw new Error(`실행할 수 없는 check 형식입니다: ${file}`)
}

/**
 * check 스크립트 한 개를 실행한다. 종료 코드 0 = 통과, 그 밖 = 실패.
 * 스크립트가 알아야 하는 값은 모두 환경 변수(QA_LAB_*)로 넘긴다 (docs/LAB_SCHEMA.md).
 */
export function runCheck({ lab, task, workDir, target, baseUrl, repoRoot }) {
  const file = pickCheckFile(task.check)
  const { cmd, args } = commandFor(path.join(lab.dir, file))
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: lab.dir,
    env: {
      ...process.env,
      QA_LAB_REPO_ROOT: repoRoot,
      QA_LAB_LAB_DIR: lab.dir,
      QA_LAB_WORK_DIR: workDir,
      QA_LAB_TARGET: target,
      QA_LAB_TASK_ID: task.id,
      QA_LAB_BASE_URL: baseUrl,
    },
  })
  return { passed: r.status === 0, status: r.status, error: r.error }
}
