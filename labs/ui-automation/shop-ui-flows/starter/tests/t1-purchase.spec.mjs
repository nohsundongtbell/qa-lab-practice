// t1. 로그인 → 상품 담기 → 장바구니 금액 확인 → 주문 → 주문 상태 확인 흐름을 자동화하세요.
// 시드 계정: kim@example.com / qa-lab-1234 (README 참고)
import { expect, test } from '@playwright/test'
import { PASSWORD } from '../support/env.mjs'

test('로그인하면 상단에 내 이름이 보인다 (예시)', async ({ page }) => {
  await page.goto('/#/login')
  await page.getByLabel('이메일').fill('kim@example.com')
  await page.getByLabel('비밀번호').fill(PASSWORD)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByTestId('session-name')).toContainText('김일반')
})

// TODO: 구매 흐름 테스트와, 잘못된 비밀번호 오류 메시지 테스트를 추가하세요.
