import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { evaluatePass, loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { gradeSessions } from './sessions.mjs'

// t3: 더 깊이 — beginner 프로필에 없는 결함 min_defects 개 이상 + 버그 증거로 X-Request-Id 를 남긴 기록 1개 이상
const ctx = loadLabContext()
const { sessions, graded } = await gradeSessions(ctx)
const verdict = evaluatePass({ results: graded.results.filter((r) => r.status === 'detected'), detected: graded.detected }, ctx.pass, { repoRoot: ctx.repoRoot, noun: '버그' })
const reasons = verdict.reasons.filter((r) => !r.startsWith('제출한'))
const withId = sessions.flatMap((s) => (s.errors.length ? [] : s.bugs)).filter((b) => b.hasRequestId)
console.log(`  X-Request-Id 를 증거로 남긴 버그: ${withId.length}개`)
if (withId.length === 0) reasons.push('버그 증거에 X-Request-Id(응답 헤더 / 로그의 reqId)를 남긴 기록이 없습니다')
finish({
  passed: reasons.length === 0,
  message: verdict.summary,
  details: reasons,
  hints: [
    '화면에 보이는 값만 보지 말고, 상태가 바뀐 뒤의 데이터(재고, 저장된 금액, 쿠폰 사용 여부)와 숨은 변수(시각, 등급)를 따라가 보세요.',
    '`npm run logs -- --follow` 를 켜 두고 요청하면 reqId 가 보입니다. 응답 헤더 X-Request-Id 와 같은 값입니다.',
  ],
})
