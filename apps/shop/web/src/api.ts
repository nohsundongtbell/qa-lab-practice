export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(body.message)
  }
}

const TOKEN_KEY = 'qa-shop-token'

export const auth = {
  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* 저장소를 쓸 수 없는 환경 */
    }
  },
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (auth.token) headers.authorization = `Bearer ${auth.token}`
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  const data = text ? JSON.parse(text) : undefined
  if (!res.ok) throw new ApiError(res.status, data ?? { code: 'UNKNOWN', message: `요청 실패 (${res.status})` })
  return data as T
}

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export interface Member {
  id: number
  email: string
  name: string
  zipcode: string
  address: string
  grade: string
  totalSpent: number
}
export interface Product {
  id: number
  name: string
  price: number
  stock: number
}
export interface CartLine {
  productId: number
  name: string
  unitPrice: number
  qty: number
  lineTotal: number
}
export interface Amounts {
  subtotal: number
  gradeDiscount: number
  couponDiscount: number
  totalDiscount: number
  shippingFee: number
  total: number
}
export interface OwnedCoupon {
  code: string
  type: 'FIXED' | 'PERCENT'
  amount: number | null
  rate: number | null
  maxDiscount: number | null
  minOrderAmount: number
  validFrom: string
  validUntil: string
  usedAt: string | null
}
export interface Order extends Amounts {
  id: number
  status: string
  grade: string
  couponCode: string | null
  items: Array<{ productId: number; productName: string; unitPrice: number; qty: number; lineTotal: number }>
  zipcode: string
  address: string
  createdAt: string
  paidAt: string | null
  shipDate: string | null
  estimatedDelivery: string | null
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  SHIPPED: '출고됨',
  DELIVERED: '배송 완료',
  CANCELLED: '취소됨',
  REFUNDED: '환불됨',
}
