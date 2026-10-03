import { By, until } from 'selenium-webdriver'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appUrl, createDriver, PASSWORD } from '../support/driver.mjs'

const WAIT = 8000
let driver

// 테스트마다 새 브라우저를 띄운다 — 앞 테스트의 로그인 상태가 남지 않도록.
beforeEach(async () => {
  driver = await createDriver()
})
afterEach(async () => {
  await driver?.quit()
})

/** 요소가 DOM 에 생기고 화면에 보일 때까지 기다린 뒤 돌려준다. Selenium 은 자동으로 기다려 주지 않는다. */
async function visible(locator) {
  const el = await driver.wait(until.elementLocated(locator), WAIT)
  await driver.wait(until.elementIsVisible(el), WAIT)
  return el
}

/** 레이블 글자로 입력창 찾기 (두 화면 변형 모두에서 같다) */
const field = (label) => By.xpath(`//label[contains(., "${label}")]//input`)
const button = (name) => By.xpath(`//button[normalize-space()="${name}"]`)
const testId = (id) => By.css(`[data-testid="${id}"]`)

async function login(email, password) {
  await driver.get(appUrl('/login'))
  await (await visible(field('이메일'))).sendKeys(email)
  await (await visible(field('비밀번호'))).sendKeys(password)
  await (await visible(button('로그인'))).click()
}

/** 텍스트가 기대와 같아질 때까지 기다린다 (요소를 한 번 읽고 끝내지 않는다 — 화면이 다시 그려지면 값이 바뀐다). */
async function textBecomes(locator, expected) {
  await driver.wait(async () => {
    try {
      return (await driver.findElement(locator).getText()) === expected
    } catch {
      return false // 아직 없거나 다시 그려지는 중
    }
  }, WAIT, `${expected} 가 나타나지 않았습니다`)
}

describe('QA 숍 구매 시나리오', () => {
  it('로그인 → 담기 → 금액 확인 → 주문하면 결제 대기 상태가 된다', async () => {
    await login('kim@example.com', PASSWORD)
    expect(await (await visible(testId('session-name'))).getText()).toContain('김일반')

    await (await visible(By.css('input[aria-label="무선 키보드 수량"]'))).clear()
    await driver.findElement(By.css('input[aria-label="무선 키보드 수량"]')).sendKeys('2')
    await (await visible(By.css('button[aria-label="무선 키보드 장바구니에 담기"]'))).click()
    await driver.wait(until.elementLocated(By.xpath('//*[@role="status"][contains(., "담았습니다")]')), WAIT)

    await (await visible(By.xpath('//nav//a[normalize-space()="장바구니"]'))).click()
    // 50,000원 × 2 = 100,000원. 등급 할인·쿠폰 없음, 배송비 무료 (SPEC §3·§5)
    await textBecomes(testId('cart-total'), '100,000원')
    expect(await driver.findElement(testId('cart-total')).getText()).toBe('100,000원')

    await (await visible(button('주문하기'))).click()
    await driver.wait(until.elementLocated(testId('order-status')), WAIT)
    await textBecomes(testId('order-status'), '결제 대기')
    expect(await driver.findElement(testId('order-status')).getText()).toBe('결제 대기')
  })

  it('비밀번호가 틀리면 오류 메시지가 보이고 로그인되지 않는다', async () => {
    await login('kim@example.com', 'wrong-password')
    await driver.wait(async () => (await driver.findElement(By.css('[role="alert"]')).getText()) !== '', WAIT)
    expect(await driver.findElement(By.css('[role="alert"]')).getText()).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    expect(await driver.findElements(testId('session-name'))).toHaveLength(0)
  })
})
