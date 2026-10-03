// t2. 화면 v1 과 v2 에서 모두 통과하는 테스트를 쓰세요.
// 아래 예시는 v1 에서만 통과합니다. 왜 v2 에서 깨지는지 확인하고 로케이터를 고치세요.
import { expect, test } from '@playwright/test'
import { PASSWORD } from '../support/env.mjs'

test('상품 담기 (예시 — 깨지기 쉬운 로케이터)', async ({ page }) => {
  await page.goto('/#/login')
  await page.locator('form input').nth(0).fill('kim@example.com')
  await page.locator('form input').nth(1).fill(PASSWORD)
  await page.locator('button.primary').click()
  await expect(page.getByTestId('session-name')).toContainText('김일반')
  await page.locator('.products .card:nth-child(1) button').click()
  await expect(page.getByRole('status').first()).toContainText('담았습니다')
})

// TODO: 장바구니에서 수량을 바꾸고 삭제하는 테스트를 추가하세요. 두 변형 모두에서 통과해야 합니다.
