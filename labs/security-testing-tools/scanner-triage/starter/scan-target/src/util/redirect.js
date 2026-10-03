// 로그인 후 이동 (분석용 샘플 — 실행하지 않음)
const ALLOWED_NEXT = ['/', '/orders', '/cart']

export function afterLogin(req, res) {
  res.redirect(req.query.next)
}

export function afterLoginSafe(req, res) {
  const next = req.query.next
  res.redirect(ALLOWED_NEXT.includes(next) ? next : '/')
}
