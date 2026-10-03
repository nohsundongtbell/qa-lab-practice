/**
 * 사용: node scripts/ci/select-labs-cli.mjs [--base <git ref>] [--all]
 * 바뀐 파일(git diff --name-only <base>...HEAD)로 검증할 랩을 골라 GitHub Actions 출력(matrix, any)으로 쓴다.
 * GITHUB_OUTPUT 이 없으면 표준 출력에 JSON 으로 낸다.
 */
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { parseArgs } from '../lib/args.mjs'
import { discoverLabs } from '../lib/labs.mjs'
import { paths } from '../lib/paths.mjs'
import { selectLabs, toMatrix } from './select-labs.mjs'

const { flags } = parseArgs(process.argv.slice(2), { boolean: ['all'] })
const p = paths()
const labs = discoverLabs(p.labsDir).filter((l) => l.data).map((l) => ({ slug: `${l.moduleDir}/${l.labSlug}`, status: l.data.status, tools: l.data.tools, requires: l.data.requires }))

let changed = []
if (!flags.all) {
  const base = flags.base ?? 'origin/main'
  const r = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: p.root, encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(`git diff 에 실패했습니다 (${base}...HEAD): ${r.stderr.trim()}\n전체 랩을 대상으로 합니다.`)
    flags.all = true
  } else changed = r.stdout.split('\n').filter(Boolean)
}
const selected = flags.all ? labs.filter((l) => ['ready', 'beta'].includes(l.status)) : selectLabs(changed, labs)
const matrix = toMatrix(selected)
const out = { matrix: JSON.stringify(matrix), any: String(matrix.include.length > 0) }
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${v}\n`).join(''))
console.log(JSON.stringify({ changedFiles: changed.length, selected: selected.map((l) => l.slug) }, null, 2))
