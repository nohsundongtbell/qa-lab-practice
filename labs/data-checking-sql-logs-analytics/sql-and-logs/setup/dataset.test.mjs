import { describe, expect, it } from 'vitest'
import { buildDataset, recompute, verificationAnswers, SEED } from './dataset.mjs'

const data = buildDataset()

describe('데이터셋 생성기', () => {
  it('결정적이다: 같은 시드는 같은 데이터, 다른 시드는 다른 데이터', () => {
    expect(JSON.stringify(buildDataset())).toBe(JSON.stringify(buildDataset(SEED)))
    expect(JSON.stringify(buildDataset(SEED + 1))).not.toBe(JSON.stringify(data))
  })

  it('규모와 심은 이상치 개수', () => {
    expect(data.members).toHaveLength(43)
    expect(data.orders).toHaveLength(125)
    expect(data.expected.orphanItemIds).toHaveLength(6)
    expect(data.expected.duplicateOrderIds).toHaveLength(5)
    expect(data.expected.mismatchOrderIds).toHaveLength(8)
    expect(data.expected.duplicateMemberIds).toHaveLength(3)
  })

  it('심은 정답이 데이터에서 규칙으로 다시 계산한 값과 정확히 같다 (자연 발생한 이상치도, 빠진 이상치도 없다)', () => {
    expect(recompute(data)).toEqual({
      orphanItemIds: [...data.expected.orphanItemIds].sort((a, b) => a - b),
      duplicateOrderIds: [...data.expected.duplicateOrderIds].sort((a, b) => a - b),
      mismatchOrderIds: data.expected.mismatchOrderIds,
      duplicateMemberIds: [...data.expected.duplicateMemberIds].sort((a, b) => a - b),
    })
  })

  it('합계 불일치는 쿠폰 누락(큰 차이) 5건과 1원 차이 3건으로 이루어진다', () => {
    const sums = new Map()
    for (const i of data.orderItems) sums.set(i.order_id, (sums.get(i.order_id) ?? 0) + i.line_total)
    const diffs = data.orders.filter((o) => data.expected.mismatchOrderIds.includes(o.id)).map((o) => o.total_amount - ((sums.get(o.id) ?? 0) - o.grade_discount - o.coupon_discount + o.shipping_fee))
    expect(diffs.filter((d) => Math.abs(d) === 1)).toHaveLength(3)
    expect(diffs.filter((d) => Math.abs(d) >= 3_000)).toHaveLength(5)
  })

  it('중복 주문은 원본과 같은 회원·금액으로 2~4초 뒤에 들어오고 품목도 같다', () => {
    for (const id of data.expected.duplicateOrderIds) {
      const copy = data.orders.find((o) => o.id === id)
      const orig = data.orders.find((o) => o.id < id && o.member_id === copy.member_id && o.total_amount === copy.total_amount && Math.abs(Date.parse(`${o.created_at.replace(' ', 'T')}Z`) - Date.parse(`${copy.created_at.replace(' ', 'T')}Z`)) <= 10_000)
      expect(orig).toBeTruthy()
      const items = (oid) => data.orderItems.filter((i) => i.order_id === oid).map((i) => [i.product_id, i.qty])
      expect(items(id)).toEqual(items(orig.id))
    }
  })

  it('t1 정답에서 순위 경계에 동점이 없다 (top 3 가 하나로 정해진다)', () => {
    const a = verificationAnswers(data)
    expect(a.topTie).toBe(false)
    expect(a.topMembers).toHaveLength(3)
    expect(a.statusCounts.reduce((s, [, n]) => s + n, 0)).toBe(125)
    expect(a.monthlyRevenue.length).toBeGreaterThanOrEqual(3)
  })

  it('이메일은 대소문자·공백만 다른 변형 3건을 제외하면 모두 유일하다', () => {
    const exact = new Set()
    const dupExact = data.members.filter((m) => (exact.has(m.email) ? true : (exact.add(m.email), false)))
    expect(dupExact).toHaveLength(0) // 문자열 그대로는 중복이 없다 → 그냥 GROUP BY email 로는 못 찾는다
  })
})
