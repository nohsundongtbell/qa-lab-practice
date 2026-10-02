import path from 'node:path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { paths } from '../lib/paths.mjs'
import { readEnvFile } from '../lib/env.mjs'
import { baseUrlFrom, probeSut } from '../lib/sut.mjs'

/** 모든 ready/beta 랩을 실행 중인 SUT 로 채점해 본다 (solution 통과, starter 실패). */
export async function run() {
  const p = paths()
  const baseUrl = baseUrlFrom(readEnvFile(p.env))
  const sut = await probeSut(baseUrl)
  if (!sut || sut.profile === null) {
    console.error(`대상 앱에 연결할 수 없거나 개발용 기능이 꺼져 있습니다 (${baseUrl}). 먼저 \`npm run up\` 을 실행하세요.`)
    return 1
  }
  // vitest 는 하위 경로를 exports 로 막아 두어 require.resolve 를 쓸 수 없다. 루트 node_modules 의 실행 파일을 쓴다.
  const vitest = path.join(p.root, 'node_modules', 'vitest', 'vitest.mjs')
  if (!fs.existsSync(vitest)) {
    console.error('vitest 가 설치되어 있지 않습니다. 저장소 루트에서 `npm ci` 를 먼저 실행하세요.')
    return 1
  }
  const r = spawnSync(process.execPath, [vitest, 'run', '--config', path.join(p.root, 'vitest.e2e.config.mjs')], { cwd: p.root, stdio: 'inherit' })
  return r.status ?? 1
}
