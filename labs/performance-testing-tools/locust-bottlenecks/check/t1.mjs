import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { findRow, prepare, runOnce, TARGETS } from './perf-lab.mjs'

const ctx = loadLabContext()
const { users = 10, duration_s: durationS = 15, min_requests: minRequests = 5 } = ctx.pass
const file = path.join(ctx.workDir, 'locustfile.py')
const ready = prepare(ctx)

if (ready.error) finish({ passed: false, message: ready.error })
else {
  const r = await runOnce(ctx, { network: ready.network, locustfile: file, defects: 'none', users, durationS })
  const rows = r.stats.rows
  if (rows.length === 0) {
    const tail = r.output.split('\n').filter((l) => /Error|error|Traceback|SyntaxError|No module|not found/i.test(l)).slice(-4)
    finish({ passed: false, message: 'locustfile.py 를 실행하지 못했거나 요청이 하나도 없습니다', details: tail.length ? tail : r.stats.errors, hints: ['work/locustfile.py 의 문법과 HttpUser 클래스, @task 가 있는지 확인하세요. 직접 실행해 보는 방법은 README 를 보세요.'] })
  } else {
    const reasons = []
    for (const t of Object.values(TARGETS)) {
      const row = findRow(rows, t.method, t.path)
      const n = row?.requests ?? 0
      console.log(`  ${n >= minRequests ? '[통과]' : '[실패]'} ${t.method} ${t.path} — 요청 ${n}건 (기준 ${minRequests}건 이상)`)
      if (n < minRequests) reasons.push(`${t.method} ${t.path} 요청이 ${n}건입니다 (기준 ${minRequests}건 이상)`)
    }
    const login = findRow(rows, 'POST', '/api/auth/login')
    if (login && login.requests > users * 2) reasons.push(`로그인 요청이 ${login.requests}건입니다 — 사용자당 한 번(on_start)만 로그인하세요 (사용자 ${users}명)`)
    const total = rows.reduce((s, x) => s + x.requests, 0)
    const failures = rows.reduce((s, x) => s + x.failures, 0)
    console.log(`  요청 ${total}건, 실패 ${failures}건`)
    if (total > 0 && failures / total >= 0.01) reasons.push(`실패율이 ${((failures / total) * 100).toFixed(1)}% 입니다 (기준 1% 미만) — 요청 순서(로그인 → 토큰 헤더)나 본문을 확인하세요`)
    finish({
      passed: reasons.length === 0,
      message: reasons.length === 0 ? `부하 시나리오가 세 엔드포인트를 모두 실행하고 실패가 없습니다 (사용자 ${users}명, ${durationS}초)` : '부하 시나리오가 기준을 채우지 못했습니다',
      details: reasons,
      hints: [
        '로그인 응답의 token 을 self.client.headers["Authorization"] = "Bearer …" 로 넣어 두면 이후 모든 요청에 붙습니다 (on_start).',
        '@task(가중치) 로 사용자 행동의 비율을 정합니다. 요청이 너무 적으면 wait_time 을 줄이세요.',
        '실패율이 높다면 직접 한 번 실행해 실패한 요청의 상태 코드를 보세요 (README).',
      ],
    })
  }
}
