// t3 에서 쓰는 페이지 객체 뼈대. 화면 하나를 클래스 하나로 감싸, 로케이터와 동작을 한곳에 모읍니다.
export class LoginPage {
  constructor(page) {
    this.page = page
  }

  async open() {
    await this.page.goto('/#/login')
  }

  // TODO: login(email, password) 를 만들고, 로그인이 끝났음을 "조건"으로 기다리세요.
}
