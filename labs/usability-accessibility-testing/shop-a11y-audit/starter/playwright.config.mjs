// 내 테스트를 직접 돌려 볼 때 쓰는 설정입니다. (npm run check 는 자기 설정을 씁니다)
//   실행:  npx playwright test --config labs/usability-accessibility-testing/shop-a11y-audit/work/playwright.config.mjs
//   결과:  work/results/<화면>.json (t2 분류의 재료)
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.QA_LAB_WEB_URL ?? 'http://127.0.0.1:8080',
    // 접근성 요구사항은 기본 화면(v1) 기준이다 (SPEC §10)
    extraHTTPHeaders: { 'X-QA-Lab-UI-Variant': 'v1' },
  },
})
