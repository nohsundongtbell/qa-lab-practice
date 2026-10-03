import { expect } from '@playwright/test'

/** 로그인 화면. 이름·레이블로 찾고, 끝났다는 "조건"(상단에 내 이름)을 기다린다. */
export class LoginPage {
  constructor(page) {
    this.page = page
    this.email = page.getByLabel('이메일')
    this.password = page.getByLabel('비밀번호')
    this.submit = page.getByRole('button', { name: '로그인' })
    this.alert = page.getByRole('alert')
    this.sessionName = page.getByTestId('session-name')
  }

  async open() {
    await this.page.goto('/#/login')
    await expect(this.submit).toBeVisible() // 앱이 준비되어 폼이 나타날 때까지
  }

  async fill(email, password) {
    await this.email.fill(email)
    await this.password.fill(password)
    await this.submit.click()
  }

  /** 로그인에 성공하고 화면에 내 이름이 나타날 때까지 기다린다. */
  async login(email, password) {
    await this.open()
    await this.fill(email, password)
    await expect(this.sessionName).toBeVisible()
  }
}
