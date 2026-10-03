import { defineConfig } from 'vitest/config'

// 내 테스트를 직접 돌려 볼 때 쓰는 설정입니다. (npm run check 는 이 설정을 쓰지 않습니다)
export default defineConfig({
  test: { include: ['tests/**/*.test.mjs'] },
})
