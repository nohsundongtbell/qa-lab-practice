import { useCallback, useEffect, useState } from 'react'
import { type Amounts, api, ApiError, type CartLine, type Member, type Order, type OwnedCoupon, won } from '../api'

export function CartPage({ member }: { member: Member | null }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [coupons, setCoupons] = useState<OwnedCoupon[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [quote, setQuote] = useState<Amounts | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const cart = await api<{ items: CartLine[] }>('GET', '/api/cart')
    setLines(cart.items)
    setCoupons((await api<OwnedCoupon[]>('GET', '/api/members/me/coupons')).filter((c) => !c.usedAt))
  }, [])

  useEffect(() => {
    if (member) void load()
  }, [member, load])

  useEffect(() => {
    if (!member || lines.length === 0) return setQuote(null)
    api<Amounts>('POST', '/api/quote', { items: lines.map((l) => ({ productId: l.productId, qty: l.qty })), couponCode: couponCode || undefined })
      .then((q) => {
        setQuote(q)
        setMessage('')
      })
      .catch((e) => {
        setQuote(null)
        setMessage(e instanceof ApiError ? `${e.message} (${String(e.body.details?.reason ?? e.body.code)})` : '금액을 계산하지 못했습니다.')
      })
  }, [member, lines, couponCode])

  if (!member) return <p>장바구니를 보려면 <a href="#/login">로그인</a>하세요.</p>

  const changeQty = async (line: CartLine, value: string) => {
    try {
      await api('PUT', `/api/cart/items/${line.productId}`, { qty: Number(value) })
      await load()
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '수량을 바꾸지 못했습니다.')
    }
  }

  const remove = async (line: CartLine) => {
    await api('DELETE', `/api/cart/items/${line.productId}`)
    await load()
  }

  const order = async () => {
    try {
      const o = await api<Order>('POST', '/api/orders', { couponCode: couponCode || undefined })
      location.hash = `/orders/${o.id}`
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '주문하지 못했습니다.')
    }
  }

  return (
    <section>
      <h1>장바구니</h1>
      <p role="status" aria-live="polite">{message}</p>
      {lines.length === 0 ? (
        <p>장바구니가 비어 있습니다.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr><th scope="col">상품</th><th scope="col">단가</th><th scope="col">수량</th><th scope="col">금액</th><th scope="col"><span className="sr-only">삭제</span></th></tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.productId}>
                  <td>{l.name}</td>
                  <td>{won(l.unitPrice)}</td>
                  <td>
                    <input type="number" min={1} max={99} defaultValue={l.qty} aria-label={`${l.name} 수량`}
                      onBlur={(e) => e.target.value !== String(l.qty) && changeQty(l, e.target.value)} />
                  </td>
                  <td>{won(l.lineTotal)}</td>
                  <td><button type="button" onClick={() => remove(l)} aria-label={`${l.name} 삭제`}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <label>
            쿠폰
            <select value={couponCode} onChange={(e) => setCouponCode(e.target.value)}>
              <option value="">사용 안 함</option>
              {coupons.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.type === 'FIXED' ? won(c.amount ?? 0) : `${c.rate}% (최대 ${won(c.maxDiscount ?? 0)})`}
                </option>
              ))}
            </select>
          </label>
          {quote && (
            <dl className="amounts" aria-label="결제 금액">
              <dt>상품 금액</dt><dd>{won(quote.subtotal)}</dd>
              <dt>등급 할인</dt><dd>-{won(quote.gradeDiscount)}</dd>
              <dt>쿠폰 할인</dt><dd>-{won(quote.couponDiscount)}</dd>
              <dt>배송비</dt><dd>{won(quote.shippingFee)}</dd>
              <dt>결제 금액</dt><dd className="total">{won(quote.total)}</dd>
            </dl>
          )}
          <button type="button" className="primary" onClick={order}>주문하기</button>
        </>
      )}
    </section>
  )
}
