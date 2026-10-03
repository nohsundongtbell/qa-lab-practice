// t3. 응답이 느려지거나 들쭉날쭉해도(지연 환경 unstable) 10번 반복해서 모두 통과하는 테스트를 쓰세요.
// 규칙: 고정 대기(waitForTimeout 등)를 쓰지 않고, pages/ 의 페이지 객체를 가져다 씁니다.
import { expect, test } from '@playwright/test'

test('로그인 후 상품을 담는다 (예시 — 고정 대기에 의존)', async ({ page }) => {
  await page.goto('/#/login')
  await page.getByLabel('이메일').fill('kim@example.com')
  await page.getByLabel('비밀번호').fill('qa-lab-1234')
  await page.getByRole('button', { name: '로그인' }).click()
  await page.waitForTimeout(500)
  await page.goto('/#/products')
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: '무선 키보드 장바구니에 담기' }).click()
  await expect(page.getByRole('status').first()).toContainText('담았습니다')
})
