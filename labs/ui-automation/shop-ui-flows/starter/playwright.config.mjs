// 내 테스트를 직접 돌려 볼 때 쓰는 설정입니다. (npm run check 는 자기 설정을 씁니다)
//   실행:  npx playwright test --config labs/ui-automation/shop-ui-flows/work/playwright.config.mjs
//   화면 변형을 바꿔 보려면 UI_VARIANT=v2, 지연은 LATENCY=unstable 환경 변수로 지정하세요.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.QA_LAB_WEB_URL ?? 'http://127.0.0.1:8080',
    extraHTTPHeaders: {
      'X-QA-Lab-UI-Variant': process.env.UI_VARIANT ?? 'v1',
      'X-QA-Lab-Latency': process.env.LATENCY ?? 'none',
    },
  },
})
