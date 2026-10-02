import { isDefectOn } from '../defects/registry.js'
import { isRemoteArea } from './shipping.js'

/** SPEC §6.1 — 이 서비스의 휴일 표 (주말과 겹친 날 제외). */
export const HOLIDAYS: ReadonlySet<string> = new Set([
  // 2026
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-02', '2026-05-05',
  '2026-05-25', '2026-06-03', '2026-08-17', '2026-09-24', '2026-09-25', '2026-09-28',
  '2026-10-05', '2026-10-09', '2026-12-25',
  // 2027
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-01', '2027-05-05', '2027-05-13',
  '2027-08-16', '2027-09-14', '2027-09-15', '2027-09-16', '2027-10-04', '2027-10-11',
  '2027-12-27',
])

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
export const SHIPPING_CUTOFF_HOUR = 14

/** 날짜만 다루는 값 (KST 달력 날짜). 내부적으로 UTC 자정 Date 로 표현한다. */
export type CalendarDate = Date

export function formatDate(d: CalendarDate): string {
  return d.toISOString().slice(0, 10)
}

export function parseDate(s: string): CalendarDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new RangeError(`날짜 형식이 잘못되었습니다: ${s}`)
  const d = new Date(`${s}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || formatDate(d) !== s) throw new RangeError(`존재하지 않는 날짜입니다: ${s}`)
  return d
}

/** 순간(instant)을 KST 달력 날짜와 시(hour)로 바꾼다. */
export function toKst(instant: Date): { date: CalendarDate; hour: number } {
  const shifted = new Date(instant.getTime() + KST_OFFSET_MS)
  const date = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
  return { date, hour: shifted.getUTCHours() }
}

export function addDays(d: CalendarDate, n: number): CalendarDate {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000)
}

export function isBusinessDay(d: CalendarDate): boolean {
  const dow = d.getUTCDay()
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(formatDate(d))
}

export function nextBusinessDay(d: CalendarDate): CalendarDate {
  let cur = addDays(d, 1)
  while (!isBusinessDay(cur)) cur = addDays(cur, 1)
  return cur
}

/** SPEC §6 — 결제 시각과 우편번호로 출고일·도착 예정일을 계산한다. */
export function estimateDelivery(paidAt: Date, zipcode: string): { shipDate: string; deliveryDate: string } {
  const { date, hour: kstHour } = toKst(paidAt)
  const hour = isDefectOn('DF-010') ? paidAt.getUTCHours() : kstHour
  const shipDate = isBusinessDay(date) && hour < SHIPPING_CUTOFF_HOUR ? date : nextBusinessDay(date)
  let delivery = nextBusinessDay(shipDate)
  if (isRemoteArea(zipcode)) delivery = nextBusinessDay(delivery)
  return { shipDate: formatDate(shipDate), deliveryDate: formatDate(delivery) }
}
