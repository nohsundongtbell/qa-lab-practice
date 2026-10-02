import { spawnSync } from 'node:child_process'

/**
 * docker 를 셸 없이 실행한다 (인자 배열). OS 별 인용 규칙 차이가 생기지 않는다.
 * @returns {{ status: number, stdout: string, stderr: string, missing: boolean }}
 */
export function docker(args, { cwd, inherit = false } = {}) {
  const r = spawnSync('docker', args, {
    cwd,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    missing: r.error?.code === 'ENOENT',
  }
}

export const compose = (args, opts) => docker(['compose', ...args], opts)

/** docker 와 compose 를 쓸 수 있는지 확인하고, 안 되면 한국어 사유를 돌려준다. */
export function dockerProblem(root) {
  const v = docker(['compose', 'version'], { cwd: root })
  if (v.missing) return 'Docker 가 설치되어 있지 않습니다. README 의 "준비물"을 보고 설치하세요.'
  if (v.status !== 0) return '`docker compose` 를 실행할 수 없습니다. Docker Desktop(Compose v2)을 설치·업데이트하세요.'
  const info = docker(['info'], { cwd: root })
  if (info.status !== 0) return 'Docker 가 실행 중이 아닙니다. Docker Desktop 을 켠 뒤 다시 시도하세요.'
  return null
}
