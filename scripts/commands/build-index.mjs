import fs from 'node:fs'
import { parseArgs } from '../lib/args.mjs'
import { buildIndex, serializeIndex, writeIndex } from '../lib/index-builder.mjs'
import { discoverLabs } from '../lib/labs.mjs'
import { paths } from '../lib/paths.mjs'
import { loadSnapshot } from '../lib/snapshot.mjs'
import { formatErrors, validateRepo } from '../lib/validate.mjs'

export async function run(argv) {
  const { flags } = parseArgs(argv, { boolean: ['check'] })
  const p = paths()
  // 잘못된 랩이 섞인 인덱스가 QA-Lab 에 전달되면 안 되므로, 먼저 전체 검증을 통과해야 한다.
  const { errors } = validateRepo(p.root)
  if (errors.length) {
    console.error(formatErrors(errors))
    console.error('\n검증에 실패해 인덱스를 만들 수 없습니다. 위 오류를 먼저 고치세요.')
    return 1
  }
  const index = buildIndex(discoverLabs(p.labsDir), loadSnapshot(p.snapshot))
  const text = serializeIndex(index)
  if (flags.check) {
    const current = fs.existsSync(p.labsIndex) ? fs.readFileSync(p.labsIndex, 'utf8') : null
    if (current !== text) {
      console.error('labs/index.json 이 최신이 아닙니다. `npm run build-index` 를 실행해 다시 만들고 커밋하세요.')
      return 1
    }
    console.log(`labs/index.json 이 최신입니다 (랩 항목 ${index.labs.length}개).`)
    return 0
  }
  writeIndex(p.labsIndex, index)
  console.log(`labs/index.json 을 만들었습니다 (랩 항목 ${index.labs.length}개).`)
  return 0
}
