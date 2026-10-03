import { useEffect, useState } from 'react'
import { api, ApiError, type Member, type Product, won } from '../api'
import { useVariant } from '../variant'

export function ProductsPage({ member }: { member: Member | null }) {
  const [products, setProducts] = useState<Product[]>([])
  const [qty, setQty] = useState<Record<number, string>>({})
  const [message, setMessage] = useState<string>('')
  const v2 = useVariant() === 'v2'

  useEffect(() => {
    api<Product[]>('GET', '/api/products').then(setProducts).catch(() => setMessage('상품을 불러오지 못했습니다.'))
  }, [])

  const add = async (p: Product) => {
    if (!member) {
      location.hash = '/login'
      return
    }
    try {
      await api('PUT', `/api/cart/items/${p.id}`, { qty: Number(qty[p.id] ?? '1') })
      setMessage(`${p.name}을(를) 장바구니에 담았습니다.`)
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '담지 못했습니다.')
    }
  }

  return (
    <section>
      <h1>상품</h1>
      <p role="status" aria-live="polite">{message}</p>
      <ul className={v2 ? 'grid' : 'products'}>
        {products.map((p) => {
          const qtyInput = (
            <label>
              수량
              <input
                type="number"
                min={1}
                max={99}
                value={qty[p.id] ?? '1'}
                onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })}
                aria-label={`${p.name} 수량`}
              />
            </label>
          )
          const addButton = (
            <button type="button" onClick={() => add(p)} disabled={p.stock === 0} aria-label={`${p.name} 장바구니에 담기`} data-testid={`add-to-cart-${p.id}`}>
              담기
            </button>
          )
          return v2 ? (
            <li key={p.id} className="tile" data-testid="product-card">
              <div className="tile-body">
                <h3>{p.name}</h3>
                <div className="tile-meta">
                  <span className="amount" data-testid="product-price">{won(p.price)}</span>
                  <span className="remain">{p.stock > 0 ? `재고 ${p.stock}개` : '품절'}</span>
                </div>
              </div>
              <div className="tile-actions">{addButton}{qtyInput}</div>
            </li>
          ) : (
            <li key={p.id} className="card" data-testid="product-card">
              <h2>{p.name}</h2>
              <p className="price" data-testid="product-price">{won(p.price)}</p>
              <p className="stock">{p.stock > 0 ? `재고 ${p.stock}개` : '품절'}</p>
              {qtyInput}
              {addButton}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
