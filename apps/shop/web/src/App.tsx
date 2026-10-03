import { useCallback, useEffect, useState } from 'react'
import { api, auth, type Member } from './api'
import { ProductsPage } from './pages/Products'
import { CartPage } from './pages/Cart'
import { OrdersPage } from './pages/Orders'
import { LoginPage } from './pages/Login'
import { SignupPage } from './pages/Signup'
import { useVariant } from './variant'
import { isDefectOn } from './defects'

/** 아주 단순한 해시 라우터: #/products, #/cart, #/orders, #/login, #/signup */
function useRoute(): string {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/products')
  useEffect(() => {
    const onChange = () => setRoute(location.hash.slice(1) || '/products')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function App() {
  const route = useRoute()
  const variant = useVariant()
  const [member, setMember] = useState<Member | null>(null)

  const refreshMember = useCallback(async () => {
    if (!auth.token) return setMember(null)
    try {
      setMember(await api<Member>('GET', '/api/members/me'))
    } catch {
      auth.set(null)
      setMember(null)
    }
  }, [])

  useEffect(() => {
    void refreshMember()
  }, [refreshMember])

  const logout = () => {
    auth.set(null)
    setMember(null)
    location.hash = '/products'
  }

  const sessionBox = (
    <div className={variant === 'v2' ? 'account' : 'session'}>
      {member ? (
        <>
          <span data-testid="session-name">
            {member.name}님 <span className="grade">{member.grade}</span>
          </span>
          {isDefectOn('DF-023') ? (
            <button type="button" className="icon-button" onClick={logout}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 2h-3v12h3M10 4l4 4-4 4M14 8h-8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          ) : (
            <button type="button" onClick={logout}>로그아웃</button>
          )}
        </>
      ) : (
        <>
          <a href="#/login">로그인</a>
          <a href="#/signup">회원 가입</a>
        </>
      )}
    </div>
  )

  let page
  if (route.startsWith('/cart')) page = <CartPage member={member} />
  else if (route.startsWith('/orders')) page = <OrdersPage member={member} />
  else if (route.startsWith('/login')) page = <LoginPage onLogin={refreshMember} />
  else if (route.startsWith('/signup')) page = <SignupPage />
  else page = <ProductsPage member={member} />

  return (
    <>
      <div className="warning" role="note">실습용 서비스입니다. 의도적인 결함이 들어 있으며 실제 결제는 일어나지 않습니다.</div>
      <header className={variant === 'v2' ? 'topbar' : undefined}>
        <a className={variant === 'v2' ? 'logo' : 'brand'} href="#/products">QA 숍</a>
        {variant === 'v2' ? sessionBox : null}
        <nav aria-label="주 메뉴" className={variant === 'v2' ? 'menu' : undefined}>
          <a href="#/products">상품</a>
          <a href="#/cart">장바구니</a>
          <a href="#/orders">주문 내역</a>
        </nav>
        {variant === 'v1' ? sessionBox : null}
      </header>
      {variant === 'v2' ? <div className="page"><main className="content">{page}</main></div> : <main>{page}</main>}
    </>
  )
}
