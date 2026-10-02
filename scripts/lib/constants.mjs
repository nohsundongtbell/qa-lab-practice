export const PROFILES = ['none', 'beginner', 'intermediate', 'advanced']
export const LEVELS = { beginner: '입문', intermediate: '중급', advanced: '고급' }
export const STATUSES = ['planned', 'beta', 'ready']
export const PLATFORMS = ['macos', 'windows', 'linux']

export const REPO_URL = 'https://github.com/nohsundongtbell/qa-lab-practice'
export const REPO_REF = 'main'
export const SITE_BASE = 'https://qa-lab.pages.dev'
export const INDEX_SCHEMA_VERSION = 1

export const OS_LABEL_UNIX = 'macOS / Linux (터미널)'
export const OS_LABEL_WINDOWS = 'Windows (PowerShell)'

/** 랩 README 에 반드시 있어야 하는 절 (templates/LAB_README.md 와 같은 순서) */
export const LAB_README_SECTIONS = [
  '## 목표',
  '## 선수 모듈',
  '## 소요 시간',
  '## 준비물',
  '## 과제',
  '## 완료 기준',
  '## 막혔을 때',
  '## 다음 랩',
]

export const MIN_NODE = { major: 22, minor: 12 }
export const ENV_PORT_KEYS = { WEB_PORT: 8080, API_PORT: 3000, DB_PORT: 55432 }
