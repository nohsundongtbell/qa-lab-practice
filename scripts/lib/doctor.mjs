import { ENV_PORT_KEYS, MIN_NODE, PROFILES } from './constants.mjs'
import { parseEnv } from './env.mjs'
import { portInspectHint } from './ports.mjs'
import { checkLineEndings, walkFiles } from './repo-checks.mjs'

/**
 * 환경 점검. 외부 의존(docker, 파일, 포트)은 인자로 받아 테스트할 수 있게 했다.
 * @param {object} deps
 * @param {string} deps.root 저장소 루트
 * @param {string} deps.platform process.platform
 * @param {string} deps.nodeVersion 예: "22.22.0"
 * @param {(args: string[]) => { status: number, stdout: string, missing: boolean }} deps.docker
 * @param {(port: number) => Promise<boolean>} deps.isPortFree
 * @param {() => string | null} deps.readEnv .env 내용 (없으면 null)
 * @param {() => boolean} deps.hasSnapshot
 * @returns {Promise<Array<{ level: 'ok'|'warn'|'fail', title: string, detail?: string, hint?: string }>>}
 */
export async function runDoctor(deps) {
  const results = []
  const push = (level, title, detail, hint) => results.push({ level, title, detail, hint })

  const [major, minor] = deps.nodeVersion.split('.').map(Number)
  if (major > MIN_NODE.major || (major === MIN_NODE.major && minor >= MIN_NODE.minor)) push('ok', `Node.js ${deps.nodeVersion}`)
  else push('fail', `Node.js ${deps.nodeVersion}`, `${MIN_NODE.major}.${MIN_NODE.minor} 이상이 필요합니다 (권장: 24 LTS).`, 'README 의 "준비물"을 보고 Node.js 를 설치·업데이트하세요.')

  const compose = deps.docker(['compose', 'version'])
  let dockerReady = false
  if (compose.missing) push('fail', 'Docker', '설치되어 있지 않습니다.', 'README 의 "준비물"을 보고 Docker Desktop 을 설치하세요.')
  else if (compose.status !== 0) push('fail', 'Docker Compose', '`docker compose` 를 실행할 수 없습니다.', 'Docker Desktop(Compose v2)을 설치·업데이트하세요.')
  else {
    push('ok', `Docker Compose (${compose.stdout.trim()})`)
    const info = deps.docker(['info'])
    if (info.status !== 0) push('fail', 'Docker 데몬', '실행 중이 아닙니다.', platformDockerHint(deps.platform))
    else {
      push('ok', 'Docker 데몬 실행 중')
      dockerReady = true
    }
  }

  const envText = deps.readEnv()
  const env = envText === null ? {} : parseEnv(envText)
  if (envText === null) push('ok', '.env 없음 (기본값 사용)', undefined, '프로필을 바꾸려면 `npm run up -- --profile beginner` 를 쓰세요.')
  else if (env.DEFECT_PROFILE && !PROFILES.includes(env.DEFECT_PROFILE)) {
    push('fail', `.env 의 DEFECT_PROFILE=${env.DEFECT_PROFILE}`, `${PROFILES.join(' | ')} 중 하나여야 합니다.`)
  } else push('ok', `결함 프로필: ${env.DEFECT_PROFILE || 'none'}`)

  let running = false
  if (dockerReady) running = deps.docker(['compose', 'ps', '-q']).stdout.trim() !== ''
  for (const [key, fallback] of Object.entries(ENV_PORT_KEYS)) {
    const port = Number(env[key] ?? fallback)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      push('fail', `${key}=${env[key]}`, '포트 번호가 올바르지 않습니다.')
    } else if (await deps.isPortFree(port)) push('ok', `포트 ${port} (${key}) 사용 가능`)
    else if (running) push('ok', `포트 ${port} (${key}) 사용 중 — 실행 중인 QA 숍`)
    else push('warn', `포트 ${port} (${key}) 가 다른 프로그램에서 사용 중입니다.`, undefined, `확인: ${portInspectHint(port, deps.platform)}  /  또는 .env 의 ${key} 를 다른 값으로 바꾸세요.`)
  }

  const crlf = checkLineEndings(deps.root, walkFiles(deps.root))
  if (crlf.length === 0) push('ok', '줄바꿈(LF) 정상')
  else push('fail', `CRLF 줄바꿈 파일 ${crlf.length}개`, crlf.slice(0, 3).map((c) => c.file).join(', '), '`git config core.autocrlf false` 로 바꾼 뒤 저장소를 다시 받으세요 (컨테이너 안 스크립트가 깨집니다).')

  push(deps.hasSnapshot() ? 'ok' : 'warn', deps.hasSnapshot() ? 'QA-Lab 스냅샷 있음' : 'QA-Lab 스냅샷이 없습니다')
  return results
}

function platformDockerHint(platform) {
  if (platform === 'darwin') return 'Docker Desktop 앱을 실행하세요 (메뉴 막대의 고래 아이콘이 멈춰 있는지 확인).'
  if (platform === 'win32') return 'Docker Desktop 을 실행하세요 (WSL 2 백엔드). 처음이면 설치 후 한 번 실행해야 합니다.'
  return 'Docker 서비스를 시작하세요 (예: sudo systemctl start docker).'
}

const TAG = { ok: '[ OK ]', warn: '[경고]', fail: '[실패]' }

export function formatDoctor(results) {
  const lines = []
  for (const r of results) {
    lines.push(`${TAG[r.level]} ${r.title}${r.detail ? ` — ${r.detail}` : ''}`)
    if (r.hint && r.level !== 'ok') lines.push(`       → ${r.hint}`)
    else if (r.hint) lines.push(`       (${r.hint})`)
  }
  return lines.join('\n')
}
