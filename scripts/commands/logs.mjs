import fs from 'node:fs'
import { parseArgs, UsageError } from '../lib/args.mjs'
import { followFile, tailLines } from '../lib/logs.mjs'
import { paths, toPosix } from '../lib/paths.mjs'

export async function run(argv) {
  const { flags } = parseArgs(argv, { boolean: ['follow'], string: ['lines', 'grep'] })
  const n = flags.lines === undefined ? 50 : Number(flags.lines)
  if (!Number.isInteger(n) || n < 1) throw new UsageError('--lines 는 1 이상의 정수여야 합니다.')
  const { appLog, root } = paths()
  const match = (line) => flags.grep === undefined || line.includes(flags.grep)
  const rel = toPosix(appLog.slice(root.length + 1))

  if (!fs.existsSync(appLog)) {
    console.error(`로그 파일이 아직 없습니다: ${rel}\n먼저 \`npm run up\` 으로 앱을 기동하고, 요청을 몇 번 보내 보세요.`)
    return 1
  }
  for (const line of tailLines(appLog, n).filter(match)) console.log(line)
  if (!flags.follow) return 0

  console.error(`\n--- ${rel} 을(를) 계속 읽는 중 (Ctrl+C 로 끝내기) ---`)
  followFile(appLog, (line) => match(line) && console.log(line))
  await new Promise(() => {})
}
