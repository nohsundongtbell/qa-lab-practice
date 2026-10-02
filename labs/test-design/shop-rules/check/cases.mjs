/**
 * 랩 "쇼핑몰 규칙으로 테스트 설계하기"의 케이스 표(CSV) → 재현 절차 변환.
 * 과제마다 열이 다르다. 한 행이 테스트 케이스 하나다.
 */

export const MEMBERS = {
  kim: 'kim@example.com',
  lee: 'lee@example.com',
  park: 'park@example.com',
  choi: 'choi@example.com',
  jeju: 'jeju@example.com',
}
const GRADES = ['NORMAL', 'SILVER', 'GOLD', 'VIP']
const ORDER_STATES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
const COUPON_REASONS = ['NOT_FOUND', 'NOT_OWNED', 'ALREADY_USED', 'EXPIRED', 'NOT_STARTED', 'MIN_ORDER_NOT_MET']
const ERROR_WORDS = ['오류', 'error', '400']

export class RowError extends Error {}

const isError = (v) => ERROR_WORDS.includes(v.trim().toLowerCase())

/** "3,000", "3000원" 도 받는다. */
export function parseWon(value, column) {
  const cleaned = value.replace(/[,\s원]/g, '')
  if (!/^-?\d+$/.test(cleaned)) throw new RowError(`${column} 은(는) 정수(원) 또는 "오류" 여야 합니다: "${value}"`)
  return Number(cleaned)
}

export function parseMember(value) {
  const key = value.trim().toLowerCase()
  if (MEMBERS[key]) return MEMBERS[key]
  if (Object.values(MEMBERS).includes(key)) return key
  throw new RowError(`member 는 ${Object.keys(MEMBERS).join(', ')} 중 하나여야 합니다: "${value}"`)
}

/** "1x2;9x20" → [{ product: 1, qty: 2 }, { product: 9, qty: 20 }]. 수량에 0·음수도 허용(경계값 시험용). */
export function parseItems(value) {
  const parts = value.split(/[;/]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) throw new RowError('items 가 비어 있습니다 (예: 1x2;9x20 = 상품 1번 2개, 9번 20개)')
  return parts.map((p) => {
    const m = /^(\d+)\s*[xX×*]\s*(-?\d+)$/.exec(p)
    if (!m) throw new RowError(`items 형식은 "상품번호x수량" 입니다 (여러 개면 ; 로 구분): "${p}"`)
    return { product: Number(m[1]), qty: Number(m[2]) }
  })
}

const loginStep = (email) => ({ login: email })

