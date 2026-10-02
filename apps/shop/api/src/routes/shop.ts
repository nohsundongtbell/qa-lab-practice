import type { FastifyInstance } from 'fastify'
import type pg from 'pg'
import type { Db } from '../db/pool.js'
import { withTransaction } from '../db/pool.js'
import { ApiError, notFound, validationError } from '../lib/errors.js'
import { type AuthMember, authenticate, requireAdmin } from '../lib/auth.js'
import { now } from '../lib/clock.js'
import { isDefectOn } from '../defects/registry.js'
import { evaluateGrade, gradeDiscount } from '../domain/grade.js'
import { applyCoupon, type Coupon } from '../domain/coupon.js'
import { priceOrder, subtotalOf } from '../domain/pricing.js'
import { estimateDelivery } from '../domain/calendar.js'
import { nextStatus, type OrderAction, type OrderStatus, withinRefundWindow } from '../domain/order-state.js'
import { checkQuantity, checkZipcode } from '../domain/validation.js'

type Body = Record<string, unknown>
type Queryable = Db | pg.PoolClient

const DECLINED_CARD = '4000000000000002'

function parseId(raw: string): number {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : -1
}

/** 회원이 가진 쿠폰을 코드로 찾는다. 없으면 COUPON_NOT_APPLICABLE. */
async function findOwnedCoupon(q: Queryable, memberId: number, code: string) {
  const c = await q.query('SELECT * FROM coupons WHERE code = $1', [code])
  if (c.rowCount === 0) throw couponError('NOT_FOUND')
  const mc = await q.query('SELECT id, used_at FROM member_coupons WHERE member_id = $1 AND coupon_id = $2 FOR UPDATE', [memberId, c.rows[0].id])
  if (mc.rowCount === 0) throw couponError('NOT_OWNED')
  const row = c.rows[0]
  const coupon: Coupon = {
    code: row.code, type: row.type, amount: row.amount, rate: row.rate, maxDiscount: row.max_discount,
    minOrderAmount: row.min_order_amount, validFrom: row.valid_from, validUntil: row.valid_until,
  }
  return { memberCouponId: mc.rows[0].id as number, owned: { coupon, usedAt: mc.rows[0].used_at as Date | null } }
}

function couponError(reason: string) {
  return new ApiError(422, 'COUPON_NOT_APPLICABLE', '쿠폰을 사용할 수 없습니다.', { reason })
}

/** 상품 목록과 회원 정보로 금액을 계산한다 (SPEC §3). */
async function computePrice(
  q: Queryable,
  member: AuthMember,
  lines: Array<{ unitPrice: number; qty: number }>,
  couponCode: string | undefined,
  zipcode: string,
) {
  const grade = evaluateGrade(member.totalSpent)
  const subtotal = subtotalOf(lines)
  let couponDiscount = 0
  let memberCouponId: number | null = null
  if (couponCode) {
    const found = await findOwnedCoupon(q, member.id, couponCode)
    const result = applyCoupon(found.owned, { subtotal, gradeDiscount: gradeDiscount(subtotal, grade) }, now())
    if (!result.ok) throw couponError(result.reason)
    couponDiscount = result.discount
    memberCouponId = found.memberCouponId
  }
  return { grade, memberCouponId, breakdown: priceOrder({ subtotal, grade, couponDiscount, zipcode }) }
}

