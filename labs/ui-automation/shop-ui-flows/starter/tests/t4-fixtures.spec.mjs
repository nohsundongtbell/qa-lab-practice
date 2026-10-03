// t4. fixture API 로 테스트 데이터를 준비하고, 주문 상세 화면에서 환불 흐름을 확인하세요.
//   POST {API_URL}/__admin/fixtures/orders  { email, status, items: [{ productId, qty }], deliveredHoursAgo? } → { id }
//   status: PENDING | PAID | SHIPPED | DELIVERED | CANCELLED | REFUNDED
import { expect, test } from '@playwright/test'
import { API_URL } from '../support/env.mjs'

test.fixme('배송 완료된 주문을 환불하면 "환불됨"으로 바뀐다', async ({ page, request }) => {
  // TODO: request.post(`${API_URL}/__admin/fixtures/orders`, { data: { … } }) 로 주문을 만들고,
  //       로그인한 뒤 #/orders/<id> 를 열어 환불을 눌러 보세요.
  void API_URL
  void request
  await expect(page).toHaveURL(/./)
})
