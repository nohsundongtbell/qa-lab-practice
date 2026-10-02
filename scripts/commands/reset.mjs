import { compose, dockerProblem } from '../lib/docker.mjs'
import { paths } from '../lib/paths.mjs'
import { run as up } from './up.mjs'

export async function run() {
  const p = paths()
  const problem = dockerProblem(p.root)
  if (problem) {
    console.error(problem)
    return 1
  }
  console.log('데이터를 지우고 처음 상태로 되돌립니다 …')
  const down = compose(['down', '--volumes'], { cwd: p.root, inherit: true })
  if (down.status !== 0) return down.status
  return up([])
}
