import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import pino from 'pino'
import { load as loadYaml } from 'js-yaml'
import type { Config } from './config.js'
import { requestContext } from './context.js'
import type { Db } from './db/pool.js'
import { resetDatabase } from './db/reset.js'
import { type DefectSettings, parseDefectHeader, setDefaultActiveDefects } from './defects/registry.js'
import { ApiError } from './lib/errors.js'
import { createRandom, delayFor, type LatencyProfile, parseLatencyProfile, parseUiVariant, type UiVariant } from './lib/environment.js'
import { registerFixtureRoutes } from './routes/fixtures.js'
import { registerPublicRoutes } from './routes/public.js'
import { registerShopRoutes } from './routes/shop.js'

const openapiPath = new URL('../openapi.yaml', import.meta.url)

export interface AppOptions {
  config: Pick<Config, 'allowDevTools' | 'logFile' | 'logLevel' | 'defectProfile'> & Partial<Pick<Config, 'uiVariant' | 'latencyProfile' | 'latencySeed'>>
  db: Db
  defects: DefectSettings
  /** 테스트에서 로그를 끌 때 false */
  logger?: boolean
}

function createLogger(opts: AppOptions['config']) {
  const streams: pino.StreamEntry[] = [{ stream: process.stdout }]
  if (opts.logFile) streams.push({ stream: pino.destination({ dest: opts.logFile, mkdir: true, sync: false }) })
  return pino({ level: opts.logLevel, base: { service: 'shop-api' } }, pino.multistream(streams))
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const { config, db, defects } = opts
  setDefaultActiveDefects(defects.active)

  const app = Fastify({
    ...(opts.logger === false ? { logger: false } : { loggerInstance: createLogger(config) as FastifyBaseLogger }),
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  })

  // 요청마다 결함 집합·현재 시각 문맥을 만든다. 덮어쓰기 헤더는 로컬 실습 모드에서만 받는다.
  app.addHook('onRequest', async (req) => {
    let reqDefects = defects.active as ReadonlySet<string>
    let reqNow: Date | undefined
    if (config.allowDevTools) {
      const header = req.headers['x-qa-lab-defects']
      try {
        reqDefects = parseDefectHeader(Array.isArray(header) ? header.join(',') : header, defects.known) ?? reqDefects
      } catch (err) {
        throw new ApiError(400, 'INVALID_DEV_HEADER', (err as Error).message)
      }
      const nowHeader = req.headers['x-qa-lab-now']
      if (typeof nowHeader === 'string') {
        if (!/(Z|[+-]\d{2}:\d{2})$/.test(nowHeader) || Number.isNaN(Date.parse(nowHeader))) {
          throw new ApiError(400, 'INVALID_DEV_HEADER', 'X-QA-Lab-Now 는 시간대가 포함된 ISO-8601 시각이어야 합니다.')
        }
        reqNow = new Date(nowHeader)
      }
    }
    requestContext.enterWith({ defects: reqDefects, now: reqNow })
  })

  // 환경 조건: UI 변형·응답 지연. 기본값은 환경 변수, 로컬 실습 모드에서는 헤더로 요청마다 덮어쓴다.
  const defaultVariant = parseUiVariant(config.uiVariant) ?? 'v1'
  const defaultLatency = parseLatencyProfile(config.latencyProfile) ?? 'none'
  const random = createRandom(config.latencySeed ?? 1)
  const environmentOf = (headers: Record<string, string | string[] | undefined>): { uiVariant: UiVariant; latencyProfile: LatencyProfile } => {
    const pick = (name: string) => {
      const v = headers[name]
      return Array.isArray(v) ? v[0] : v
    }
    try {
      return {
        uiVariant: (config.allowDevTools ? parseUiVariant(pick('x-qa-lab-ui-variant')) : undefined) ?? defaultVariant,
        latencyProfile: (config.allowDevTools ? parseLatencyProfile(pick('x-qa-lab-latency')) : undefined) ?? defaultLatency,
      }
    } catch (err) {
      throw new ApiError(400, 'INVALID_DEV_HEADER', (err as Error).message)
    }
  }
  app.addHook('preHandler', async (req) => {
    if (!req.url.startsWith('/api/')) return
    const { latencyProfile } = environmentOf(req.headers)
    const ms = delayFor(latencyProfile, random)
    if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  })
  // 웹이 시작할 때 읽는다 (nginx 가 이 경로만 API 로 전달한다). 개발용 기능이 꺼져 있으면 환경 변수 기본값만 돌려준다.
  app.get('/__qa/environment', async (req) => environmentOf(req.headers))

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id)
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      return reply.code(err.status).send({ code: err.code, message: err.message, details: err.details })
    }
    const e = err as { statusCode?: number; message?: string }
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: '요청 형식이 올바르지 않습니다.', details: { reason: e.message } })
    }
    req.log.error({ err }, '처리되지 않은 오류')
    return reply.code(500).send({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: {} })
  })

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ code: 'NOT_FOUND', message: '요청한 경로를 찾을 수 없습니다.', details: {} })
  })

  const specText = fs.readFileSync(openapiPath, 'utf8')
  // Swagger UI 는 문서를 연 주소로 요청한다(servers: '/'). 127.0.0.1 이 아닌 주소(예: Codespaces 포트 전달)로 열어도 "Try it out" 이 동작하게.
  // 원본 명세(/openapi.yaml, 파일)의 servers 는 그대로 둔다 — 컬렉션 변환(openapi2postmanv2)이 baseUrl 로 쓴다.
  const uiDocument = { ...(loadYaml(specText) as Record<string, unknown>), servers: [{ url: '/' }] }
  await app.register(swagger, { mode: 'static', specification: { document: uiDocument as never } })
  await app.register(swaggerUi, { routePrefix: '/docs' })
  app.get('/openapi.yaml', async (_req, reply) => reply.type('application/yaml; charset=utf-8').send(specText))

  registerPublicRoutes(app, db)
  registerShopRoutes(app, db)

  if (config.allowDevTools) {
    // 로컬 실습 전용. 운영 환경이라면 절대 열면 안 되는 경로다.
    app.post('/__admin/reset', async () => {
      await resetDatabase(db)
      return { status: 'reset' }
    })
    registerFixtureRoutes(app, db)
    app.get('/__admin/defects', async () => ({ profile: config.defectProfile, active: [...defects.active].sort() }))
  }

  return app
}
