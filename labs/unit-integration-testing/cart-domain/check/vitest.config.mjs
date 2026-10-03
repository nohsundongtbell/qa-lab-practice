import { defineConfig } from 'vitest/config'

// 채점기가 학습자의 테스트를 실행할 때 쓰는 설정 (--root 는 임시 실행 폴더).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    pool: 'forks', // 환경 변수 TZ 가 워커 프로세스에 적용되도록
    testTimeout: 5000,
    setupFiles: process.env.QA_LAB_SETUP ? [process.env.QA_LAB_SETUP] : [],
  },
})
