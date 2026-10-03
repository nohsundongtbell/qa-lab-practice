// Selenium 공통 도구. 읽기만 하세요 — 채점기는 항상 이 파일의 원본으로 실행합니다.
//   createDriver()   헤드리스 Chrome 을 띄운다. 채점 조건(화면 변형·응답 지연·결함 집합)을 요청 헤더로 넣어 준다
//   appUrl(hash)     앱 주소 (예: appUrl('/login') → http://127.0.0.1:8080/#/login)
//   PASSWORD         시드 계정 공통 비밀번호
//
// Selenium 에는 Playwright 의 extraHTTPHeaders 가 없어서, Chrome DevTools Protocol 로 헤더를 넣습니다.
import { Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

const WEB_URL = process.env.QA_LAB_WEB_URL ?? 'http://127.0.0.1:8080'
export const PASSWORD = 'qa-lab-1234'

export const appUrl = (hash = '/products') => `${WEB_URL}/#${hash}`

export async function createDriver() {
  const options = new chrome.Options().addArguments('--headless=new', '--window-size=1280,900')
  // 아래 환경 변수는 개발 환경에서 브라우저·드라이버 버전이 안 맞을 때 쓰는 진단용입니다. 보통은 필요 없습니다.
  if (process.env.QA_LAB_CHROME_PATH) options.setChromeBinaryPath(process.env.QA_LAB_CHROME_PATH)
  if (process.env.QA_LAB_NO_SANDBOX === '1') options.addArguments('--no-sandbox')
  const builder = new Builder().forBrowser('chrome').setChromeOptions(options)
  if (process.env.QA_LAB_DRIVER_PATH || process.env.QA_LAB_DRIVER_ARGS) {
    const service = new chrome.ServiceBuilder(process.env.QA_LAB_DRIVER_PATH || undefined)
    if (process.env.QA_LAB_DRIVER_ARGS) service.addArguments(...process.env.QA_LAB_DRIVER_ARGS.split(' '))
    builder.setChromeService(service)
  }
  const driver = await builder.build()
  await driver.sendDevToolsCommand('Network.enable')
  const headers = {
    'X-QA-Lab-UI-Variant': process.env.QA_LAB_UI_VARIANT ?? 'v1',
    'X-QA-Lab-Latency': process.env.QA_LAB_LATENCY ?? 'none',
  }
  // 채점기는 QA_LAB_DEFECTS=none 으로 앱의 결함 프로필과 무관하게 같은 조건을 만든다. 직접 실행할 때는 앱의 프로필을 따른다.
  if (process.env.QA_LAB_DEFECTS !== undefined) headers['X-QA-Lab-Defects'] = process.env.QA_LAB_DEFECTS
  await driver.sendDevToolsCommand('Network.setExtraHTTPHeaders', { headers })
  return driver
}
