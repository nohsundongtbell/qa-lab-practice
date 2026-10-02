import { describe, expect, it } from 'vitest'
import { snapshotFixture, validLabReadme } from '../test-support/fixtures.mjs'
import { checkLabReadme, checkOsBlocks, extractLinks } from './readme-check.mjs'

const MAC = 'macOS / Linux (터미널)'
const WIN = 'Windows (PowerShell)'
const pair = (mac = 'ls', win = 'dir') => `${MAC}\n\n\`\`\`bash\n${mac}\n\`\`\`\n\n${WIN}\n\n\`\`\`powershell\n${win}\n\`\`\`\n`

describe('checkOsBlocks', () => {
  it('두 블록이 쌍으로 있으면 통과', () => {
    expect(checkOsBlocks(pair())).toEqual([])
  })

  it('표지 없는 "공통" 코드 블록은 검사하지 않는다', () => {
    expect(checkOsBlocks('공통\n\n```bash\nnpm run up\n```\n')).toEqual([])
  })

  it('Windows 블록이 없으면 실패', () => {
    const issues = checkOsBlocks(`${MAC}\n\n\`\`\`bash\nls\n\`\`\`\n`)
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toMatch(/Windows \(PowerShell\)" 블록이 없습니다/)
  })

  it('macOS 블록 없이 Windows 블록만 있으면 실패', () => {
    expect(checkOsBlocks(`${WIN}\n\n\`\`\`powershell\ndir\n\`\`\`\n`)[0].message).toMatch(/앞에/)
  })

  it('한쪽이 비어 있으면 실패 (주석·빈 줄만 있는 경우 포함)', () => {
    expect(checkOsBlocks(pair('ls', '')).map((i) => i.message).join()).toMatch(/비어 있습니다/)
    expect(checkOsBlocks(pair('ls', '# 나중에\n\n')).map((i) => i.message).join()).toMatch(/비어 있습니다/)
  })

  it('표지 뒤에 코드 블록이 아닌 글이 오면 실패', () => {
    expect(checkOsBlocks(`${MAC}\n\n설명입니다\n`)[0].message).toMatch(/바로 뒤에/)
  })

  it('표지만 있고 끝나면 실패', () => {
    expect(checkOsBlocks(MAC)[0].message).toMatch(/코드 블록이 없습니다/)
  })

  it('코드 블록 안에 표지와 같은 줄이 있어도 표지로 보지 않는다', () => {
    expect(checkOsBlocks(`\`\`\`text\n${MAC}\n\`\`\`\n`)).toEqual([])
  })

  it('쌍이 여러 개여도 각각 검사한다', () => {
    expect(checkOsBlocks(`${pair()}\n${pair()}`)).toEqual([])
    expect(checkOsBlocks(`${pair()}\n${MAC}\n\n\`\`\`bash\nls\n\`\`\`\n`)).toHaveLength(1)
  })

  it('CRLF 줄바꿈 문서도 읽는다', () => {
    expect(checkOsBlocks(pair().replace(/\n/g, '\r\n'))).toEqual([])
  })
})

describe('extractLinks', () => {
  it('마크다운 링크와 자동 링크를 뽑는다', () => {
    expect(extractLinks('[a](https://x.test/a/) 와 <https://y.test/b> 와 [c](rel.md "제목")')).toEqual(['https://x.test/a/', 'rel.md', 'https://y.test/b'])
  })
})

describe('checkLabReadme', () => {
  const lab = { module: 'test-design', lessons: ['boundary-value-analysis'] }
  const check = (md, l = lab) => checkLabReadme(md, l, snapshotFixture)

  it('올바른 README 는 통과', () => {
    expect(check(validLabReadme)).toEqual([])
  })

  it('필수 절이 빠지면 실패', () => {
    const issues = check(validLabReadme.replace('## 완료 기준', '## 끝'))
    expect(issues).toContain('필수 절이 없습니다: ## 완료 기준')
  })

  it('힌트 단계가 없으면 실패', () => {
    expect(check(validLabReadme.replace('힌트 2', '힌트')).join()).toMatch(/힌트 1 → 힌트 2/)
  })

  it('연결한 레슨 링크가 없으면 실패', () => {
    expect(check(validLabReadme.replace('/lesson/test-design/boundary-value-analysis/', '/module/test-design/')).join()).toMatch(/레슨 링크가 없습니다/)
  })

  it('QA-Lab 링크의 앵커(#)는 실패', () => {
    const md = validLabReadme.replace('## 다음 랩\n- 없음', '## 다음 랩\n- [x](https://qa-lab.pages.dev/lesson/test-design/boundary-value-analysis/#개념)')
    expect(check(md).join()).toMatch(/앵커/)
  })

  it('also_for 의 레슨도 링크해야 한다', () => {
    const l = { ...lab, also_for: [{ module: 'defect-management', lessons: ['writing-good-defect-reports'] }] }
    expect(check(validLabReadme, l).join()).toMatch(/writing-good-defect-reports/)
  })

  it('OS 블록 쌍 오류도 함께 보고한다', () => {
    expect(check(validLabReadme.replace(/Windows \(PowerShell\)\n\n```powershell\n[^`]*```\n/, '')).join()).toMatch(/Windows/)
  })
})
