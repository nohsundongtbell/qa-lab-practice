import { expect, test } from '@playwright/test'
import { API_URL, PASSWORD } from '../support/env.mjs'
import { LoginPage } from '../pages/LoginPage.mjs'

/** fixture API 로 주문을 만들고 id 를 돌려준다. 화면을 눌러 만들 수 없는 (또는 오래 걸리는) 상태를 한 번에 만든다. */
async function createOrder(request, data) {
  const res = await request.post(`${API_URL}/__admin/fixtures/orders`, { data })
  expect(res.status()).toBe(201)
  return (await res.json()).id
}

test('배송 완료된 주문을 환불 요청하면 "환불됨"으로 바뀐다', async ({ page, request }) => {
  const id = await createOrder(request, { email: 'park@example.com', status: 'DELIVERED', items: [{ productId: 1, qty: 2 }] })
  await new LoginPage(page).login('park@example.com', PASSWORD)

  await page.goto(`/#/orders/${id}`)
  await expect(page.getByTestId('order-status')).toHaveText('배송 완료')
  await page.getByRole('button', { name: '환불 요청' }).click()
  await expect(page.getByTestId('order-status')).toHaveText('환불됨')
})

test('배송 완료 후 7일이 지난 주문은 환불이 거절된다', async ({ page, request }) => {
  const id = await createOrder(request, { email: 'kim@example.com', status: 'DELIVERED', items: [{ productId: 3, qty: 1 }], deliveredHoursAgo: 24 * 8 })
  await new LoginPage(page).login('kim@example.com', PASSWORD)

  await page.goto(`/#/orders/${id}`)
  await page.getByRole('button', { name: '환불 요청' }).click()
  await expect(page.getByRole('status').filter({ hasText: '7일이 지나' })).toBeVisible()
  await expect(page.getByTestId('order-status')).toHaveText('배송 완료')
})
