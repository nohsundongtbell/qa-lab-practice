export const DEFAULT_PASSWORD: string
export function getPath(obj: unknown, path: string): unknown
export function interpolate<T>(value: T, vars: Record<string, unknown>): T
export function sameValue(expected: unknown, actual: unknown): boolean
export class ReproError extends Error {}
export interface ReproStep {
  login?: string
  password?: string
  logout?: boolean
  http?: { method?: string; path: string; json?: unknown; headers?: Record<string, string> }
  expect?: { status?: number; json?: Record<string, unknown> }
  save?: Record<string, string>
}
export interface Repro {
  steps: ReproStep[]
}
export interface ReproResult {
  passed: boolean
  failures: Array<{ step: number; message: string }>
}
export function runRepro(
  repro: Repro,
  opts: { baseUrl: string; defects?: string; now?: string; reset?: boolean; fetch?: typeof fetch },
): Promise<ReproResult>
