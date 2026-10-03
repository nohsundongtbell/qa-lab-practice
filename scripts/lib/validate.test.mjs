import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, makeRepo, validLabReadme, validLabYaml } from '../test-support/fixtures.mjs'
import { repoRoot } from './paths.mjs'
import { formatErrors, validateRepo } from './validate.mjs'

const roots = []
const repo = (files, opts) => {
  const r = makeRepo(files, opts)
  roots.push(r)
  return r
}
afterEach(() => roots.splice(0).forEach(cleanup))
const messages = (root, opts) => validateRepo(root, opts).errors.map((e) => `${e.file}: ${e.message}`).join('\n')

describe('validateRepo — 실제 저장소', () => {
  it('현재 저장소는 검증을 통과한다', () => {
    const { errors } = validateRepo(repoRoot)
    expect(errors, formatErrors(errors)).toEqual([])
  })
})

describe('validateRepo — 임시 저장소', () => {
  it('랩이 없는 최소 저장소는 통과', () => {
    expect(validateRepo(repo({})).errors).toEqual([])
  })

  it('올바른 랩은 통과', () => {
    const r = validateRepo(repo({}, { withLab: true }))
    expect(r.errors).toEqual([])
    expect(r.labCount).toBe(1)
  })

  it('스냅샷이 없으면 slug 를 검증할 수 없으므로 실패한다 (통과시키지 않음)', () => {
    expect(messages(repo({ 'data/qa-lab-modules.snapshot.json': null }))).toMatch(/스냅샷을 읽을 수 없습니다/)
  })

  it('.gitattributes 가 없거나 정책을 어기면 실패', () => {
    expect(messages(repo({ '.gitattributes': null }))).toMatch(/\.gitattributes 가 없습니다/)
    expect(messages(repo({ '.gitattributes': '*.png binary\n' }))).toMatch(/eol=lf/)
  })

  describe('랩 검사', () => {
    const lab = (rel) => `labs/test-design/shop-pricing/${rel}`

    it('lab.yaml 이 없는 랩 폴더', () => {
      expect(messages(repo({ 'labs/test-design/empty/README.md': '# x\n' }))).toMatch(/lab\.yaml 이 없습니다/)
    })

    it('YAML 문법 오류', () => {
      expect(messages(repo({ [lab('lab.yaml')]: 'module: [unclosed\n' }, { withLab: true }))).toMatch(/YAML 을 읽을 수 없습니다/)
    })

    it('스키마·slug 오류는 lab.yaml 경로와 함께 보고', () => {
      const m = messages(repo({ [lab('lab.yaml')]: validLabYaml.replace('boundary-value-analysis', 'nope') }, { withLab: true }))
      expect(m).toMatch(/labs\/test-design\/shop-pricing\/lab\.yaml: lessons: 레슨 "test-design\/nope"/)
    })

    it('폴더 이름이 module 과 다르면 실패', () => {
      const files = {
        'labs/defect-management/shop-pricing/lab.yaml': validLabYaml,
        'labs/defect-management/shop-pricing/README.md': validLabReadme,
        'labs/defect-management/shop-pricing/starter/a': 'x',
        'labs/defect-management/shop-pricing/solution/a': 'x',
        'labs/defect-management/shop-pricing/check/t1.mjs': 'process.exit(0)\n',
        [lab('lab.yaml')]: null,
      }
      expect(messages(repo(files))).toMatch(/폴더 이름\(labs\/defect-management/)
    })

    it('README 가 없거나 필수 절이 빠지면 실패', () => {
      expect(messages(repo({ [lab('README.md')]: null }, { withLab: true }))).toMatch(/README\.md 가 없습니다/)
      expect(messages(repo({ [lab('README.md')]: validLabReadme.replace('## 준비물', '## 도구') }, { withLab: true }))).toMatch(/필수 절이 없습니다: ## 준비물/)
    })

    it('check 파일이 없으면 실패', () => {
      expect(messages(repo({ [lab('check/t1.mjs')]: null }, { withLab: true }))).toMatch(/check 파일이 없습니다: check\/t1\.mjs/)
    })

    it('check 스크립트에 문법 오류가 있으면 실패 (syntaxCheck 끄면 건너뜀)', () => {
      const root = repo({ [lab('check/t1.mjs')]: 'const = ;\n' }, { withLab: true })
      expect(messages(root)).toMatch(/문법 오류/)
      expect(validateRepo(root, { syntaxCheck: false }).errors).toEqual([])
    })

    it('planned 가 아닌데 starter/solution/check 가 없으면 실패, planned 는 허용', () => {
      const root = repo({}, { withLab: true })
      fs.rmSync(path.join(root, lab('starter')), { recursive: true })
      expect(messages(root)).toMatch(/starter\/ 폴더가 없습니다/)
      fs.writeFileSync(path.join(root, lab('lab.yaml')), validLabYaml.replace('status: beta', 'status: planned'))
      expect(validateRepo(root).errors.filter((e) => /폴더가 없습니다/.test(e.message))).toEqual([])
    })

    it('setup 파일이 없거나 문법이 틀리면 실패', () => {
      const yaml = validLabYaml + 'setup: setup/seed.mjs\n'
      expect(messages(repo({ [lab('lab.yaml')]: yaml }, { withLab: true }))).toMatch(/setup 파일이 없습니다: setup\/seed\.mjs/)
      expect(messages(repo({ [lab('lab.yaml')]: yaml, [lab('setup/seed.mjs')]: 'const = ;\n' }, { withLab: true }))).toMatch(/setup\/seed\.mjs: 문법 오류/)
      expect(validateRepo(repo({ [lab('lab.yaml')]: yaml, [lab('setup/seed.mjs')]: 'process.exit(0)\n' }, { withLab: true })).errors).toEqual([])
    })

    it('.sh 만 있고 .ps1 이 없으면 실패 (두 OS 쌍 규칙)', () => {
      const yaml = validLabYaml.replace('check: check/t1.mjs', 'check: { unix: check/t1.sh, windows: check/t1.ps1 }')
      const m = messages(repo({ [lab('lab.yaml')]: yaml, [lab('check/t1.sh')]: 'exit 0\n', [lab('check/t1.mjs')]: null }, { withLab: true }))
      expect(m).toMatch(/쌍이 되는 파일이 없습니다: labs\/test-design\/shop-pricing\/check\/t1\.ps1/)
      expect(m).toMatch(/check 파일이 없습니다: check\/t1\.ps1/)
    })
  })

  it('문서의 OS 블록 쌍 누락을 잡는다', () => {
    const md = 'macOS / Linux (터미널)\n\n```bash\nls\n```\n'
    expect(messages(repo({ 'docs/guide.md': md }))).toMatch(/docs\/guide\.md: 1번째 줄/)
  })

  it('README 가 정답표를 링크하면 실패', () => {
    expect(messages(repo({ 'README.md': '[정답](defects/ANSWERS.md)\n' }))).toMatch(/정답표\/결함 카탈로그로 링크/)
  })

  it('한글 파일 이름·package.json 셸 문법을 잡는다', () => {
    const m = messages(repo({ 'docs/가이드.md': '# x\n', 'package.json': JSON.stringify({ scripts: { up: 'docker compose up && echo' } }) }))
    expect(m).toMatch(/ASCII/)
    expect(m).toMatch(/&&/)
  })
})

describe('formatErrors', () => {
  it('파일별로 묶는다', () => {
    expect(formatErrors([{ file: 'a', message: '1' }, { file: 'b', message: '2' }, { file: 'a', message: '3' }])).toBe('a\n  - 1\n  - 3\nb\n  - 2')
  })
})
