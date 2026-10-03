import fs from 'node:fs'
import { parseArgs } from '../lib/args.mjs'
import { LEVELS } from '../lib/constants.mjs'
import { discoverLabs, resolveLabs, workDir } from '../lib/labs.mjs'
import { paths } from '../lib/paths.mjs'
import { readEnvFile } from '../lib/env.mjs'
import { runSetup } from '../lib/setup-runner.mjs'
import { baseUrlFrom } from '../lib/sut.mjs'

export async function run(argv) {
  const { _: [key] } = parseArgs(argv)
  const p = paths()
  const labs = discoverLabs(p.labsDir).filter((l) => l.data && !l.parseError)

  if (!key) {
    if (labs.length === 0) {
      console.log('아직 만들어진 랩이 없습니다. (랩은 labs/<모듈-slug>/<랩-이름>/ 에 추가됩니다)')
      return 0
    }
    console.log('랩 목록 (시작: npm run lab -- <모듈-slug>/<랩-이름>)\n')
    for (const l of labs) {
      console.log(`  ${l.moduleDir}/${l.labSlug}  [${l.data.status}] ${LEVELS[l.data.level] ?? l.data.level} · 약 ${l.data.est_minutes}분 · ${l.data.title_ko}`)
    }
    return 0
  }

  const found = resolveLabs(labs, key)
  if (found.length === 0) {
    console.error(`랩을 찾을 수 없습니다: ${key}\n\`npm run lab\` 으로 목록을 확인하세요.`)
    return 1
  }
  if (found.length > 1) {
    console.error(`"${key}" 와(과) 일치하는 랩이 여러 개입니다. 아래 중 하나를 정확히 입력하세요.`)
    for (const l of found) console.error(`  ${l.moduleDir}/${l.labSlug}`)
    return 1
  }

  const [lab] = found
  const d = lab.data
  console.log(`${d.title_ko}\n  수준 ${LEVELS[d.level]} · 약 ${d.est_minutes}분 · 상태 ${d.status}\n  준비물: ${d.requires.join(', ')}\n`)
  if (d.status === 'planned') {
    console.log('이 랩은 아직 준비 중입니다 (status: planned).')
    return 0
  }

  const starter = `${lab.dir}/starter`
  const work = workDir(lab)
  if (fs.existsSync(starter) && !fs.existsSync(work)) {
    fs.cpSync(starter, work, { recursive: true })
    console.log(`시작 파일을 복사했습니다: ${lab.rel}/work/  (이 폴더에서 작업하세요. git 에는 올라가지 않습니다)`)
  } else if (fs.existsSync(work)) {
    console.log(`작업 폴더가 이미 있습니다: ${lab.rel}/work/  (처음부터 다시 하려면 이 폴더를 지우고 다시 실행하세요)`)
  }
  if (d.setup) {
    console.log('\n이 랩의 준비 작업을 실행합니다 (대상 앱의 DB 가 필요합니다) …')
    const env = readEnvFile(p.env)
    const s = runSetup({ lab, workDir: work, baseUrl: baseUrlFrom(env), repoRoot: p.root, env })
    if (!s.ok) {
      console.error(`\n준비 작업에 실패했습니다. 대상 앱을 먼저 기동하세요: ${d.sut_profile === 'any' ? 'npm run up' : `npm run up -- --profile ${d.sut_profile}`}\n그다음 \`npm run lab -- ${lab.moduleDir}/${lab.labSlug}\` 를 다시 실행하세요 (이미 한 작업은 건너뜁니다).`)
      return 1
    }
  }
  console.log(`\n1. README 를 읽으세요: ${lab.rel}/README.md`)
  console.log(d.sut_profile === 'any' ? '2. 대상 앱을 기동하세요: npm run up' : `2. 대상 앱을 이 랩의 결함 프로필로 기동하세요: npm run up -- --profile ${d.sut_profile}`)
  console.log(`3. 끝나면 채점하세요: npm run check -- ${lab.moduleDir}/${lab.labSlug}`)
  return 0
}
