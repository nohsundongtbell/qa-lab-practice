import { parseArgs } from '../lib/args.mjs'
import { compose, dockerProblem } from '../lib/docker.mjs'
import { paths } from '../lib/paths.mjs'

export async function run(argv) {
  const { flags } = parseArgs(argv, { boolean: ['volumes'] })
  const p = paths()
  const problem = dockerProblem(p.root)
  if (problem) {
    console.error(problem)
    return 1
  }
  const r = compose(['down', ...(flags.volumes ? ['--volumes'] : [])], { cwd: p.root, inherit: true })
  if (r.status === 0) {
    console.log(flags.volumes ? '\n멈추고 데이터를 지웠습니다.' : '\n멈췄습니다. 데이터는 그대로 남아 있습니다 (지우려면 `npm run reset`).')
  }
  return r.status
}
