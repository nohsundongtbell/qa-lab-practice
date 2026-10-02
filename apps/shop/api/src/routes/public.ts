import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/pool.js'
import { ApiError, notFound, validationError } from '../lib/errors.js'
import { authenticate, newToken } from '../lib/auth.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { evaluateGrade, GRADE_DISCOUNT_RATE } from '../domain/grade.js'
import { estimateDelivery } from '../domain/calendar.js'
import { isRemoteArea } from '../domain/shipping.js'
import { checkEmail, checkName, checkPassword, checkZipcode } from '../domain/validation.js'

type Body = Record<string, unknown>

export function memberView(m: { id: number; email: string; name: string; zipcode: string; address: string; totalSpent: number }) {
  const grade = evaluateGrade(m.totalSpent)
  return { id: m.id, email: m.email, name: m.name, zipcode: m.zipcode, address: m.address, grade, totalSpent: m.totalSpent }
}

export function registerPublicRoutes(app: FastifyInstance, db: Db): void {
  app.get('/health', async () => ({ status: 'ok' }))

  app.post('/api/members', async (req, reply) => {
    const body = (req.body ?? {}) as Body
    const errors: Record<string, string> = {}
    const name = checkName(body.name)
    const email = checkEmail(body.email)
    const password = checkPassword(body.password)
    const zipcode = checkZipcode(body.zipcode)
    if ('error' in name) errors.name = name.error
    if ('error' in email) errors.email = email.error
    if ('error' in password) errors.password = password.error
    if ('error' in zipcode) errors.zipcode = zipcode.error
    if ('error' in name || 'error' in email || 'error' in password || 'error' in zipcode) {
      throw validationError('입력값을 확인해 주세요.', { fields: errors })
    }
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    const dup = await db.query('SELECT 1 FROM members WHERE email = $1', [email.value])
    if (dup.rowCount) throw new ApiError(409, 'EMAIL_TAKEN', '이미 가입된 이메일입니다.')
    const r = await db.query(
      `INSERT INTO members (email, password_hash, name, zipcode, address) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, name, zipcode, address, total_spent`,
      [email.value, hashPassword(password.value), name.value, zipcode.value, address],
    )
    const row = r.rows[0]
    reply.code(201)
    return memberView({ ...row, zipcode: row.zipcode.trim(), totalSpent: row.total_spent })
  })

  app.post('/api/auth/login', async (req) => {
    const body = (req.body ?? {}) as Body
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const r = await db.query('SELECT id, password_hash FROM members WHERE email = $1', [email])
    if (r.rowCount === 0 || !verifyPassword(password, r.rows[0].password_hash)) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    const token = newToken()
    await db.query('INSERT INTO auth_tokens (token, member_id) VALUES ($1,$2)', [token, r.rows[0].id])
    return { token }
  })

  app.get('/api/members/me', async (req) => memberView(await authenticate(db, req)))

  app.get('/api/members/me/coupons', async (req) => {
    const member = await authenticate(db, req)
    const r = await db.query(
      `SELECT c.code, c.type, c.amount, c.rate, c.max_discount, c.min_order_amount, c.valid_from, c.valid_until, mc.used_at
         FROM member_coupons mc JOIN coupons c ON c.id = mc.coupon_id
        WHERE mc.member_id = $1 ORDER BY c.id`,
      [member.id],
    )
    return r.rows.map((c) => ({
      code: c.code, type: c.type, amount: c.amount, rate: c.rate, maxDiscount: c.max_discount,
      minOrderAmount: c.min_order_amount, validFrom: c.valid_from, validUntil: c.valid_until,
      usedAt: c.used_at ? c.used_at.toISOString() : null,
    }))
  })

  app.get('/api/grades/evaluate', async (req) => {
    const q = req.query as Record<string, string | undefined>
    const totalSpent = Number(q.totalSpent)
    if (q.totalSpent === undefined || q.totalSpent.trim() === '' || !Number.isInteger(totalSpent) || totalSpent < 0) {
      throw validationError('totalSpent 는 0 이상의 정수여야 합니다.')
    }
    const grade = evaluateGrade(totalSpent)
    return { totalSpent, grade, discountRate: GRADE_DISCOUNT_RATE[grade] }
  })

  app.get('/api/delivery-estimate', async (req) => {
    const q = req.query as Record<string, string | undefined>
    const zipcode = checkZipcode(q.zipcode)
    if ('error' in zipcode) throw validationError(zipcode.error)
    // 시간대가 명시된 ISO-8601 시각만 받는다 (예: 2026-10-05T13:59:59+09:00)
    if (!q.paidAt || !/(Z|[+-]\d{2}:\d{2})$/.test(q.paidAt) || Number.isNaN(Date.parse(q.paidAt))) {
      throw validationError('paidAt 은 시간대가 포함된 ISO-8601 시각이어야 합니다.')
    }
    const paidAt = new Date(q.paidAt)
    return { paidAt: paidAt.toISOString(), zipcode: zipcode.value, remote: isRemoteArea(zipcode.value), ...estimateDelivery(paidAt, zipcode.value) }
  })

  app.get('/api/products', async () => {
    const r = await db.query('SELECT id, name, price, stock FROM products ORDER BY id')
    return r.rows
  })

  app.get('/api/products/:id', async (req) => {
    const id = Number((req.params as { id: string }).id)
    const r = await db.query('SELECT id, name, price, stock FROM products WHERE id = $1', [Number.isInteger(id) ? id : -1])
    if (r.rowCount === 0) throw notFound('상품')
    return r.rows[0]
  })
}
