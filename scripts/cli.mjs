#!/usr/bin/env node
/**
 * 모든 `npm run <명령>` 의 단일 진입점.
 * npm 스크립트 본문을 이 파일 호출 한 줄로 고정해, macOS(sh)와 Windows(cmd.exe)의 셸 문법 차이를 없앤다.
 */
import { UsageError } from './lib/args.mjs'

const COMMANDS = {
  up: '대상 앱을 기동한다 (--profile <none|beginner|intermediate|advanced>)',
  down: '대상 앱을 멈춘다 (데이터 유지, --volumes 면 삭제)',
  reset: '데이터를 지우고 처음 상태로 다시 기동한다',
  lab: '랩을 시작한다: npm run lab -- <slug> (인자 없으면 목록)',
  check: '랩을 채점한다: npm run check -- <slug> [--task t1]',
  solution: '정답 위치를 알려 준다: npm run solution -- <slug> --yes',
  logs: 'API 로그를 본다 (--follow, --lines N, --grep 문자열)',
  doctor: '환경을 점검한다 (Node, Docker, 포트, 줄바꿈)',
  validate: '저장소 규칙을 검증한다 (랩, 스냅샷, 문서)',
  'build-index': 'labs/index.json 을 만든다 (--check 면 최신인지만 확인)',
  'snapshot-update': 'QA-Lab modules.json 으로 스냅샷을 갱신한다',
  'test-labs': '모든 랩을 실행 중인 앱으로 채점해 본다 (solution 통과·starter 실패)',
}

function help() {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length))
  console.log('사용법: npm run <명령> [-- 옵션]\n')
  for (const [name, desc] of Object.entries(COMMANDS)) console.log(`  ${name.padEnd(width)}  ${desc}`)
}

const [name, ...argv] = process.argv.slice(2)
if (!name || name === 'help' || name === '--help') {
  help()
} else if (!(name in COMMANDS)) {
  console.error(`알 수 없는 명령입니다: ${name}\n`)
  help()
  process.exitCode = 2
} else {
  try {
    const { run } = await import(`./commands/${name}.mjs`)
    process.exitCode = (await run(argv)) ?? 0
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(`사용 방법이 올바르지 않습니다: ${err.message}`)
      process.exitCode = 2
    } else {
      console.error(`오류: ${err.message}`)
      if (process.env.QA_LAB_DEBUG) console.error(err.stack)
      process.exitCode = 1
    }
  }
}
