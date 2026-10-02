import { isDefectOn } from '../defects/registry.js'

const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' })

/** 사람이 보는 글자 수 (한글 1글자 = 1). */
export function charCount(s: string): number {
  return [...segmenter.segment(s)].length
}

export const NAME_MIN = 2
export const NAME_MAX = 20
const NAME_PATTERN = /^[가-힣a-zA-Z ]+$/u

/** SPEC §1.1 — 이름 규칙. 위반이면 사유 문자열, 통과면 null. */
export function checkName(raw: unknown): { value: string } | { error: string } {
  if (typeof raw !== 'string') return { error: '이름은 문자열이어야 합니다.' }
  const value = raw.trim()
  const length = isDefectOn('DF-005') ? Buffer.byteLength(value, 'utf8') : charCount(value)
  if (length < NAME_MIN || length > NAME_MAX) return { error: `이름은 ${NAME_MIN}자 이상 ${NAME_MAX}자 이하여야 합니다.` }
  if (!NAME_PATTERN.test(value)) return { error: '이름에는 한글, 영문, 공백만 쓸 수 있습니다.' }
  return { value }
}

export function checkEmail(raw: unknown): { value: string } | { error: string } {
  if (typeof raw !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())) {
    return { error: '이메일 형식이 올바르지 않습니다.' }
  }
  return { value: raw.trim().toLowerCase() }
}

export function checkPassword(raw: unknown): { value: string } | { error: string } {
  if (typeof raw !== 'string' || raw.length < 8 || raw.length > 64) {
    return { error: '비밀번호는 8자 이상 64자 이하여야 합니다.' }
  }
  return { value: raw }
}

export function checkZipcode(raw: unknown): { value: string } | { error: string } {
  if (typeof raw !== 'string' || !/^\d{5}$/.test(raw)) return { error: '우편번호는 숫자 5자리여야 합니다.' }
  return { value: raw }
}

export const QTY_MAX = 99

/** SPEC §2 — 장바구니 수량 1~99. */
export function checkQuantity(raw: unknown): { value: number } | { error: string } {
  const min = isDefectOn('DF-004') ? 0 : 1
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min || raw > QTY_MAX) {
    return { error: `수량은 1개 이상 ${QTY_MAX}개 이하여야 합니다.` }
  }
  return { value: raw }
}
