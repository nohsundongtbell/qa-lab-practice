import { describe, expect, it } from 'vitest'
import { fencedBlocks, findSection, hasText, metaList, sections } from './markdown.mjs'

const doc = `# 제목
- 심각도: S2
- 우선순위 : P1

## 재현 절차
1. 로그인

\`\`\`repro
steps:
  - login: kim@example.com
\`\`\`

## 기대 결과
<!-- 여기에 -->

## 증거
\`\`\`text
## 코드 블록 안의 제목은 무시
\`\`\`
### 하위 제목은 같은 절에 포함
`

describe('sections', () => {
  it('## 단위로 나누고, 코드 블록 안의 ## 와 ### 는 제목으로 보지 않는다', () => {
    const secs = sections(doc)
    expect(secs.map((s) => s.title)).toEqual(['재현 절차', '기대 결과', '증거'])
    expect(findSection(secs, '증거').body).toContain('### 하위 제목')
  })

  it('### 단위도 나눈다', () => {
    expect(sections('### 버그 1: 가\n내용\n### 버그 2: 나\n', 3).map((s) => s.title)).toEqual(['버그 1: 가', '버그 2: 나'])
  })

  it('findSection 은 접두어로도 찾는다', () => {
    expect(findSection(sections('## 버그 1: 제목\nx\n'), '버그 1')).toBeTruthy()
  })
})

describe('hasText', () => {
  it('주석만 있으면 내용이 없는 것', () => {
    expect(hasText('\n<!-- 여기에 -->\n')).toBe(false)
    expect(hasText('실제 내용')).toBe(true)
  })
})

describe('fencedBlocks', () => {
  it('언어가 맞는 블록만 뽑는다', () => {
    const blocks = fencedBlocks(doc, 'repro')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].content).toBe('steps:\n  - login: kim@example.com')
    expect(fencedBlocks(doc, 'text')).toHaveLength(1)
  })
})

describe('metaList', () => {
  it('"- 키: 값" 목록을 읽는다 (전각 콜론·공백 허용, 주석 무시)', () => {
    expect(metaList(doc)).toMatchObject({ 심각도: 'S2', 우선순위: 'P1' })
    expect(metaList('- 시간 상자(분)： 45\n<!-- - 숨김: x -->')).toEqual({ '시간 상자(분)': '45' })
  })
})
