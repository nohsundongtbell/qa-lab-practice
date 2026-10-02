import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 통합 테스트는 하나의 DB를 공유하므로 파일 단위 병렬 실행을 끈다.
    fileParallelism: false,
    testTimeout: 20000,
  },
})
