import fs from 'node:fs'
import { parseArgs, UsageError } from '../lib/args.mjs'
import { paths } from '../lib/paths.mjs'
import { buildSnapshot, diffSnapshots, loadSnapshot } from '../lib/snapshot.mjs'

export async function run(argv) {
  const { _: [source] } = parseArgs(argv)
  if (!source) throw new UsageError('사용법: npm run snapshot:update -- <modules.json 경로>')
  const p = paths()
  const src = JSON.parse(fs.readFileSync(source, 'utf8'))
  const old = fs.existsSync(p.snapshot) ? loadSnapshot(p.snapshot) : null
  const next = buildSnapshot(src, { untrackedInSource: old?.meta?.excludeFromLabs?.untrackedInSource ?? [] })

  if (old) {
    const d = diffSnapshots(old, next)
    const lines = [
      ['삭제된 모듈', d.removedModules], ['추가된 모듈', d.addedModules],
      ['삭제된 레슨', d.removedLessons], ['추가된 레슨', d.addedLessons],
    ].filter(([, v]) => v.length)
    for (const [label, v] of lines) console.log(`${label} ${v.length}개: ${v.slice(0, 10).join(', ')}${v.length > 10 ? ' …' : ''}`)
    if (d.removedModules.length || d.removedLessons.length) {
      console.log('\n경고: slug 가 삭제·변경되면 QA-Lab 링크와 labs/*/lab.yaml 이 깨질 수 있습니다. `npm run validate` 로 확인하세요.')
    }
  }
  fs.writeFileSync(p.snapshot, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`스냅샷을 갱신했습니다 (모듈 ${next.meta.counts.moduleRecords}개, 레슨 ${next.meta.counts.lessons}개).`)
  return 0
}
