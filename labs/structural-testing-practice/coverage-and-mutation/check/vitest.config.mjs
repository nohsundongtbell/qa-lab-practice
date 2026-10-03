import { defineConfig } from 'vitest/config'

// 채점기가 학습자의 테스트를 실행할 때 쓰는 설정 (--root 는 임시 실행 폴더).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    pool: 'forks',
    testTimeout: 5000,
    coverage: {
      provider: 'istanbul',
      include: ['src/coupon.mjs', 'src/order-status.mjs'],
      reporter: ['json-summary'],
      reportsDirectory: './coverage',
    },
  },
})