async function loadOrder(q: Queryable, id: number) {
  const o = await q.query(
    `SELECT o.*, c.code AS coupon_code FROM orders o
       LEFT JOIN member_coupons mc ON mc.id = o.member_coupon_id
       LEFT JOIN coupons c ON c.id = mc.coupon_id
      WHERE o.id = $1`,
    [id],
  )
  if (o.rowCount === 0) return null
  const items = await q.query('SELECT product_id, product_name, unit_price, qty, line_total FROM order_items WHERE order_id = $1 ORDER BY id', [id])
  const r = o.rows[0]
  const iso = (d: Date | null) => (d ? d.toISOString() : null)
  return {
    memberId: r.member_id as number,
    view: {
      id: r.id, status: r.status as OrderStatus, grade: r.grade,
      items: items.rows.map((i) => ({ productId: i.product_id, productName: i.product_name, unitPrice: i.unit_price, qty: i.qty, lineTotal: i.line_total })),
      subtotal: r.subtotal, gradeDiscount: r.grade_discount, couponDiscount: r.coupon_discount, couponCode: r.coupon_code ?? null,
      shippingFee: r.shipping_fee, total: r.total_amount, zipcode: r.zipcode.trim(), address: r.address,
      createdAt: iso(r.created_at), paidAt: iso(r.paid_at), shipDate: r.ship_date, estimatedDelivery: r.estimated_delivery,
      shippedAt: iso(r.shipped_at), deliveredAt: iso(r.delivered_at), cancelledAt: iso(r.cancelled_at), refundedAt: iso(r.refunded_at),
    },
  }
}

async function loadOwnOrder(q: Queryable, member: AuthMember, rawId: string) {
  const order = await loadOrder(q, parseId(rawId))
  if (!order || (order.memberId !== member.id && member.role !== 'ADMIN')) throw notFound('주문')
  return order
}

/** 상태 전이를 검사하고 기록한다. 허용되지 않으면 409. */
async function transition(client: pg.PoolClient, orderId: number, current: OrderStatus, action: OrderAction, extra: string, values: unknown[]) {
  const to = nextStatus(current, action)
  if (!to) {
    throw new ApiError(409, 'INVALID_STATE_TRANSITION', `현재 상태(${current})에서는 이 동작을 할 수 없습니다.`, { from: current, action })
  }
  await client.query(`UPDATE orders SET status = $2${extra ? ', ' + extra : ''} WHERE id = $1`, [orderId, to, ...values])
  await client.query('INSERT INTO order_status_history (order_id, from_status, to_status, at) VALUES ($1,$2,$3,$4)', [orderId, current, to, now()])
  return to
}

async function restock(client: pg.PoolClient, orderId: number) {
  await client.query(
    `UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.order_id = $1 AND i.product_id = p.id`,
    [orderId],
  )
}

