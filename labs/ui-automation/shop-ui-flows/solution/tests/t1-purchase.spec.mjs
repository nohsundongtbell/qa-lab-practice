import { expect, test } from '@playwright/test'
import { PASSWORD } from '../support/env.mjs'

async function login(page, email, password) {
  await page.goto('/#/login')
  await page.getByLabel('이메일').fill(email)
  await page.getByLabel('비밀번호').fill(password)
  await page.getByRole('button', { name: '로그인' }).click()
}

test('로그인 → 상품 담기 → 금액 확인 → 주문하면 결제 대기 상태가 된다', async ({ page }) => {
  await login(page, 'kim@example.com', PASSWORD)
  await expect(page.getByTestId('session-name')).toContainText('김일반')

  await page.getByRole('spinbutton', { name: '무선 키보드 수량' }).fill('2')
  await page.getByRole('button', { name: '무선 키보드 장바구니에 담기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '담았습니다' })).toBeVisible()

  await page.getByRole('link', { name: '장바구니' }).click()
  // 50,000원 × 2 = 100,000원. 등급 할인·쿠폰 없음, 배송비 무료 (SPEC §3·§5)
  await expect(page.getByTestId('cart-total')).toHaveText('100,000원')

  await page.getByRole('button', { name: '주문하기' }).click()
  await expect(page.getByRole('heading', { name: /^주문 #\d+$/ })).toBeVisible()
  await expect(page.getByTestId('order-status')).toHaveText('결제 대기')
})

test('비밀번호가 틀리면 오류 메시지가 나오고 로그인되지 않는다', async ({ page }) => {
  await login(page, 'kim@example.com', 'wrong-password')
  await expect(page.getByRole('alert')).toHaveText('이메일 또는 비밀번호가 올바르지 않습니다.')
  await expect(page.getByTestId('session-name')).toHaveCount(0)
})
