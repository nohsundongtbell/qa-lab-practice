import { gradeCases, groupByDefect } from '../../../../scripts/lib/grading.mjs'
import { formatCaseResult } from '../../../../scripts/lib/lab-kit.mjs'
import { bugCases, readCharters, readSessions } from './notes.mjs'

/** t2·t3 공통: 세션 노트 읽기 → 형식 검사 → 버그 재현 채점. 출력도 여기서 한다. */
export async function gradeSessions(ctx) {
  const { charters } = readCharters(ctx.workDir)
  const sessions = readSessions(ctx.workDir, charters.map((c) => c.no))
  console.log(`세션 노트 ${sessions.length}개 (work/sessions/*.md, 밑줄로 시작하는 파일 제외)`)
  for (const s of sessions.filter((x) => x.errors.length)) {
    console.log(`  [형식] ${s.file}`)
    for (const e of s.errors) console.log(`         - ${e}`)
  }
  const { cases, errors: bugErrors } = bugCases(sessions)
  for (const e of bugErrors) console.log(`  [형식] ${e}`)
  if (cases.length) console.log('(버그 재현 절차를 실행하면서 DB 를 여러 번 초기화합니다)')
  const graded = await gradeCases(cases, { baseUrl: ctx.baseUrl, defectIds: ctx.defectIds })
  for (const r of graded.results) console.log(formatCaseResult(r).replace('[미검출]', '[버그 아님]'))
  const dup = [...groupByDefect(graded.results).entries()].filter(([, ids]) => ids.length > 1)
  for (const [id, ids] of dup) console.log(`  (참고) 같은 결함 ${id} 을(를) ${ids.length}번 찾았습니다`)
  return { sessions, graded, bugErrors, validSessions: sessions.filter((s) => s.errors.length === 0) }
}
