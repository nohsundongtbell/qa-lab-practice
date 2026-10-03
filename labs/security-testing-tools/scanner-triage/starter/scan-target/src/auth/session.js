// 세션·토큰 검증 (분석용 샘플 — 실행하지 않음)
import jwt from 'jsonwebtoken'

export function setSessionCookie(res, sessionId) {
  res.cookie('sid', sessionId, { httpOnly: false, sameSite: 'lax' })
}

export function verifyLegacy(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256', 'none'] })
}

export function verify(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] })
}
