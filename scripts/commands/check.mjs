import fs from 'node:fs'
import { parseArgs, UsageError } from '../lib/args.mjs'
import { discoverLabs, resolveLabs, workDir } from '../lib/labs.mjs'
import { paths } from '../lib/paths.mjs'
import { readEnvFile } from '../lib/env.mjs'
import { runCheck } from '../lib/runner.mjs'
import { baseUrlFrom, probeSut } from '../lib/sut.mjs'

const TARGETS = ['work', 'starter', 'solution']

export async function run(argv) {
  const { _: [key], flags } = parseArgs(argv, { string: ['task', 'from'] })
  const target = flags.from ?? 'work'
  if (!TARGETS.includes(target)) throw new UsageError(`--from 은 ${TARGETS.join(' | ')} 중 하나여야 합니다.`)
  if (!key) throw new UsageError('사용법: npm run check -- <모듈-slug>/<랩-이름> [--task t1]')

  const p = paths()
  const labs = discoverLabs(p.labsDir).filter((l) => l.data && !l.parseError)
  const found = resolveLabs(labs, key)
  if (found.length !== 1) {
    console.error(found.length ? `"${key}" 와(과) 일치하는 랩이 여러 개입니다: ${found.map((l) => `${l.moduleDir}/${l.labSlug}`).join(', ')}` : `랩을 찾을 수 없습니다: ${key}`)
    return 1
  }
  const [lab] = found
  const d = lab.data
  if (d.status === 'planned') {
    console.log('이 랩은 아직 준비 중입니다 (status: planned).')
    return 0
  }

  const work = target === 'work' ? workDir(lab) : `${lab.dir}/${target}`
  if (!fs.existsSync(work)) {
    console.error(target === 'work' ? `작업 폴더가 없습니다. 먼저 \`npm run lab -- ${lab.moduleDir}/${lab.labSlug}\` 를 실행하세요.` : `${target}/ 폴더가 없습니다.`)
    return 1
  }

  const baseUrl = baseUrlFrom(readEnvFile(p.env))
  if (d.requires.includes('docker')) {
    const sut = await probeSut(baseUrl)
    if (!sut) {
      console.error(`대상 앱에 연결할 수 없습니다 (${baseUrl}).\n먼저 \`npm run up -- --profile ${d.sut_profile}\` 로 기동하세요.`)
      return 1
    }
    if (sut.profile && sut.profile !== d.sut_profile) {
      console.log(`[주의] 이 랩은 결함 프로필 "${d.sut_profile}" 을(를) 가정하는데, 지금 앱은 "${sut.profile}" 로 실행 중입니다.\n       채점은 그대로 진행되지만, 직접 확인할 때 결과가 README 와 다를 수 있습니다.\n       \`npm run up -- --profile ${d.sut_profile}\` 로 맞추세요.\n`)
    }
  }

  const tasks = flags.task ? d.tasks.filter((t) => t.id === flags.task) : d.tasks
  if (tasks.length === 0) {
    console.error(`과제를 찾을 수 없습니다: ${flags.task} (사용 가능: ${d.tasks.map((t) => t.id).join(', ')})`)
    return 1
  }

  let passed = 0
  for (const task of tasks) {
    console.log(`\n=== ${task.id}: ${task.goal} ===`)
    const r = runCheck({ lab, task, workDir: work, target, baseUrl, repoRoot: p.root })
    if (r.error) console.error(`채점 스크립트를 실행하지 못했습니다: ${r.error.message}`)
    if (r.passed) passed++
  }
  console.log(`\n결과: ${passed}/${tasks.length} 과제 통과`)
  return passed === tasks.length ? 0 : 1
}
