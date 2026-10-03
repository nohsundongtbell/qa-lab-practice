import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, type Member, type Order, STATUS_LABEL, won } from '../api'
import { isDefectOn } from '../defects'

const withUpperStatus = (o: Order): Order => ({ ...o, status: o.status.toUpperCase() as Order['status'] })

function OrderDetail({ id }: { id: number }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [card, setCard] = useState('')
  const [message, setMessage] = useState('')

  // 상태 값은 대소문자를 가리지 않고 읽는다 (화면이 API 응답 형식 차이에 너그럽게)
  const load = useCallback(async () => setOrder(withUpperStatus(await api<Order>('GET', `/api/orders/${id}`))), [id])
  useEffect(() => {
    load().catch(() => setMessage('주문을 찾을 수 없습니다.'))
  }, [load])

  const act = async (action: 'pay' | 'cancel' | 'refund') => {
    try {
      setOrder(withUpperStatus(await api<Order>('POST', `/api/orders/${id}/${action}`, action === 'pay' ? { cardNumber: card } : undefined)))
      setMessage('')
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '처리하지 못했습니다.')
    }
  }

  if (!order) return <p role="status">{message || '불러오는 중…'}</p>
  return (
    <section>
      <h1>주문 #{order.id}</h1>
      <p role="status" aria-live="polite">{message}</p>
      <p>상태: <strong data-testid="order-status">{STATUS_LABEL[order.status] ?? order.status}</strong></p>
      <ul>
        {order.items.map((i) => (
          <li key={i.productId}>{i.productName} × {i.qty} = {won(i.lineTotal)}</li>
        ))}
      </ul>
      <dl className="amounts" aria-label="결제 금액">
        <dt>상품 금액</dt><dd>{won(order.subtotal)}</dd>
        <dt>등급 할인</dt><dd>-{won(order.gradeDiscount)}</dd>
        <dt>쿠폰 할인{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>-{won(order.couponDiscount)}</dd>
        <dt>배송비</dt><dd>{won(order.shippingFee)}</dd>
        <dt>결제 금액</dt><dd className="total">{won(order.total)}</dd>
      </dl>
      {order.estimatedDelivery && <p>출고일 {order.shipDate} · 도착 예정일 {order.estimatedDelivery}</p>}
      {order.status === 'PENDING' && (
        <form onSubmit={(e) => { e.preventDefault(); void act('pay') }}>
          <label>
            카드 번호
            <input value={card} onChange={(e) => setCard(e.target.value)} placeholder="0000-0000-0000-0000" inputMode="numeric" />
          </label>
          {isDefectOn('DF-025') ? (
            <div className="primary pay-action" onClick={() => void act('pay')}>결제하기</div>
          ) : (
            <button type="submit" className="primary">결제하기</button>
          )}
        </form>
      )}
      {(order.status === 'PENDING' || order.status === 'PAID') && <button type="button" onClick={() => act('cancel')}>주문 취소</button>}
      {order.status === 'DELIVERED' && <button type="button" onClick={() => act('refund')}>환불 요청</button>}
      <p><a href="#/orders">← 주문 내역</a></p>
    </section>
  )
}

export function OrdersPage({ member }: { member: Member | null }) {
  const [orders, setOrders] = useState<Order[]>([])
  const id = Number(location.hash.split('/')[2])

  useEffect(() => {
    if (member && !id) api<Order[]>('GET', '/api/orders').then(setOrders).catch(() => setOrders([]))
  }, [member, id])

  if (!member) return <p>주문 내역을 보려면 <a href="#/login">로그인</a>하세요.</p>
  if (id) return <OrderDetail id={id} />
  return (
    <section>
      <h1>주문 내역</h1>
      {orders.length === 0 ? <p>주문이 없습니다.</p> : (
        <table>
          <thead><tr><th scope="col">주문 번호</th><th scope="col">상태</th><th scope="col">결제 금액</th><th scope="col">주문 시각</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} data-testid="order-row">
                <td><a href={`#/orders/${o.id}`}>#{o.id}</a></td>
                <td>{STATUS_LABEL[o.status] ?? o.status}</td>
                <td>{won(o.total)}</td>
                <td>{new Date(o.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
