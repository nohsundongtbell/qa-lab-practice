import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.mjs', 'labs/**/check/*.test.mjs'],
    // 랩 E2E 는 실행 중인 SUT 가 필요하고 오래 걸리므로 `npm run test:labs` 로 따로 돌린다.
    exclude: ['**/node_modules/**', 'scripts/**/*.e2e.test.mjs'],
    testTimeout: 20000,
  },
})
