import fs from 'node:fs'
import { docker } from '../lib/docker.mjs'
import { formatDoctor, runDoctor } from '../lib/doctor.mjs'
import { paths } from '../lib/paths.mjs'
import { isPortFree } from '../lib/ports.mjs'

export async function run() {
  const p = paths()
  const results = await runDoctor({
    root: p.root,
    platform: process.platform,
    nodeVersion: process.versions.node,
    docker: (args) => docker(args, { cwd: p.root }),
    isPortFree,
    readEnv: () => (fs.existsSync(p.env) ? fs.readFileSync(p.env, 'utf8') : null),
    hasSnapshot: () => fs.existsSync(p.snapshot),
  })
  console.log(formatDoctor(results))
  const failed = results.filter((r) => r.level === 'fail').length
  console.log(failed ? `\n해결이 필요한 항목이 ${failed}개 있습니다.` : '\n문제 없습니다.')
  return failed ? 1 : 0
}
