import { defineConfig } from 'vitest/config'

// 채점기가 학습자의 계약 테스트를 실행할 때 쓰는 설정 (--root 는 임시 실행 폴더).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    testTimeout: 15_000,
    fileParallelism: false, // 한 앱의 같은 DB 를 쓰므로 파일을 순서대로 실행
  },
})
