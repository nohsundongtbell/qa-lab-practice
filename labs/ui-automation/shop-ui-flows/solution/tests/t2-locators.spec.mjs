import { expect, test } from '@playwright/test'
import { PASSWORD } from '../support/env.mjs'

// 테스트마다 다른 회원을 쓴다 — 한 테스트가 담은 장바구니가 다음 테스트를 흔들지 않도록.
async function loginAs(page, email, name) {
  await page.goto('/#/login')
  await page.getByLabel('이메일').fill(email)
  await page.getByLabel('비밀번호').fill(PASSWORD)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByTestId('session-name')).toContainText(name)
}

test('상품 카드에서 원하는 상품을 이름으로 찾아 담는다', async ({ page }) => {
  await loginAs(page, 'lee@example.com', '이실버')
  const card = page.getByTestId('product-card').filter({ hasText: '기계식 키보드' })
  await expect(card.getByTestId('product-price')).toHaveText('129,000원')
  await card.getByRole('button', { name: /담기/ }).click()
  await expect(page.getByRole('status').filter({ hasText: '담았습니다' })).toContainText('기계식 키보드')
})

test('장바구니에서 수량을 바꾸면 금액이 바뀌고, 삭제하면 비워진다', async ({ page }) => {
  await loginAs(page, 'kim@example.com', '김일반')
  await page.getByRole('button', { name: '마우스 패드 장바구니에 담기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '담았습니다' })).toBeVisible()
  await page.getByRole('link', { name: '장바구니' }).click()

  // 상품 목록에도 같은 이름의 수량 입력란이 있다. 장바구니 행 안으로 좁혀야 화면이 바뀌기 전의 입력란을 잡지 않는다.
  const qty = page.getByTestId('cart-row').getByRole('spinbutton', { name: '마우스 패드 수량' })
  await qty.fill('3')
  await qty.blur()
  // 4,990원 × 3 = 14,970원 + 배송비 3,000원
  await expect(page.getByTestId('cart-total')).toHaveText('17,970원')

  await page.getByRole('button', { name: '마우스 패드 삭제' }).click()
  await expect(page.getByText('장바구니가 비어 있습니다.')).toBeVisible()
})
