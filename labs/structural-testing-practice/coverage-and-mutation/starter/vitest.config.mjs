import { defineConfig } from 'vitest/config'

// 내 테스트와 커버리지를 직접 볼 때 쓰는 설정입니다. (npm run check 는 이 설정을 쓰지 않습니다)
// 커버리지: npx vitest run --root <이 폴더> --coverage   →  표(text)와 coverage/index.html(분기별 색 표시)
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    coverage: {
      provider: 'istanbul',
      include: ['src/coupon.mjs', 'src/order-status.mjs'],
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
