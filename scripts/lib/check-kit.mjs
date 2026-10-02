/**
 * check 스크립트(.mjs)가 공통으로 쓰는 작은 도구.
 * 규약: 종료 코드 0 = 통과, 1 = 실패. 결과와 힌트는 한국어로 stdout 에 출력한다.
 */

export function checkEnv(env = process.env) {
  return {
    baseUrl: env.QA_LAB_BASE_URL ?? 'http://127.0.0.1:3000',
    workDir: env.QA_LAB_WORK_DIR ?? '',
    labDir: env.QA_LAB_LAB_DIR ?? '',
    repoRoot: env.QA_LAB_REPO_ROOT ?? '',
    taskId: env.QA_LAB_TASK_ID ?? '',
    target: env.QA_LAB_TARGET ?? 'work',
  }
}

/** 결과 출력 문자열을 만든다 (테스트하기 쉽게 출력과 분리). */
export function formatResult({ passed, message, hints = [], details = [] }) {
  const lines = [`${passed ? '[통과]' : '[실패]'} ${message}`]
  for (const d of details) lines.push(`  - ${d}`)
  if (!passed) for (const h of hints) lines.push(`  힌트: ${h}`)
  return lines.join('\n')
}

export function finish(result, { out = console.log, exit = (code) => { process.exitCode = code } } = {}) {
  out(formatResult(result))
  exit(result.passed ? 0 : 1)
  return result.passed
}
