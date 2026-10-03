import { expect } from '@playwright/test'

export class CartPage {
  constructor(page) {
    this.page = page
    this.total = page.getByTestId('cart-total')
    this.rows = page.getByTestId('cart-row')
  }

  async open() {
    await this.page.getByRole('link', { name: '장바구니' }).click()
    await expect(this.page.getByRole('heading', { name: '장바구니' })).toBeVisible()
  }

  async order() {
    await this.page.getByRole('button', { name: '주문하기' }).click()
  }
}
