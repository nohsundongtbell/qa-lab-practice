// t1. 주요 화면을 axe-core 로 자동 스캔한다.
// - 화면마다 결과를 저장하고(saveResults), 사양서가 허용하지 않는 위반이 하나라도 있으면 실패하게 만든다.
// - 결함이 없는 앱에서는 통과하고, 접근성 문제가 있으면 실패해야 한다. 채점기가 결함을 하나씩 켜서 확인한다.
import { expect, test } from '@playwright/test'
// TODO 1: '@axe-core/playwright' 에서 AxeBuilder 를 가져오세요 (기본 내보내기).
import { createPendingOrder, login, saveResults } from '../support/shop.mjs'

/** 지금 화면을 분석해 { violations, incomplete, … } 를 돌려준다. */
async function analyze(page) {
  // TODO 2: AxeBuilder 로 page 를 분석해 결과를 돌려주세요.
  throw new Error('TODO: analyze() 를 완성하세요')
}

/**
 * 사양서(apps/shop/SPEC.md §10)가 허용해서 위반으로 세지 않는 항목이면 true.
 * TODO 3: 결함이 없는 화면에서도 나오는 항목을 결과 파일에서 찾아, 사양서 근거가 있을 때만 걸러 내세요.
 *         규칙 전체를 끄면(disableRules) 같은 규칙의 진짜 문제도 놓칩니다. 규칙 id 와 요소(target)를 함께 보세요.
 */
function isAllowed(violation) {
  return false
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

// TODO 4: 아래 화면도 스캔하세요. 화면이 다 그려진 뒤(목록·금액이 보인 뒤) 분석해야 합니다.
//   - login          로그인 화면
//   - products       상품 목록 (로그인한 상태 — 로그인해야만 보이는 요소가 있습니다)
//   - cart           장바구니 (상품을 담은 상태)
//   - orders         주문 내역
//   - order-detail   결제 전 주문의 상세 (createPendingOrder 로 만들고 #/orders/<번호> 로 엽니다)
