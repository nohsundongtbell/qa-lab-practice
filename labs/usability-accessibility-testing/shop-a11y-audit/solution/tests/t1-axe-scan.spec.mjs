// t1 모범 답안: 주요 화면 6개를 axe-core 로 스캔한다.
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createPendingOrder, login, saveResults } from '../support/shop.mjs'

async function analyze(page) {
  return new AxeBuilder({ page }).analyze()
}

/**
 * SPEC §10.8: 화면 맨 위 실습 안내 띠(.warning)는 랜드마크 밖에 두는 것을 허용한다.
 * 규칙(region)을 통째로 끄지 않고, 그 요소만 걸러 낸다 — 다른 요소의 region 위반은 여전히 잡는다.
 */
function isAllowed(violation) {
  return violation.id === 'region' && violation.nodes.every((n) => n.target.join(' ') === '.warning')
}

async function scan(page, name) {
  const results = await analyze(page)
  saveResults(name, results)
  const real = results.violations.filter((v) => !isAllowed(v))
  expect.soft(real.map((v) => `${v.id} (${v.nodes.length}곳)`), `${name} 화면의 접근성 위반`).toEqual([])
}

test('회원 가입 화면', async ({ page }) => {
  await page.goto('/#/signup')
  await expect(page.getByRole('heading', { name: '회원 가입' })).toBeVisible()
  await scan(page, 'signup')
})

test('로그인 화면', async ({ page }) => {
  await page.goto('/#/login')
  await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
  await scan(page, 'login')
})

test('상품 목록 (로그인한 상태)', async ({ page }) => {
  await login(page)
  await page.goto('/#/products')
  await expect(page.getByTestId('product-card').first()).toBeVisible()
  await scan(page, 'products')
})

test('장바구니 (상품을 담은 상태)', async ({ page }) => {
  await login(page, 'lee@example.com')
  await page.getByRole('button', { name: '무선 키보드 장바구니에 담기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '담았습니다' })).toBeVisible()
  await page.goto('/#/cart')
  await expect(page.getByTestId('cart-total')).toBeVisible()
  await scan(page, 'cart')
})

test('주문 내역과 주문 상세 (결제 전 주문)', async ({ page, request }) => {
  const id = await createPendingOrder(request)
  await login(page)
  await page.goto('/#/orders')
  await expect(page.getByTestId('order-row').first()).toBeVisible()
  await scan(page, 'orders')

  await page.goto(`/#/orders/${id}`)
  await expect(page.getByRole('button', { name: '주문 취소' })).toBeVisible()
  await scan(page, 'order-detail')
})
