import fs from 'node:fs'
import type { Db } from './pool.js'
import { hashPassword } from '../lib/password.js'
import { addDays, formatDate, toKst } from '../domain/calendar.js'
import { SEED_PASSWORD, seedCoupons, seedMembers, seedProducts } from './seed-data.js'

const schemaSql = fs.readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8')

/** 스키마를 지우고 다시 만든 뒤 시드 데이터를 넣는다. `docker compose down -v` 없이 초기화할 때도 쓴다. */
export async function resetDatabase(db: Db, at: Date = new Date()): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
    await client.query(schemaSql)

    const passwordHash = hashPassword(SEED_PASSWORD)
    const memberIds: number[] = []
    for (const m of seedMembers) {
      const r = await client.query(
        `INSERT INTO members (email, password_hash, name, zipcode, address, role, total_spent)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [m.email, passwordHash, m.name, m.zipcode, m.address, m.role, m.totalSpent],
      )
      if (m.role === 'CUSTOMER') memberIds.push(r.rows[0].id)
    }

    for (const p of seedProducts) {
      await client.query('INSERT INTO products (name, price, stock) VALUES ($1,$2,$3)', [p.name, p.price, p.stock])
    }

    const today = toKst(at).date
    for (const c of seedCoupons) {
      const r = await client.query(
        `INSERT INTO coupons (code, type, amount, rate, max_discount, min_order_amount, valid_from, valid_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [c.code, c.type, c.amount, c.rate, c.maxDiscount, c.minOrderAmount,
          formatDate(addDays(today, c.from)), formatDate(addDays(today, c.until))],
      )
      for (const memberId of memberIds) {
        await client.query('INSERT INTO member_coupons (member_id, coupon_id) VALUES ($1,$2)', [memberId, r.rows[0].id])
      }
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
