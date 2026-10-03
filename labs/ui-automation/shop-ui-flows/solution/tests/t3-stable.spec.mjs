import { expect, test } from '@playwright/test'
import { PASSWORD } from '../support/env.mjs'
import { CartPage } from '../pages/CartPage.mjs'
import { LoginPage } from '../pages/LoginPage.mjs'
import { ProductsPage } from '../pages/ProductsPage.mjs'

test('로그인 → 담기 → 장바구니 금액 → 주문 (느린 응답에도 안정적)', async ({ page }) => {
  await new LoginPage(page).login('kim@example.com', PASSWORD)

  const products = new ProductsPage(page)
  await products.open()
  await products.addToCart('무선 키보드', 2)

  const cart = new CartPage(page)
  await cart.open()
  await expect(cart.total).toHaveText('100,000원')
  await cart.order()
  await expect(page.getByTestId('order-status')).toHaveText('결제 대기')
})

test('새로 고침한 뒤에도 로그인이 유지되고 상품을 담을 수 있다', async ({ page }) => {
  await new LoginPage(page).login('lee@example.com', PASSWORD)
  await page.reload()

  const products = new ProductsPage(page)
  await products.open() // 회원 정보가 다시 읽힐 때까지 기다린다 — 안 기다리면 로그인 화면으로 튕긴다
  await products.addToCart('USB-C 케이블')
  await expect(page.getByTestId('session-name')).toContainText('이실버')
})
