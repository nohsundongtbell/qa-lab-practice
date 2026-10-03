import path from 'node:path'
import { spawnSync } from 'node:child_process'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readerUrlFrom } from '../setup/db.mjs'

/**
 * 읽기 전용 계정의 안전 장치 검증 (대상 앱의 DB 가 떠 있을 때만 실행).
 * 세션 설정(default_transaction_read_only)은 학습자가 SET 으로 끌 수 있으므로, 진짜 방어선은 "권한"이다.
 */
const ADMIN_URL = process.env.QA_LAB_DB_URL ?? 'postgres://shop:shop@127.0.0.1:55432/shop'
const labDir = path.resolve(import.meta.dirname, '..')

async function reachable() {
  const c = new pg.Client({ connectionString: ADMIN_URL })
  try {
    await c.connect()
    await c.end()
    return true
  } catch {
    return false
  }
}
const up = await reachable()

describe.skipIf(!up)('읽기 전용 계정 (DB 필요)', () => {
  let reader
  beforeAll(async () => {
    const r = spawnSync(process.execPath, [path.join(labDir, 'setup', 'seed.mjs')], { env: { ...process.env, QA_LAB_DB_URL: ADMIN_URL }, encoding: 'utf8' })
    expect(r.status, r.stdout + r.stderr).toBe(0)
    reader = new pg.Client({ connectionString: readerUrlFrom(ADMIN_URL) })
    await reader.connect()
  })
  afterAll(async () => reader?.end())

  it('랩 스키마는 읽을 수 있고, 기본 search_path 가 랩 스키마다', async () => {
    const r = await reader.query('SELECT count(*)::int AS n FROM orders')
    expect(r.rows[0].n).toBe(125)
  })

  it('데이터를 바꾸는 문장은 권한이 없어 실패한다 — 세션의 읽기 전용 설정을 꺼도 마찬가지', async () => {
    await reader.query('SET default_transaction_read_only = off')
    for (const sql of ['DELETE FROM orders', "UPDATE orders SET status = 'X'", 'DROP TABLE orders', 'TRUNCATE orders', "INSERT INTO members (id,email,name,grade,created_at) VALUES (999,'a','b','c',now())"]) {
      await expect(reader.query(sql), sql).rejects.toThrow(/permission denied|must be owner/)
    }
  })

  it('대상 앱의 실제 데이터(public 스키마)는 읽을 수 없다', async () => {
    await expect(reader.query('SELECT * FROM public.members')).rejects.toThrow(/permission denied/)
  })

  it('역할 생성·슈퍼유저 권한이 없다', async () => {
    await expect(reader.query('CREATE ROLE evil LOGIN')).rejects.toThrow(/permission denied/)
    const r = await reader.query('SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user')
    expect(r.rows[0]).toEqual({ rolsuper: false, rolcreatedb: false, rolcreaterole: false })
  })

  it('실행 시간이 제한된다 (statement_timeout)', async () => {
    const r = await reader.query('SHOW statement_timeout')
    expect(r.rows[0].statement_timeout).toBe('5s')
  })

  it('setup 은 멱등이다: 다시 실행해도 데이터가 그대로다', async () => {
    const again = spawnSync(process.execPath, [path.join(labDir, 'setup', 'seed.mjs')], { env: { ...process.env, QA_LAB_DB_URL: ADMIN_URL }, encoding: 'utf8' })
    expect(again.status).toBe(0)
    expect(again.stdout).toMatch(/건너뜀/)
    expect((await reader.query('SELECT count(*)::int AS n FROM orders')).rows[0].n).toBe(125)
  })
})
