import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { readCharters } from './notes.mjs'

// t1: 차터 — 서로 다른 탐험 대상의 차터를 네 항목 모두 채워 2개 이상
const MIN_CHARTERS = 2
const ctx = loadLabContext()
const { complete, errors } = readCharters(ctx.workDir)
for (const c of complete) console.log(`  [차터 ${c.no}] ${c.fields['탐험 대상']}`)
const reasons = [...errors]
if (complete.length < MIN_CHARTERS) reasons.push(`완성된 차터가 ${complete.length}개입니다 (기준 ${MIN_CHARTERS}개 이상)`)
finish({
  passed: reasons.length === 0,
  message: `완성된 차터 ${complete.length}개`,
  details: reasons,
  hints: ['차터는 "무엇을(탐험 대상) · 무엇으로(자원) · 무엇을 알아내려고(알아낼 정보)"를 한 묶음으로 씁니다. 리스크에는 왜 이 차터가 먼저인지를 적습니다.'],
})
