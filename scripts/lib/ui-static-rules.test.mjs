import { describe, expect, it } from 'vitest'
import { countExpects, findFixedSleeps, stripComments, usesFixtureApi, usesPageObject } from './ui-static-rules.mjs'

describe('stripComments', () => {
  it('줄·블록 주석은 지우고 URL 의 // 는 남긴다', () => {
    const out = stripComments("const a = 'http://x' // sleep(1)\n/* waitForTimeout(5) */ const b = 1")
    expect(out).toContain("'http://x'")
    expect(out).not.toContain('sleep')
    expect(out).not.toContain('waitForTimeout')
  })
})

describe('규칙', () => {
  it('expect 개수 — 주석 속 expect 는 세지 않는다', () => {
    expect(countExpects("expect(a).toBe(1)\nawait expect(b).toHaveText('x')\n// expect(c)")).toBe(2)
    expect(countExpects('const expected = 1')).toBe(0)
  })

  it('고정 대기: waitForTimeout · setTimeout · sleep 을 찾는다', () => {
    expect(findFixedSleeps('await page.waitForTimeout(500)')).toEqual(['waitForTimeout'])
    expect(findFixedSleeps('await new Promise((r) => setTimeout(r, 1000))')).toEqual(['setTimeout'])
    expect(findFixedSleeps('await sleep(10)')).toEqual(['sleep'])
    expect(findFixedSleeps('// waitForTimeout(1)\nawait expect(x).toBeVisible()')).toEqual([])
    expect(findFixedSleeps('const sleeper = 1')).toEqual([])
  })

  it('fixture API 사용', () => {
    expect(usesFixtureApi("await request.post(`${API}/__admin/fixtures/orders`, {})")).toBe(true)
    expect(usesFixtureApi("// '/__admin/fixtures/orders'")).toBe(false)
  })

  it('페이지 객체: pages/ 의 클래스를 가져와야 한다', () => {
    const pages = { 'ProductsPage.mjs': 'export class ProductsPage {}', 'helpers.mjs': 'export const x = 1' }
    expect(usesPageObject(["import { ProductsPage } from '../pages/ProductsPage.mjs'"], pages)).toBe(true)
    expect(usesPageObject(["import { x } from '../pages/helpers.mjs'"], pages)).toBe(false) // 클래스가 아님
    expect(usesPageObject(["import { y } from './other.mjs'"], pages)).toBe(false)
    expect(usesPageObject(["// import { ProductsPage } from '../pages/ProductsPage.mjs'"], pages)).toBe(false)
    expect(usesPageObject([], pages)).toBe(false)
  })
})
