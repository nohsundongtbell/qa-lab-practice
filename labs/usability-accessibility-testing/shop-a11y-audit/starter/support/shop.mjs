// 스캔 테스트용 도우미. 읽기만 하세요 — 채점기는 항상 이 파일의 원본으로 실행합니다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'
import { API_URL, PASSWORD } from './env.mjs'

/** 로그인하고, 상단에 내 이름이 보일 때까지 기다린다. */
export async function login(page, email = 'kim@example.com') {
  await page.goto('/#/login')
  await page.getByLabel('이메일').fill(email)
  await page.getByLabel('비밀번호').fill(PASSWORD)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByTestId('session-name')).toBeVisible()
}

/** 결제 전(PENDING) 주문을 fixture API 로 만들고 주문 번호를 돌려준다. 주문 상세 화면은 #/orders/<번호> 로 연다. */
export async function createPendingOrder(request, email = 'kim@example.com') {
  const res = await request.post(`${API_URL}/__admin/fixtures/orders`, { data: { email, status: 'PENDING', items: [{ productId: 1, qty: 1 }] } })
  expect(res.status()).toBe(201)
  return (await res.json()).id
}

const RESULTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'results')

/**
 * axe 결과를 results/<name>.json 에 저장한다 (t2 분류의 재료). 위반(violations)과 판정 보류(incomplete)만 줄여서 남긴다.
 * @param {string} name 화면 이름 (signup, login, products, cart, orders, order-detail)
 * @param {{ violations: object[], incomplete: object[] }} results AxeBuilder.analyze() 의 결과
 */
export function saveResults(name, results) {
  const brief = (list) => list.map((r) => ({ rule: r.id, impact: r.impact, help: r.help, targets: r.nodes.map((n) => n.target.join(' ')) }))
  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  fs.writeFileSync(path.join(RESULTS_DIR, `${name}.json`), `${JSON.stringify({ page: name, violations: brief(results.violations), incomplete: brief(results.incomplete) }, null, 2)}\n`)
}
