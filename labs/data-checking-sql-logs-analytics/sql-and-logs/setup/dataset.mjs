/**
 * 랩 데이터셋 생성기 (결정적: 같은 SEED 면 항상 같은 데이터).
 * 테이블 이름은 QA-Lab 레슨(m61)의 스키마를 따른다. 컬럼 정의는 레슨 DDL 과 대조하지 못했다 — TODO: verify
 * 실무의 "제약 없는 오래된 테이블"처럼 FK 가 없다 (고아 레코드가 생길 수 있다).
 *
 * 심어 둔 이상치 (정답은 expected 에, 채점은 학습자 SQL 의 결과와 비교한다):
 *   A1 고아 order_items 6건 (주문이 없다)
 *   A2 중복 주문 5건 (같은 회원·같은 금액으로 2~4초 뒤에 한 번 더 들어온 주문 — 나중 주문의 id)
 *   A3 합계 불일치 주문 8건 (쿠폰 할인이 빠진 5건 + 등급 할인이 1원 반올림된 3건)
 *   A4 중복 회원 3건 (대소문자·공백만 다른 이메일 — 나중에 가입한 계정의 id)
 */
export const SEED = 20261003
export const DATASET_VERSION = 1

export const PRODUCTS = [
  [1, '무선 키보드', 50_000], [2, '무선 마우스', 25_000], [3, '마우스 패드', 4_990], [4, 'USB-C 케이블', 9_900],
  [5, '노트북 거치대', 39_000], [6, '모니터 암', 89_000], [7, '기계식 키보드', 129_000], [8, '웹캠', 49_999],
  [9, '데스크 매트', 1_000], [10, '한정판 머그컵', 15_000], [11, '텀블러', 22_000], [12, '4K 모니터', 459_000],
]
const GRADES = ['NORMAL', 'SILVER', 'GOLD', 'VIP']
const GRADE_RATE = { NORMAL: 0, SILVER: 1, GOLD: 3, VIP: 5 }
const STATUS_WEIGHTS = [['PAID', 3], ['SHIPPED', 3], ['DELIVERED', 8], ['CANCELLED', 2], ['REFUNDED', 1]]
export const REVENUE_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED']

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pad = (n, w = 2) => String(n).padStart(w, '0')

/** 'YYYY-MM-DD HH:MM:SS' (시간대 없는 KST 현지 시각) */
function stamp(baseMs, offsetSeconds) {
  return new Date(baseMs + offsetSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

export function buildDataset(seed = SEED) {
  const rand = mulberry32(seed)
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1))
  const pick = (arr) => arr[int(0, arr.length - 1)]
  const weighted = (pairs) => {
    let r = rand() * pairs.reduce((s, [, w]) => s + w, 0)
    for (const [v, w] of pairs) if ((r -= w) < 0) return v
    return pairs[0][0]
  }

  const members = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    email: `user${pad(i + 1)}@example.com`,
    name: `회원${pad(i + 1)}`,
    grade: GRADES[i % 4],
    created_at: stamp(Date.UTC(2026, 4, 1), (i + 1) * 86400 + int(0, 80000)),
  }))

  const orders = []
  const orderItems = []
  const start = Date.UTC(2026, 6, 1)
  for (let id = 1; id <= 120; id++) {
    const member = pick(members)
    const itemCount = int(1, 3)
    const chosen = new Set()
    while (chosen.size < itemCount) chosen.add(int(1, PRODUCTS.length))
    let subtotal = 0
    for (const productId of chosen) {
      const price = PRODUCTS[productId - 1][2]
      const qty = int(1, 3)
      orderItems.push({ id: orderItems.length + 1, order_id: id, product_id: productId, unit_price: price, qty, line_total: price * qty })
      subtotal += price * qty
    }
    const gradeDiscount = Math.floor((subtotal * GRADE_RATE[member.grade]) / 100)
    const couponDiscount = subtotal >= 20_000 ? pick([0, 0, 3_000, 5_000]) : 0
    const shippingFee = subtotal - gradeDiscount - couponDiscount >= 50_000 ? 0 : 3_000
    orders.push({
      id, member_id: member.id, status: weighted(STATUS_WEIGHTS),
      subtotal, grade_discount: gradeDiscount, coupon_discount: couponDiscount, shipping_fee: shippingFee,
      total_amount: subtotal - gradeDiscount - couponDiscount + shippingFee,
      created_at: stamp(start, int(0, 90) * 86400 + int(0, 86399)),
    })
  }

  // A3 합계 불일치: 쿠폰 할인이 있는 주문 5건은 합계에 쿠폰 할인이 빠지고, 등급 할인이 있는 주문 3건은 할인액이 1원 올림된 채 저장
  const byId = new Map(orders.map((o) => [o.id, o]))
  const withCoupon = orders.filter((o) => o.coupon_discount > 0 && o.id >= 10).filter((_, i) => i % 7 === 0).slice(0, 5)
  const couponIds = new Set(withCoupon.map((o) => o.id))
  for (const o of withCoupon) o.total_amount += o.coupon_discount
  const withGrade = orders.filter((o) => o.grade_discount > 0 && !couponIds.has(o.id) && o.id >= 10).filter((_, i) => i % 5 === 0).slice(0, 3)
  for (const o of withGrade) o.grade_discount += 1
  const mismatchOrderIds = [...withCoupon, ...withGrade].map((o) => o.id).sort((a, b) => a - b)

  // A2 중복 주문: 이상치가 없는 주문 5건을 2~4초 뒤에 한 번 더 넣는다 (품목도 그대로 복사)
  const mismatch = new Set(mismatchOrderIds)
  const sources = orders.filter((o) => !mismatch.has(o.id) && o.id >= 5).filter((_, i) => i % 17 === 0).slice(0, 5)
  const duplicateOrderIds = []
  for (const src of sources) {
    const copy = { ...src, id: orders.length + 1, created_at: stamp(Date.parse(`${src.created_at.replace(' ', 'T')}Z`), int(2, 4)) }
    orders.push(copy)
    duplicateOrderIds.push(copy.id)
    for (const it of orderItems.filter((i) => i.order_id === src.id)) orderItems.push({ ...it, id: orderItems.length + 1, order_id: copy.id })
  }

  // A1 고아 order_items: 존재하지 않는 주문 번호를 가리킨다
  const orphanItemIds = []
  for (let i = 0; i < 6; i++) {
    const productId = int(1, PRODUCTS.length)
    const qty = int(1, 2)
    const item = { id: orderItems.length + 1, order_id: 9001 + i, product_id: productId, unit_price: PRODUCTS[productId - 1][2], qty, line_total: PRODUCTS[productId - 1][2] * qty }
    orderItems.push(item)
    orphanItemIds.push(item.id)
  }

  // A4 중복 회원: 대소문자·공백만 다른 이메일로 다시 가입
  const duplicateMemberIds = []
  for (const [original, variant] of [[7, 'USER07@Example.com'], [12, 'user12@example.com '], [25, 'User25@example.COM']]) {
    const base = members[original - 1]
    const dup = { id: members.length + 1, email: variant, name: `${base.name}(재가입)`, grade: 'NORMAL', created_at: stamp(Date.UTC(2026, 6, 20), int(0, 80000)) }
    members.push(dup)
    duplicateMemberIds.push(dup.id)
  }
  void byId

  const products = PRODUCTS.map(([id, name, price]) => ({ id, name, price }))
  return { members, products, orders, orderItems, expected: { orphanItemIds, duplicateOrderIds, mismatchOrderIds, duplicateMemberIds } }
}

