import fs from 'node:fs'
import { parseArgs, UsageError } from '../lib/args.mjs'
import { PROFILES } from '../lib/constants.mjs'
import { compose, dockerProblem } from '../lib/docker.mjs'
import { ensureEnvFile, readEnvFile, setEnvVar } from '../lib/env.mjs'
import { paths } from '../lib/paths.mjs'
import { isPortFree, portInspectHint } from '../lib/ports.mjs'

export async function run(argv) {
  const { flags } = parseArgs(argv, { string: ['profile'] })
  const p = paths()
  if (flags.profile && !PROFILES.includes(flags.profile)) {
    throw new UsageError(`--profile 은 ${PROFILES.join(' | ')} 중 하나여야 합니다.`)
  }
  const problem = dockerProblem(p.root)
  if (problem) {
    console.error(problem)
    return 1
  }

  if (flags.profile) {
    ensureEnvFile(p)
    fs.writeFileSync(p.env, setEnvVar(fs.readFileSync(p.env, 'utf8'), 'DEFECT_PROFILE', flags.profile))
  }
  const env = readEnvFile(p.env)

  // 이미 실행 중이면 포트가 사용 중인 것이 정상이다. 꺼져 있을 때만 충돌을 점검한다.
  const running = compose(['ps', '-q'], { cwd: p.root }).stdout.trim() !== ''
  if (!running) {
    for (const [key, fallback] of [['WEB_PORT', 8080], ['API_PORT', 3000], ['DB_PORT', 55432]]) {
      const port = Number(env[key] ?? fallback)
      if (!(await isPortFree(port))) {
        console.error(`포트 ${port} (${key}) 가 다른 프로그램에서 사용 중입니다.`)
        console.error(`  확인: ${portInspectHint(port)}`)
        console.error(`  또는 .env 의 ${key} 를 다른 값으로 바꾸세요.`)
        return 1
      }
    }
  }

  const profile = env.DEFECT_PROFILE || 'none'
  console.log(`QA 숍을 기동합니다 (결함 프로필: ${profile}) …`)
  const r = compose(['up', '-d', '--wait'], { cwd: p.root, inherit: true })
  if (r.status !== 0) {
    console.error('\n기동에 실패했습니다. `npm run doctor` 로 환경을 점검해 보세요.')
    return r.status
  }
  const web = env.WEB_PORT ?? 8080
  const api = env.API_PORT ?? 3000
  console.log(`\n준비되었습니다.\n  웹        http://127.0.0.1:${web}\n  API       http://127.0.0.1:${api}\n  API 문서  http://127.0.0.1:${api}/docs\n  프로필    ${profile}`)
  return 0
}
