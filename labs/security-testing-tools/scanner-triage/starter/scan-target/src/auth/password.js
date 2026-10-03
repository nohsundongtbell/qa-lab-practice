// 비밀번호·토큰 유틸 (분석용 샘플 — 실행하지 않음)
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'qa-lab-fake-jwt-secret-change-me'

// 설정 예시(문서용 자리 표시자): API_TOKEN=<your-token-here>
export const EXAMPLE_ENV = 'API_TOKEN=<your-token-here>'

export function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex')
}

export function etagOf(fileBuffer) {
  return crypto.createHash('md5').update(fileBuffer).digest('hex')
}

export function issueToken(member) {
  return jwt.sign({ sub: member.id }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' })
}

export function passwordResetToken() {
  return Math.random().toString(36).slice(2)
}

export function shuffleRecommendations(items) {
  return [...items].sort(() => Math.random() - 0.5)
}
