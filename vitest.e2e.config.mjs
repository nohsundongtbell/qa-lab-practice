import { defineConfig } from 'vitest/config'

// 랩 E2E 전용 설정 (`npm run test:labs`). 랩끼리 같은 SUT·DB 를 쓰므로 파일을 순서대로 실행한다.
export default defineConfig({
  test: {
    include: ['scripts/**/*.e2e.test.mjs'],
    fileParallelism: false,
    testTimeout: 600000,
  },
})
