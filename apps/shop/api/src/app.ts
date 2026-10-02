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
import { registerPublicRoutes } from './routes/public.js'
import { registerShopRoutes } from './routes/shop.js'

const openapiPath = new URL('../openapi.yaml', import.meta.url)

export interface AppOptions {
  config: Pick<Config, 'allowDevTools' | 'logFile' | 'logLevel' | 'defectProfile'>
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
  await app.register(swagger, { mode: 'static', specification: { document: loadYaml(specText) as never } })
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
    app.get('/__admin/defects', async () => ({ profile: config.defectProfile, active: [...defects.active].sort() }))
  }

  return app
}
