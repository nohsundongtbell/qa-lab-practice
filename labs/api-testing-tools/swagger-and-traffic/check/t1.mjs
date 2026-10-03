import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { SheetError, formatSheet, gradeSheet, readSheet } from '../../../../scripts/lib/answer-sheet.mjs'
import { SPEC, expectedAnswers } from './scenario.mjs'

const ctx = loadLabContext()
try {
  const data = readSheet(path.join(ctx.workDir, 't1-scenario.yaml'), 't1-scenario.yaml')
  const graded = gradeSheet(data, SPEC, await expectedAnswers(ctx.baseUrl))
  for (const line of formatSheet(graded)) console.log(line)
  const min = ctx.pass.min_correct ?? SPEC.length
  finish({
    passed: graded.correct >= min,
    message: `${SPEC.length}문제 중 ${graded.correct}개 정답 (기준 ${min}개 이상)`,
    hints: [
      'Swagger UI 오른쪽 위 Authorize 에 로그인 응답의 토큰만 붙여 넣으세요(앞에 Bearer 는 쓰지 않습니다). 사용자를 바꿀 때는 Authorize 를 다시 하세요.',
      '"틀린 답"의 정답은 알려 주지 않습니다. 응답 본문을 다시 읽고, 결함 없는 앱(--profile none)에서 확인했는지 보세요.',
      '오류 응답의 code 는 상태 코드(숫자)가 아니라 본문의 code 필드입니다.',
    ],
  })
} catch (err) {
  if (!(err instanceof SheetError)) throw err
  finish({ passed: false, message: err.message, hints: ['work/t1-scenario.yaml 의 q1~q6 에 답을 적으세요.'] })
}
