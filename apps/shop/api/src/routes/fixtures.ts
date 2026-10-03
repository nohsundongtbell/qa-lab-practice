import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/pool.js'
import { withTransaction } from '../db/pool.js'
import { notFound, validationError } from '../lib/errors.js'
import { now } from '../lib/clock.js'
import { evaluateGrade } from '../domain/grade.js'
import { estimateDelivery } from '../domain/calendar.js'
import { priceOrder, subtotalOf } from '../domain/pricing.js'

const STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const
const CHAIN: Record<(typeof STATUSES)[number], string[]> = {
  PENDING: ['PENDING'],
  PAID: ['PENDING', 'PAID'],
  SHIPPED: ['PENDING', 'PAID', 'SHIPPED'],
  DELIVERED: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'],
  CANCELLED: ['PENDING', 'CANCELLED'],
  REFUNDED: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'REFUNDED'],
}
type Body = Record<string, unknown>
const HOUR = 3_600_000

/**
 * 테스트 데이터 fixture (로컬 실습 전용, ALLOW_DEV_TOOLS=1 일 때만 등록된다).
 * 화면을 여러 번 눌러야 만들 수 있는 상태(예: 배송 완료된 주문)를 한 번의 호출로 만든다.
 * 재고·쿠폰은 건드리지 않는다. 금액은 SPEC §3 계산을 그대로 쓴다(결함 설정과 무관).
 */
export function registerFixtureRoutes(app: FastifyInstance, db: Db): void {
  // POST /__admin/fixtures/orders { email, status, items: [{ productId, qty }], deliveredHoursAgo? } → { id }
  app.post('/__admin/fixtures/orders', async (req, reply) => {
    const body = (req.body ?? {}) as Body
    if (typeof body.email !== 'string') throw validationError('email 이 필요합니다.')
    const status = body.status as (typeof STATUSES)[number]
    if (!STATUSES.includes(status)) throw validationError(`status 는 ${STATUSES.join(' | ')} 중 하나여야 합니다.`)
    if (!Array.isArray(body.items) || body.items.length === 0) throw validationError('items 는 [{ productId, qty }] 1개 이상이어야 합니다.')
    const deliveredHoursAgo = body.deliveredHoursAgo === undefined ? 1 : Number(body.deliveredHoursAgo)
    if (!Number.isFinite(deliveredHoursAgo) || deliveredHoursAgo < 0) throw validationError('deliveredHoursAgo 는 0 이상의 숫자여야 합니다.')

    const id = await withTransaction(db, async (client) => {
      const m = await client.query('SELECT id, zipcode, address, total_spent FROM members WHERE email = $1', [body.email])
      if (m.rowCount === 0) throw notFound('회원')
      const member = m.rows[0]
      const lines: Array<{ productId: number; name: string; unitPrice: number; qty: number }> = []
      for (const raw of body.items as Body[]) {
        const qty = Number(raw?.qty)
        if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw validationError('items[].qty 는 1~99 정수여야 합니다.')
        const p = await client.query('SELECT id, name, price FROM products WHERE id = $1', [Number(raw?.productId)])
        if (p.rowCount === 0) throw notFound('상품')
        lines.push({ productId: p.rows[0].id, name: p.rows[0].name, unitPrice: p.rows[0].price, qty })
      }
      const grade = evaluateGrade(Number(member.total_spent))
      const price = priceOrder({ subtotal: subtotalOf(lines), grade, couponDiscount: 0, zipcode: member.zipcode.trim() })
      const at = now()
      const deliveredAt = new Date(at.getTime() - deliveredHoursAgo * HOUR)
      // 단계 시각: 배송 완료 시각에서 거꾸로 1일·1시간 간격
      const t = {
        created: new Date(deliveredAt.getTime() - 3 * 24 * HOUR),
        paid: new Date(deliveredAt.getTime() - 2 * 24 * HOUR),
        shipped: new Date(deliveredAt.getTime() - 1 * 24 * HOUR),
      }
      const chain = CHAIN[status]
      const paid = chain.includes('PAID')
      const est = paid ? estimateDelivery(t.paid, member.zipcode.trim()) : null
      const o = await client.query(
        `INSERT INTO orders (member_id, status, grade, subtotal, grade_discount, coupon_discount, shipping_fee, total_amount, zipcode, address,
                             created_at, paid_at, ship_date, estimated_delivery, shipped_at, delivered_at, cancelled_at, refunded_at)
         VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
        [member.id, status, grade, price.subtotal, price.gradeDiscount, price.shippingFee, price.total,
          member.zipcode.trim(), member.address, t.created,
          paid ? t.paid : null, est?.shipDate ?? null, est?.deliveryDate ?? null,
          chain.includes('SHIPPED') ? t.shipped : null, chain.includes('DELIVERED') ? deliveredAt : null,
          status === 'CANCELLED' ? at : null, status === 'REFUNDED' ? at : null],
      )
      const orderId = o.rows[0].id as number
      for (const l of lines) {
        await client.query('INSERT INTO order_items (order_id, product_id, product_name, unit_price, qty, line_total) VALUES ($1,$2,$3,$4,$5,$6)',
          [orderId, l.productId, l.name, l.unitPrice, l.qty, l.unitPrice * l.qty])
      }
      let prev: string | null = null
      for (const [i, to] of chain.entries()) {
        const when = new Date(t.created.getTime() + i * HOUR)
        await client.query('INSERT INTO order_status_history (order_id, from_status, to_status, at) VALUES ($1,$2,$3,$4)', [orderId, prev, to, when])
        prev = to
      }
      return orderId
    })
    reply.code(201)
    return { id }
  })
}
