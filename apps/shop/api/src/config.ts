import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

function flag(name: string, fallback = false): boolean {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

function list(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export interface Config {
  port: number
  host: string
  databaseUrl: string
  defectsDir: string
  defectProfile: string
  defectsOn: string[]
  defectsOff: string[]
  /** 로컬 실습 전용 기능(X-QA-Lab-Defects, X-QA-Lab-Now, /__admin/*) 허용 여부 */
  allowDevTools: boolean
  logFile: string | undefined
  logLevel: string
  /** 환경 조건 (결함 아님). 기본값이며 개발용 헤더로 요청마다 덮어쓸 수 있다 */
  uiVariant: string
  latencyProfile: string
  latencySeed: number
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3000),
    // 컨테이너 안에서는 0.0.0.0 으로 듣고, 호스트 노출은 compose 가 127.0.0.1 로만 바인딩한다.
    host: process.env.HOST ?? '127.0.0.1',
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://shop:shop@127.0.0.1:55432/shop',
    defectsDir: process.env.DEFECTS_DIR ?? path.resolve(here, '../../../../defects'),
    defectProfile: process.env.DEFECT_PROFILE || 'none',
    defectsOn: list('DEFECTS_ON'),
    defectsOff: list('DEFECTS_OFF'),
    allowDevTools: flag('ALLOW_DEV_TOOLS'),
    logFile: process.env.LOG_FILE || undefined,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    uiVariant: process.env.UI_VARIANT || 'v1',
    latencyProfile: process.env.LATENCY_PROFILE || 'none',
    latencySeed: Number(process.env.LATENCY_SEED ?? 1),
  }
}