export const TASKS = {
  t1: {
    file: 't1-grade.csv',
    columns: ['name', 'technique', 'total_spent', 'expected_grade'],
    spec: 'SPEC §1.3 회원 등급',
    reset: false,
    toRepro(row) {
      const expected = row.expected_grade.trim().toUpperCase()
      const total = row.total_spent.replace(/[,\s원]/g, '')
      if (!/^-?\d+(\.\d+)?$/.test(total)) throw new RowError(`total_spent 는 숫자여야 합니다: "${row.total_spent}"`)
      if (isError(expected)) return { steps: [{ grade: { total_spent: total }, expect: { status: 400 } }] }
      if (!GRADES.includes(expected)) throw new RowError(`expected_grade 는 ${GRADES.join(', ')} 또는 "오류" 여야 합니다: "${row.expected_grade}"`)
      return { steps: [{ grade: { total_spent: total }, expect: { status: 200, json: { grade: expected } } }] }
    },
  },
  t2: {
    file: 't2-shipping.csv',
    columns: ['name', 'technique', 'member', 'items', 'zipcode', 'expected_shipping_fee'],
    spec: 'SPEC §2 수량, §3 금액 계산 순서, §5 배송비',
    reset: true,
    toRepro(row) {
      const quote = { items: parseItems(row.items) }
      if (row.zipcode) {
        if (!/^\d{5}$/.test(row.zipcode)) throw new RowError(`zipcode 는 숫자 5자리이거나 비워 둡니다 (비우면 회원 주소): "${row.zipcode}"`)
        quote.zipcode = row.zipcode
      }
      const expect = isError(row.expected_shipping_fee)
        ? { status: 400 }
        : { status: 200, json: { shippingFee: parseWon(row.expected_shipping_fee, 'expected_shipping_fee') } }
      return { steps: [loginStep(parseMember(row.member)), { quote, expect }] }
    },
  },
  t3: {
    file: 't3-coupon.csv',
    columns: ['name', 'technique', 'member', 'items', 'coupon', 'expected_discount'],
    spec: 'SPEC §3 금액 계산, §4 쿠폰',
    reset: true,
    toRepro(row) {
      if (!row.coupon) throw new RowError('coupon 이 비어 있습니다 (쿠폰 코드)')
      const quote = { items: parseItems(row.items), coupon: row.coupon }
      const want = row.expected_discount.trim().toUpperCase()
      const expect = COUPON_REASONS.includes(want)
        ? { status: 422, json: { code: 'COUPON_NOT_APPLICABLE', 'details.reason': want } }
        : { status: 200, json: { couponDiscount: parseWon(row.expected_discount, 'expected_discount') } }
      return { steps: [loginStep(parseMember(row.member)), { quote, expect }] }
    },
  },
  t4: {
    file: 't4-order-states.csv',
    columns: ['name', 'technique', 'steps', 'expected'],
    spec: 'SPEC §7 주문 상태와 전이',
    reset: true,
    /** steps: pay>ship>cancel. 마지막 동작의 결과를 expected 로 판정한다. 그 앞의 동작은 성공해야 한다(전제). */
    toRepro(row, { now = new Date() } = {}) {
      const SUCCESS = { pay: 200, pay_declined: 402, cancel: 200, ship: 200, deliver: 200, refund: 200 }
      const tokens = row.steps.split('>').map((t) => t.trim()).filter(Boolean)
      if (tokens.length === 0) throw new RowError('steps 가 비어 있습니다 (예: pay>ship>cancel)')
      const base = Math.floor(now.getTime() / 60000) * 60000
      let offsetDays = 0
      const at = () => new Date(base + offsetDays * 86400000).toISOString()
      const steps = [
        loginStep(MEMBERS.kim),
        { add_to_cart: { product: 2, qty: 1 }, expect: { status: 200 }, now: at() },
        { order: {}, expect: { status: 201 }, now: at() },
      ]
      const actions = []
      for (const t of tokens) {
        const wait = /^wait:(\d+)$/.exec(t)
        if (wait) {
          offsetDays += Number(wait[1])
          continue
        }
        if (!(t in SUCCESS)) throw new RowError(`알 수 없는 동작입니다: "${t}" (사용 가능: ${Object.keys(SUCCESS).join(', ')}, wait:일수)`)
        actions.push({ action: t, now: at() })
      }
      if (actions.length === 0) throw new RowError('steps 에 동작이 하나 이상 있어야 합니다')
      const toStep = ({ action, now: n }) => (action === 'pay_declined' ? { pay: { card: '4000-0000-0000-0002' }, now: n } : { [action]: {}, now: n })

      actions.slice(0, -1).forEach((a) => steps.push({ ...toStep(a), expect: { status: SUCCESS[a.action] } }))
      const last = actions[actions.length - 1]
      const expected = row.expected.trim().toUpperCase()
      if (ORDER_STATES.includes(expected)) {
        // 마지막 동작이 성공했든 거부됐든, "그 뒤 주문 상태"를 확인한다.
        steps.push(toStep(last))
        steps.push({ get_order: {}, expect: { status: 200, json: { status: expected } }, now: last.now })
      } else if (/^\d{3}$/.test(expected)) {
        steps.push({ ...toStep(last), expect: { status: Number(expected) } })
      } else {
        throw new RowError(`expected 는 주문 상태(${ORDER_STATES.join(', ')}) 또는 HTTP 상태 코드(예: 409) 여야 합니다: "${row.expected}"`)
      }
      return { steps }
    },
  },
}
