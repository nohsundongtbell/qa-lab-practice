import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { buildLogs, TARGET_ORDER_ID } from '../setup/logs.mjs'
import { analyzeAccess, analyzeEvidence } from './log-analysis.mjs'

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim())
const sameText = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase()
const sameNumber = (a, b) => clean(a) !== '' && Number(a) === Number(b)

/** 답안 YAML 의 각 항목을 정답과 비교한다. 정답 값은 결과에 담지 않는다. */
export function compareAnswers(answer, fields) {
  return fields.map(({ key, label, expected, kind }) => {
    const got = answer?.[key]
    const blank = clean(got) === ''
    const ok = !blank && (kind === 'number' ? sameNumber(got, expected) : sameText(got, expected))
    return { key, label, ok, blank }
  })
}

export function t3Fields(logs = buildLogs()) {
  const a = analyzeAccess(logs.access)
  return [
    { key: 'total_requests', label: '전체 요청 수', expected: a.total_requests, kind: 'number' },
    { key: 'count_5xx', label: '5xx 응답 수', expected: a.count_5xx, kind: 'number' },
    { key: 'most_5xx_endpoint', label: '5xx 가 가장 많은 엔드포인트', expected: a.most_5xx_endpoint },
    { key: 'first_5xx_at', label: '첫 5xx 시각', expected: a.first_5xx_at },
    { key: 'last_5xx_at', label: '마지막 5xx 시각', expected: a.last_5xx_at },
  ]
}

export function t4Fields(logs = buildLogs()) {
  const e = analyzeEvidence(logs.app, TARGET_ORDER_ID)
  return [
    { key: 'request_id', label: '실패한 결제 요청의 request id', expected: e.request_id },
    { key: 'gateway_tx_id', label: '게이트웨이 거래 ID', expected: e.gateway_tx_id },
    { key: 'attempts', label: '게이트웨이 호출 시도 횟수', expected: e.attempts, kind: 'number' },
    { key: 'error_code', label: '오류 코드', expected: e.error_code },
  ]
}

const FILES = { t3: 't3-logs.yaml', t4: 't4-evidence.yaml' }
const HINTS = {
  t3: ['access.log 한 줄이 요청 한 건입니다. 상태 코드는 `"POST … HTTP/1.1"` 바로 뒤의 숫자입니다.', '엔드포인트를 셀 때는 경로의 숫자(주문 번호 등)를 `:id` 로 바꿔 같은 것끼리 묶으세요.', '"첫 5xx"와 "장애가 시작된 때"는 같지 않을 수 있습니다. 5xx 를 모두 살펴보세요.'],
  t4: ['access.log 의 `rid=` 값과 app.log 의 `reqId` 는 같은 요청을 가리킵니다 (상관 ID).', '같은 주문에 결제 요청이 두 번 있을 수 있습니다. 실패한(5xx) 쪽을 고르세요.', '게이트웨이 거래 ID 는 app.log 의 `payment failed` 줄에 있습니다.'],
}

export async function gradeLogTask() {
  const ctx = loadLabContext()
  const file = path.join(ctx.workDir, FILES[ctx.taskId])
  if (!fs.existsSync(file)) return finish({ passed: false, message: `work/${FILES[ctx.taskId]} 이 없습니다`, hints: ['starter 의 파일을 채워서 work/ 에 두세요.'] })
  let answer
  try {
    answer = loadYaml(fs.readFileSync(file, 'utf8')) ?? {}
  } catch (e) {
    return finish({ passed: false, message: `${FILES[ctx.taskId]} 문법 오류`, details: [e.message.split('\n')[0]], hints: ['YAML 의 "키: 값" 형식과 들여쓰기를 확인하세요. 시각처럼 콜론이 들어간 값은 "14:11:03" 처럼 따옴표로 감싸세요.'] })
  }
  const fields = ctx.taskId === 't3' ? t3Fields() : t4Fields()
  const results = compareAnswers(answer, fields)
  for (const r of results) console.log(`  ${r.ok ? '[맞음]' : r.blank ? '[빈칸]' : '[다름]'} ${r.label}`)
  const wrong = results.filter((r) => !r.ok)
  finish({
    passed: wrong.length === 0,
    message: `항목 ${results.length - wrong.length}/${results.length}개 일치`,
    details: wrong.map((r) => `${r.label}: ${r.blank ? '값이 비어 있습니다' : '다시 확인하세요'}`),
    hints: HINTS[ctx.taskId],
  })
}
