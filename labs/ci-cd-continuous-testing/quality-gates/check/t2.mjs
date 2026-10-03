import fs from 'node:fs'
import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { runScenarios, summarize } from './gate-lab.mjs'
import { SCENARIOS } from './gate-scenarios.mjs'

const ctx = loadLabContext()
const file = path.join(ctx.workDir, 'gate.mjs')
if (!fs.existsSync(file)) finish({ passed: false, message: 'gate.mjs 가 없습니다. npm run lab 으로 작업 폴더를 만드세요' })
else {
  const results = await runScenarios(file, SCENARIOS)
  const s = summarize(results)
  console.log(`  정답 ${s.correct}/${s.total}`)
  for (const n of s.lenient) console.log(`  [너무 느슨함] 막아야 하는데 통과시킴: ${n}`)
  for (const n of s.strict) console.log(`  [너무 엄격함] 통과해야 하는데 막음: ${n}`)
  for (const n of s.errors) console.log(`  [오류] 종료 코드가 0·1 이 아니거나 실행하지 못함: ${n}`)
  const min = ctx.pass.min_correct ?? s.total
  finish({
    passed: s.correct >= min,
    message: `시나리오 ${s.total}개 중 ${s.correct}개 정답 (기준 ${min}개 이상)`,
    hints: [
      '정책(G1~G7)을 표에서 하나씩 코드로 옮기고, 경계값(정확히 80%, 정확히 2.0포인트, 정확히 1.2배, 격리 기한 마지막 날)에서 부등호가 맞는지 확인하세요.',
      '지표가 없거나 형식이 틀리면 통과시키지 말고 차단하세요(fail closed). 읽다가 예외가 나도 종료 코드는 1 이어야 합니다.',
      '직접 시험하려면 README 의 예시 지표 파일을 만들어 node gate.mjs 로 실행하고, echo $? (PowerShell 은 $LASTEXITCODE)로 종료 코드를 보세요.',
    ],
  })
}
