import { parseArgs, UsageError } from '../lib/args.mjs'
import { discoverLabs, resolveLabs } from '../lib/labs.mjs'
import { paths } from '../lib/paths.mjs'

export async function run(argv) {
  const { _: [key], flags } = parseArgs(argv, { boolean: ['yes'] })
  if (!key) throw new UsageError('사용법: npm run solution -- <모듈-slug>/<랩-이름> --yes')
  const labs = discoverLabs(paths().labsDir).filter((l) => l.data && !l.parseError)
  const found = resolveLabs(labs, key)
  if (found.length !== 1) {
    console.error(found.length ? `"${key}" 와(과) 일치하는 랩이 여러 개입니다.` : `랩을 찾을 수 없습니다: ${key}`)
    return 1
  }
  const [lab] = found
  if (!flags.yes) {
    console.log('⚠ 정답은 스포일러입니다. 먼저 README 의 "막혔을 때"에서 힌트 1 → 힌트 2 를 차례로 확인해 보세요.')
    console.log(`그래도 정답 위치를 보려면: npm run solution -- ${lab.moduleDir}/${lab.labSlug} --yes`)
    return 0
  }
  console.log(`정답 위치: ${lab.rel}/solution/`)
  return 0
}
