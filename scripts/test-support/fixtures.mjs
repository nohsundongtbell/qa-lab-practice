import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** 테스트용 작은 QA-Lab 스냅샷 (실제 slug 와 같은 이름을 일부 쓴다). */
export const snapshotFixture = {
  _notice: 'fixture',
  meta: {
    source: 'fixture@0', generatedAt: '2026-01-01', siteBaseUrl: 'https://qa-lab.pages.dev',
    counts: { moduleRecords: 4, lessons: 4 },
    excludeFromLabs: { comingSoon: ['m59'], untrackedInSource: ['m55'] },
  },
  stages: [{ id: 's1', slug: 'stage-one', order: 1 }],
  modules: [
    {
      id: 'm03', slug: 'test-design', stage: 's1', order: 1, level: '중급', status: 'published', prerequisites: [], url: '/module/test-design/',
      lessons: [
        { id: 's1-m03-l01', slug: 'boundary-value-analysis', order: 1, url: '/lesson/test-design/boundary-value-analysis/' },
        { id: 's1-m03-l02', slug: 'state-transition-decision-table', order: 2, url: '/lesson/test-design/state-transition-decision-table/' },
      ],
    },
    {
      id: 'm06', slug: 'defect-management', stage: 's1', order: 2, level: '입문', status: 'published', prerequisites: [], url: '/module/defect-management/',
      lessons: [{ id: 's1-m06-l01', slug: 'writing-good-defect-reports', order: 1, url: '/lesson/defect-management/writing-good-defect-reports/' }],
    },
    { id: 'm59', slug: 'testops', stage: 's1', order: 3, level: '고급', status: 'coming-soon', prerequisites: [], url: '/module/testops/', lessons: [] },
    {
      id: 'm55', slug: 'automation-architecture', stage: 's1', order: 4, level: '고급', status: 'published', prerequisites: [], url: '/module/automation-architecture/',
      lessons: [{ id: 's1-m55-l01', slug: 'layers', order: 1, url: '/lesson/automation-architecture/layers/' }],
    },
  ],
}

export const validLabYaml = `module: test-design
lessons: [boundary-value-analysis]
title_ko: 배송비 규칙 테스트 설계
level: beginner
est_minutes: 60
requires: [docker, node24]
platforms: [macos, windows, linux]
sut_profile: beginner
tasks:
  - id: t1
    goal: 경계값 분석으로 배송비 케이스를 설계한다
    check: check/t1.mjs
    pass: { min_defects: 2 }
status: beta
`

export const validLabReadme = `# 배송비 규칙 테스트 설계

## 목표
경계값 분석으로 케이스를 설계한다.

## 선수 모듈
- [테스트 설계](https://qa-lab.pages.dev/lesson/test-design/boundary-value-analysis/)

## 소요 시간
약 60분

## 준비물
macOS / Linux (터미널)

\`\`\`bash
npm run up -- --profile beginner
\`\`\`

Windows (PowerShell)

\`\`\`powershell
npm run up -- --profile beginner
\`\`\`

## 과제
t1

## 완료 기준
- [ ] t1

## 막혔을 때
<details><summary>힌트 1</summary>방향</details>
<details><summary>힌트 2</summary>구체</details>

## 다음 랩
- 없음
`

export const validGitattributes = '* text=auto eol=lf\n*.ps1 text eol=crlf\n'

/** 임시 저장소를 만들고 경로를 돌려준다. files 는 { 상대경로: 내용 }. */
export function makeRepo(files = {}, { withLab = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-lab-test-'))
  const all = {
    '.gitattributes': validGitattributes,
    'data/qa-lab-modules.snapshot.json': JSON.stringify(snapshotFixture, null, 2),
    ...(withLab
      ? {
          'labs/test-design/shop-pricing/lab.yaml': validLabYaml,
          'labs/test-design/shop-pricing/README.md': validLabReadme,
          'labs/test-design/shop-pricing/starter/a.txt': 'start\n',
          'labs/test-design/shop-pricing/solution/a.txt': 'solution\n',
          'labs/test-design/shop-pricing/check/t1.mjs': 'process.exit(0)\n',
        }
      : {}),
    ...files,
  }
  for (const [rel, content] of Object.entries(all)) {
    if (content === null) continue
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content)
  }
  return root
}

export const cleanup = (root) => fs.rmSync(root, { recursive: true, force: true })
