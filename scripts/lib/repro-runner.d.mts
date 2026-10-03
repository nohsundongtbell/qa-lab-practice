export const DEFAULT_PASSWORD: string
export const ADMIN_EMAIL: string
export const DEFAULT_CARD: string
export const STEP_KINDS: string[]
export const ACTIONS: Record<string, (args: Record<string, unknown>) => unknown>
export function getPath(obj: unknown, path: string): unknown
export function interpolate<T>(value: T, vars: Record<string, unknown>): T
export function sameValue(expected: unknown, actual: unknown): boolean
export function dateToString(d: Date): string
export function stepKind(step: unknown, stepNo: number): string
export class ReproError extends Error {}
export type ReproStep = Record<string, unknown>
export interface Repro {
  steps: ReproStep[]
}
export interface ReproFailure {
  step: number
  message: string
  kind?: 'status' | 'json' | 'time' | 'login' | 'save'
  label?: string
  path?: string
  expected?: unknown
  actual?: unknown
}
export interface ReproResult {
  passed: boolean
  failures: ReproFailure[]
}
export function formatFailure(f: ReproFailure, opts?: { hideActual?: boolean }): string
export function runRepro(
  repro: Repro,
  opts: { baseUrl: string; defects?: string; now?: string; reset?: boolean; fetch?: typeof fetch },
): Promise<ReproResult>
