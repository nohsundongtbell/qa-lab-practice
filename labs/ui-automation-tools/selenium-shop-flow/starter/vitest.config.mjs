import { defineConfig } from 'vitest/config'

// 내 테스트를 직접 돌려 볼 때 쓰는 설정입니다. (npm run check 는 자기 설정을 씁니다)
export default defineConfig({
  test: { include: ['tests/**/*.test.mjs'], testTimeout: 60_000, hookTimeout: 60_000, fileParallelism: false },
})
