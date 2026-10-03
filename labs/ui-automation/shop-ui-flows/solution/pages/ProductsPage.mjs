import { expect } from '@playwright/test'

export class ProductsPage {
  constructor(page) {
    this.page = page
    this.status = page.getByRole('status').filter({ hasText: '담았습니다' })
  }

  /** 새로 열면 회원 정보를 다시 읽어 오므로, 내 이름이 보일 때까지 기다린 뒤에 동작한다. */
  async open() {
    await this.page.goto('/#/products')
    await expect(this.page.getByTestId('session-name')).toBeVisible()
    await expect(this.page.getByTestId('product-card').first()).toBeVisible()
  }

  async addToCart(productName, qty) {
    if (qty !== undefined) await this.page.getByRole('spinbutton', { name: `${productName} 수량` }).fill(String(qty))
    await this.page.getByRole('button', { name: `${productName} 장바구니에 담기` }).click()
    await expect(this.status).toContainText(productName)
  }
}