/** 심은 정답과 별개로, 데이터 자체에서 정답을 다시 계산한다 (생성기의 의도가 아니라 규칙으로). */
export function recompute({ members, orders, orderItems }) {
  const orderIds = new Set(orders.map((o) => o.id))
  const orphanItemIds = orderItems.filter((i) => !orderIds.has(i.order_id)).map((i) => i.id).sort((a, b) => a - b)

  const sums = new Map()
  for (const i of orderItems) sums.set(i.order_id, (sums.get(i.order_id) ?? 0) + i.line_total)
  const mismatchOrderIds = orders
    .filter((o) => o.total_amount !== (sums.get(o.id) ?? 0) - o.grade_discount - o.coupon_discount + o.shipping_fee)
    .map((o) => o.id)
    .sort((a, b) => a - b)

  const t = (o) => Date.parse(`${o.created_at.replace(' ', 'T')}Z`)
  const duplicateOrderIds = orders
    .filter((o) => orders.some((e) => e.id < o.id && e.member_id === o.member_id && e.total_amount === o.total_amount && Math.abs(t(o) - t(e)) <= 10_000))
    .map((o) => o.id)
    .sort((a, b) => a - b)

  const key = (m) => m.email.trim().toLowerCase()
  const duplicateMemberIds = members
    .filter((m) => members.some((e) => e.id < m.id && key(e) === key(m)))
    .map((m) => m.id)
    .sort((a, b) => a - b)
  return { orphanItemIds, duplicateOrderIds, mismatchOrderIds, duplicateMemberIds }
}

/** t1 검증 쿼리의 정답 (README 의 규칙 그대로). 행은 [열, ...] 배열이다. */
export function verificationAnswers({ orders }) {
  const count = new Map()
  for (const o of orders) count.set(o.status, (count.get(o.status) ?? 0) + 1)
  const statusCounts = [...count.entries()].map(([s, n]) => [s, n])

  const revenue = orders.filter((o) => REVENUE_STATUSES.includes(o.status))
  const byMonth = new Map()
  for (const o of revenue) byMonth.set(o.created_at.slice(0, 7), (byMonth.get(o.created_at.slice(0, 7)) ?? 0) + o.total_amount)
  const monthlyRevenue = [...byMonth.entries()].map(([m, sum]) => [m, sum])

  const byMember = new Map()
  for (const o of revenue) byMember.set(o.member_id, (byMember.get(o.member_id) ?? 0) + o.total_amount)
  const ranked = [...byMember.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])
  const topMembers = ranked.slice(0, 3).map(([id, sum]) => [id, sum])
  const topTie = ranked.length > 3 && ranked[2][1] === ranked[3][1]
  return { statusCounts, monthlyRevenue, topMembers, topTie }
}