export function registerShopRoutes(app: FastifyInstance, db: Db): void {
  // ---- 장바구니 ----
  app.get('/api/cart', async (req) => {
    const member = await authenticate(db, req)
    const r = await db.query(
      `SELECT p.id AS product_id, p.name, p.price, c.qty FROM cart_items c JOIN products p ON p.id = c.product_id
        WHERE c.member_id = $1 ORDER BY p.id`,
      [member.id],
    )
    const items = r.rows.map((i) => ({ productId: i.product_id, name: i.name, unitPrice: i.price, qty: i.qty, lineTotal: i.price * i.qty }))
    return { items, subtotal: subtotalOf(items) }
  })

  app.put('/api/cart/items/:productId', async (req) => {
    const member = await authenticate(db, req)
    const productId = parseId((req.params as { productId: string }).productId)
    const qty = checkQuantity(((req.body ?? {}) as Body).qty)
    if ('error' in qty) throw validationError(qty.error)
    const p = await db.query('SELECT id, stock FROM products WHERE id = $1', [productId])
    if (p.rowCount === 0) throw notFound('상품')
    if (qty.value > p.rows[0].stock) throw new ApiError(409, 'OUT_OF_STOCK', '재고가 부족합니다.', { stock: p.rows[0].stock })
    await db.query(
      `INSERT INTO cart_items (member_id, product_id, qty) VALUES ($1,$2,$3)
       ON CONFLICT (member_id, product_id) DO UPDATE SET qty = EXCLUDED.qty`,
      [member.id, productId, qty.value],
    )
    return { productId, qty: qty.value }
  })

  app.delete('/api/cart/items/:productId', async (req, reply) => {
    const member = await authenticate(db, req)
    await db.query('DELETE FROM cart_items WHERE member_id = $1 AND product_id = $2', [member.id, parseId((req.params as { productId: string }).productId)])
    reply.code(204)
  })

  // ---- 금액 미리보기 ----
  app.post('/api/quote', async (req) => {
    const member = await authenticate(db, req)
    const body = (req.body ?? {}) as Body
    if (!Array.isArray(body.items) || body.items.length === 0) throw validationError('items 는 1개 이상이어야 합니다.')
    const zipcode = body.zipcode === undefined ? { value: member.zipcode } : checkZipcode(body.zipcode)
    if ('error' in zipcode) throw validationError(zipcode.error)
    const lines = []
    for (const raw of body.items as Body[]) {
      const qty = checkQuantity(raw?.qty)
      if ('error' in qty) throw validationError(qty.error)
      const p = await db.query('SELECT id, name, price FROM products WHERE id = $1', [parseId(String(raw?.productId))])
      if (p.rowCount === 0) throw notFound('상품')
      lines.push({ productId: p.rows[0].id, name: p.rows[0].name, unitPrice: p.rows[0].price, qty: qty.value, lineTotal: p.rows[0].price * qty.value })
    }
    const couponCode = typeof body.couponCode === 'string' && body.couponCode ? body.couponCode : undefined
    const { grade, breakdown } = await computePrice(db, member, lines, couponCode, zipcode.value)
    return { items: lines, grade, couponCode: couponCode ?? null, zipcode: zipcode.value, ...breakdown }
  })

  // ---- 주문 ----
  app.post('/api/orders', async (req, reply) => {
    const member = await authenticate(db, req)
    const body = (req.body ?? {}) as Body
    const zipcode = body.zipcode === undefined ? { value: member.zipcode } : checkZipcode(body.zipcode)
    if ('error' in zipcode) throw validationError(zipcode.error)
    const address = typeof body.address === 'string' && body.address.trim() ? body.address.trim() : member.address
    const couponCode = typeof body.couponCode === 'string' && body.couponCode ? body.couponCode : undefined

    const orderId = await withTransaction(db, async (client) => {
      const cart = await client.query(
        `SELECT p.id, p.name, p.price, p.stock, c.qty FROM cart_items c JOIN products p ON p.id = c.product_id
          WHERE c.member_id = $1 ORDER BY p.id FOR UPDATE OF p`,
        [member.id],
      )
      if (cart.rowCount === 0) throw new ApiError(400, 'CART_EMPTY', '장바구니가 비어 있습니다.')
      for (const line of cart.rows) {
        if (line.qty > line.stock) throw new ApiError(409, 'OUT_OF_STOCK', `재고가 부족합니다: ${line.name}`, { productId: line.id, stock: line.stock })
      }
      const lines = cart.rows.map((l) => ({ unitPrice: l.price as number, qty: l.qty as number }))
      const { grade, memberCouponId, breakdown } = await computePrice(client, member, lines, couponCode, zipcode.value)
      const storedTotal = isDefectOn('DF-012') ? breakdown.total + breakdown.couponDiscount : breakdown.total
      const at = now()
      const o = await client.query(
        `INSERT INTO orders (member_id, status, grade, subtotal, grade_discount, coupon_discount, member_coupon_id,
                             shipping_fee, total_amount, zipcode, address, created_at)
         VALUES ($1,'PENDING',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [member.id, grade, breakdown.subtotal, breakdown.gradeDiscount, breakdown.couponDiscount, memberCouponId,
          breakdown.shippingFee, storedTotal, zipcode.value, address, at],
      )
      const id = o.rows[0].id as number
      for (const l of cart.rows) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, product_name, unit_price, qty, line_total) VALUES ($1,$2,$3,$4,$5,$6)',
          [id, l.id, l.name, l.price, l.qty, l.price * l.qty],
        )
        await client.query('UPDATE products SET stock = stock - $2 WHERE id = $1', [l.id, l.qty])
      }
      if (memberCouponId) {
        await client.query('UPDATE member_coupons SET used_at = $2, used_order_id = $3 WHERE id = $1', [memberCouponId, at, id])
      }
      await client.query('DELETE FROM cart_items WHERE member_id = $1', [member.id])
      await client.query('INSERT INTO order_status_history (order_id, from_status, to_status, at) VALUES ($1,NULL,$2,$3)', [id, 'PENDING', at])
      return id
    })
    reply.code(201)
    return (await loadOrder(db, orderId))!.view
  })

  app.get('/api/orders', async (req) => {
    const member = await authenticate(db, req)
    const r = await db.query('SELECT id FROM orders WHERE member_id = $1 ORDER BY id DESC', [member.id])
    const out = []
    for (const row of r.rows) out.push((await loadOrder(db, row.id))!.view)
    return out
  })

  app.get('/api/orders/:id', async (req) => {
    const member = await authenticate(db, req)
    return (await loadOwnOrder(db, member, (req.params as { id: string }).id)).view
  })

  app.post('/api/orders/:id/pay', async (req) => {
    const member = await authenticate(db, req)
    const order = await loadOwnOrder(db, member, (req.params as { id: string }).id)
    const raw = ((req.body ?? {}) as Body).cardNumber
    const card = typeof raw === 'string' ? raw.replace(/-/g, '') : ''
    if (!/^\d{16}$/.test(card)) throw validationError('카드 번호는 숫자 16자리여야 합니다.')
    await withTransaction(db, async (client) => {
      if (nextStatus(order.view.status, 'pay') && card === DECLINED_CARD) {
        throw new ApiError(402, 'PAYMENT_DECLINED', '카드 승인이 거절되었습니다.')
      }
      const at = now()
      const { shipDate, deliveryDate } = estimateDelivery(at, order.view.zipcode)
      await transition(client, order.view.id, order.view.status, 'pay', 'paid_at = $3, ship_date = $4, estimated_delivery = $5', [at, shipDate, deliveryDate])
    })
    return (await loadOrder(db, order.view.id))!.view
  })

  app.post('/api/orders/:id/cancel', async (req) => {
    const member = await authenticate(db, req)
    const order = await loadOwnOrder(db, member, (req.params as { id: string }).id)
    await withTransaction(db, async (client) => {
      await transition(client, order.view.id, order.view.status, 'cancel', 'cancelled_at = $3', [now()])
      if (!isDefectOn('DF-008')) await restock(client, order.view.id)
      await client.query(
        `UPDATE member_coupons SET used_at = NULL, used_order_id = NULL
          WHERE id = (SELECT member_coupon_id FROM orders WHERE id = $1)`,
        [order.view.id],
      )
    })
    return (await loadOrder(db, order.view.id))!.view
  })

  app.post('/api/orders/:id/refund', async (req) => {
    const member = await authenticate(db, req)
    const order = await loadOwnOrder(db, member, (req.params as { id: string }).id)
    const at = now()
    if (order.view.status === 'DELIVERED' && order.view.deliveredAt && !withinRefundWindow(new Date(order.view.deliveredAt), at)) {
      throw new ApiError(409, 'REFUND_PERIOD_EXPIRED', '배송 완료 후 7일이 지나 환불할 수 없습니다.')
    }
    await withTransaction(db, async (client) => {
      await transition(client, order.view.id, order.view.status, 'refund', 'refunded_at = $3', [at])
      await restock(client, order.view.id)
      await client.query('UPDATE members SET total_spent = GREATEST(total_spent - $2, 0) WHERE id = $1', [order.memberId, order.view.total])
    })
    return (await loadOrder(db, order.view.id))!.view
  })

  // ---- 관리자 ----
  app.post('/api/admin/orders/:id/ship', async (req) => {
    const admin = await requireAdmin(db, req)
    const order = await loadOwnOrder(db, admin, (req.params as { id: string }).id)
    await withTransaction(db, (client) => transition(client, order.view.id, order.view.status, 'ship', 'shipped_at = $3', [now()]))
    return (await loadOrder(db, order.view.id))!.view
  })

  app.post('/api/admin/orders/:id/deliver', async (req) => {
    const admin = await requireAdmin(db, req)
    const order = await loadOwnOrder(db, admin, (req.params as { id: string }).id)
    await withTransaction(db, async (client) => {
      await transition(client, order.view.id, order.view.status, 'deliver', 'delivered_at = $3', [now()])
      await client.query('UPDATE members SET total_spent = total_spent + $2 WHERE id = $1', [order.memberId, order.view.total])
    })
    return (await loadOrder(db, order.view.id))!.view
  })
}
