import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { evaluatePass, loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { gradeSessions } from './sessions.mjs'

// t2: 시간 상자 세션 — 형식이 맞는 세션 노트 1개 이상, 기록한 버그가 모두 재현되고 서로 다른 결함 min_defects 개 이상
const ctx = loadLabContext()
const { sessions, graded, bugErrors, validSessions } = await gradeSessions(ctx)
const verdict = evaluatePass(graded, ctx.pass, { repoRoot: ctx.repoRoot, noun: '버그' })
const reasons = verdict.reasons.filter((r) => !r.startsWith('제출한'))
if (validSessions.length === 0) reasons.unshift(sessions.length ? '형식이 맞는 세션 노트가 없습니다' : 'work/sessions/ 에 세션 노트가 없습니다')
else if (sessions.length !== validSessions.length) reasons.unshift(`형식이 맞지 않는 세션 노트 ${sessions.length - validSessions.length}개`)
if (bugErrors.length) reasons.push(`형식이 잘못된 버그 ${bugErrors.length}개`)
const notBugs = graded.results.filter((r) => r.status === 'undetected').length
if (notBugs) reasons.push(`재현되지 않는 버그 ${notBugs}개 — 절차를 고치거나, 확실하지 않으면 "이슈·질문"으로 옮기세요`)
const hints = []
if (graded.results.some((r) => r.status === 'invalid')) hints.push('[무효]는 repro 의 expect 가 사양과 다르다는 뜻입니다. 사양대로라면 나와야 할 값을 적으세요.')
if (verdict.counted.length < (ctx.pass.min_defects ?? 0)) hints.push('README 의 "막혔을 때" 힌트를 차례로 열어 보세요.')
finish({ passed: reasons.length === 0, message: verdict.summary, details: reasons, hints })
