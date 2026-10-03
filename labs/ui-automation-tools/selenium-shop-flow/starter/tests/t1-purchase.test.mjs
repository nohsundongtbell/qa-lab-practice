// t1. 8a(Playwright)와 같은 시나리오를 Selenium 으로 자동화하세요.
//   1) kim@example.com 으로 로그인 → 상품 담기 → 장바구니 결제 금액 확인 → 주문 → 주문 상태 확인
//   2) 비밀번호가 틀리면 오류 메시지가 보이고 로그인되지 않는다
// Selenium 은 자동으로 기다려 주지 않습니다. 요소를 찾기 전에 driver.wait(until…) 로 조건을 기다리세요.
import { By, until } from 'selenium-webdriver'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appUrl, createDriver, PASSWORD } from '../support/driver.mjs'

let driver
// 테스트마다 새 브라우저를 띄운다 — 앞 테스트의 로그인 상태가 남지 않도록.
beforeEach(async () => {
  driver = await createDriver()
})
afterEach(async () => {
  await driver?.quit()
})

describe('QA 숍', () => {
  it('로그인하면 상단에 내 이름이 보인다 (예시)', async () => {
    await driver.get(appUrl('/login'))
    await driver.wait(until.elementLocated(By.xpath('//label[contains(., "이메일")]//input')), 5000)
    await driver.findElement(By.xpath('//label[contains(., "이메일")]//input')).sendKeys('kim@example.com')
    await driver.findElement(By.xpath('//label[contains(., "비밀번호")]//input')).sendKeys(PASSWORD)
    await driver.findElement(By.xpath('//button[normalize-space()="로그인"]')).click()
    const name = await driver.wait(until.elementLocated(By.css('[data-testid="session-name"]')), 5000)
    expect(await name.getText()).toContain('김일반')
  })

  // TODO: 구매 흐름 테스트와 로그인 실패 테스트를 추가하세요.
})
