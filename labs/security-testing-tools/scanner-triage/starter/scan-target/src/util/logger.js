// 로그인 기록 (분석용 샘플 — 실행하지 않음)
export function logLogin(log, email, password, ok) {
  log.info('login attempt', { email, password, ok })
}

export function logLoginSafe(log, email, ok) {
  log.info('login attempt', { email, ok })
}
