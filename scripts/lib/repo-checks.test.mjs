import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, makeRepo, snapshotFixture } from '../test-support/fixtures.mjs'
import {
  checkDefects, checkFilenames, checkGitattributes, checkLineEndings, checkPackageScripts, checkRelativeLinks, checkShPs1Pairs,
  checkSpoilerLinks, walkFiles,
} from './repo-checks.mjs'

const roots = []
const repo = (files, opts) => {
  const r = makeRepo(files, opts)
  roots.push(r)
  return r
}
afterEach(() => roots.splice(0).forEach(cleanup))

describe('checkPackageScripts', () => {
  const scripts = (s, isRoot = false) => checkPackageScripts({ scripts: s }, { file: 'package.json', isRoot }).map((i) => i.message)

  it('셸 의존 문법을 잡는다', () => {
    expect(scripts({ a: 'tsc && vite build' }).join()).toMatch(/&&/)
    expect(scripts({ a: 'rm -rf dist' }).join()).toMatch(/셸 명령/)
    expect(scripts({ a: 'cp a b' }).join()).toMatch(/셸 명령/)
    expect(scripts({ a: 'NODE_ENV=test vitest' }).join()).toMatch(/VAR=값/)
    expect(scripts({ a: 'node a.js | tee log' }).join()).toMatch(/파이프/)
    expect(scripts({ a: 'export A=1' }).join()).toMatch(/셸 명령/)
  })

  it('일반 도구 호출은 통과', () => {
    expect(scripts({ build: 'tsc -p tsconfig.build.json', test: 'vitest run test/unit', start: 'node dist/server.js' })).toEqual([])
  })

  it('루트 스크립트는 node scripts/cli.mjs <명령> 한 줄이어야 한다 (test 예외)', () => {
    expect(scripts({ up: 'node scripts/cli.mjs up', test: 'vitest run' }, true)).toEqual([])
    expect(scripts({ up: 'docker compose up' }, true).join()).toMatch(/한 줄/)
    expect(scripts({ up: 'node scripts/cli.mjs up --profile x' }, true).join()).toMatch(/한 줄/)
  })

  it('저장소의 실제 package.json 들이 규칙을 지킨다', () => {
    const root = path.resolve(import.meta.dirname, '..', '..')
    for (const f of ['package.json', 'apps/shop/api/package.json', 'apps/shop/web/package.json']) {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'))
      expect(checkPackageScripts(pkg, { file: f, isRoot: f === 'package.json' }), f).toEqual([])
    }
  })
})

describe('checkGitattributes', () => {
  it('LF 기본 + ps1 CRLF 정책을 요구한다', () => {
    expect(checkGitattributes('* text=auto eol=lf\n*.ps1 text eol=crlf\n')).toEqual([])
    expect(checkGitattributes('# 주석만\n')).toHaveLength(2)
    expect(checkGitattributes('* text=auto eol=lf\n')).toHaveLength(1)
  })
})

describe('checkFilenames', () => {
  it('한글 이름, 대소문자 충돌, 긴 경로를 잡는다', () => {
    const issues = checkFilenames(['docs/한글.md', 'a/Readme.md', 'a/README.md', `x/${'d'.repeat(130)}.md`, 'ok/fine.md'])
    expect(issues.map((i) => i.file)).toEqual(['docs/한글.md', 'a/README.md', `x/${'d'.repeat(130)}.md`])
  })
})

describe('checkLineEndings', () => {
  it('sh·yaml·Dockerfile 의 CRLF 만 잡는다 (md 는 허용)', () => {
    const root = repo({ 'a.sh': 'echo\r\n', 'b.yaml': 'a: 1\n', 'c/Dockerfile': 'FROM x\r\n', 'd.md': 'x\r\n', 'e.ps1': 'x\r\n' })
    expect(checkLineEndings(root, walkFiles(root)).map((i) => i.file).sort()).toEqual(['a.sh', 'c/Dockerfile'])
  })
})

describe('checkShPs1Pairs', () => {
  it('check 폴더의 .sh 와 .ps1 은 쌍이어야 한다', () => {
    const files = ['labs/m/l/check/a.sh', 'labs/m/l/check/a.ps1', 'labs/m/l/check/b.sh', 'labs/m/l/check/c.ps1', 'scripts/x.sh']
    expect(checkShPs1Pairs(files).map((i) => i.file)).toEqual(['labs/m/l/check/b.sh', 'labs/m/l/check/c.ps1'])
  })
})

describe('checkSpoilerLinks', () => {
  it('정답표·카탈로그로 가는 링크를 잡는다 (글자만 언급하는 건 허용)', () => {
    const root = repo({
      'README.md': '[정답](defects/ANSWERS.md) 와 [카탈로그](./defects/catalog.yaml#x)',
      'docs/ok.md': '`defects/ANSWERS.md` 는 링크하지 않는다',
      'defects/README.md': '[정답](ANSWERS.md)',
    })
    const issues = checkSpoilerLinks(root, walkFiles(root))
    expect(issues.map((i) => i.file)).toEqual(['README.md', 'README.md'])
  })
})

describe('checkDefects', () => {
  const entry = (id, extra = '') => `  - id: ${id}\n    type: boundary\n    severity: S3\n    surface: api\n    modules: [test-design]\n    location: src/x.ts\n    spec: SPEC §1\n    repro:\n      steps:\n        - http: { path: /a }\n${extra}`
  const answers = (ids) => ids.map((id) => `| ${id} | 경계값 | S3 | 증상 | 기대 |`).join('\n')
  const profiles = (map) =>
    Object.fromEntries(['none', 'beginner', 'intermediate', 'advanced'].map((p) => [`defects/profiles/${p}.yaml`, `profile: ${p}\ndefects: [${(map[p] ?? []).join(', ')}]\n`]))
  const files = (ids, { ans = ids, prof = { beginner: ids }, extra = {} } = {}) => ({
    'src/x.ts': '// x\n',
    'defects/catalog.yaml': `defects:\n${ids.map((i) => entry(i)).join('')}`,
    'defects/ANSWERS.md': answers(ans),
    ...profiles(prof),
    ...extra,
  })
  const run = (f) => checkDefects(repo(f), snapshotFixture).map((i) => i.message)

  it('올바른 카탈로그는 통과', () => {
    expect(run(files(['DF-001', 'DF-002']))).toEqual([])
  })

  it('카탈로그가 없으면 검사하지 않는다', () => {
    expect(checkDefects(repo({}), snapshotFixture)).toEqual([])
  })

  it('정답표 누락·과잉을 잡는다', () => {
    expect(run(files(['DF-001', 'DF-002'], { ans: ['DF-001'] })).join()).toMatch(/정답표에 DF-002 가 없습니다/)
    expect(run(files(['DF-001'], { ans: ['DF-001', 'DF-009'] })).join()).toMatch(/카탈로그에 없는 결함이 정답표에 있습니다: DF-009/)
  })

  it('QA-Lab 에 없는 모듈 slug 를 잡는다', () => {
    const f = files(['DF-001'])
    f['defects/catalog.yaml'] = f['defects/catalog.yaml'].replace('[test-design]', '[no-such-module]')
    expect(run(f).join()).toMatch(/no-such-module/)
  })

  it('ID 형식·중복·필수 필드를 잡는다', () => {
    expect(run(files(['DF-1'])).join()).toMatch(/형식/)
    const dup = files(['DF-001'])
    dup['defects/catalog.yaml'] += entry('DF-001')
    expect(run(dup).join()).toMatch(/중복/)
    const missing = files(['DF-001'])
    missing['defects/catalog.yaml'] = missing['defects/catalog.yaml'].replace('    severity: S3\n', '')
    expect(run(missing).join()).toMatch(/severity/)
  })

  it('프로필 등록 누락·중복·유령 ID 를 잡는다', () => {
    expect(run(files(['DF-001'], { prof: {} })).join()).toMatch(/어떤 프로필에도 등록되어 있지 않습니다/)
    expect(run(files(['DF-001'], { prof: { beginner: ['DF-001'], advanced: ['DF-001'] } })).join()).toMatch(/에도 등록되어 있습니다/)
    expect(run(files(['DF-001'], { prof: { beginner: ['DF-001', 'DF-777'] } })).join()).toMatch(/DF-777/)
  })

  it('location 파일이 없으면 잡는다', () => {
    const f = files(['DF-001'])
    delete f['src/x.ts']
    f['src/x.ts'] = null
    expect(run(f).join()).toMatch(/location 파일이 없습니다/)
  })
})

describe('walkFiles', () => {
  it('빌드 산출물·실행 폴더는 건너뛰고, 랩 안의 reports/ 같은 일반 폴더는 검사한다', () => {
    const root = repo({
      'node_modules/x/index.js': '',
      'labs/m/l/.runs/a/b.mjs': '',
      'labs/m/l/work/a.txt': '',
      'labs/m/l/starter/reports/_TEMPLATE.md': '',
    })
    expect(walkFiles(root)).toEqual(['.gitattributes', 'data/qa-lab-modules.snapshot.json', 'labs/m/l/starter/reports/_TEMPLATE.md'])
  })
})

describe('checkRelativeLinks', () => {
  const run = (files) => {
    const root = repo(files)
    return checkRelativeLinks(root, walkFiles(root)).map((i) => `${i.file}: ${i.message}`)
  }

  it('없는 파일·폴더로 가는 상대 링크를 잡는다', () => {
    const issues = run({ 'docs/a.md': '[없음](./nope.md) [있음](b.md) [폴더](../labs/) [앵커](#x)', 'docs/b.md': '', 'labs/.keep': '' })
    expect(issues).toEqual(['docs/a.md: 깨진 상대 링크입니다: ./nope.md'])
  })

  it('외부 링크, 절대 경로, 앵커는 검사하지 않는다 (파일 뒤 #앵커·?쿼리는 떼고 본다)', () => {
    expect(run({ 'a.md': '[x](https://qa-lab.pages.dev/a/) [y](mailto:a@b.c) [z](/root) [w](b.md#절) [v](b.md?x=1)', 'b.md': '' })).toEqual([])
  })

  it('코드 블록·코드 조각 안의 예시 링크는 무시하고, 링크 글자에 코드가 있는 진짜 링크는 검사한다', () => {
    expect(run({ 'a.md': '```md\n[x](./no.md)\n```\n문법 예: ``[`a`](./no2.md)`` 와 `[b](./no3.md)`\n' })).toEqual([])
    expect(run({ 'a.md': '[`slug`](./no.md)' })).toEqual(['a.md: 깨진 상대 링크입니다: ./no.md'])
  })

  it('templates/ 의 자리 표시자 링크는 검사하지 않는다', () => {
    expect(run({ 'templates/T.md': '[x](../../<next>/README.md)' })).toEqual([])
  })

  it('경로에 한글이 퍼센트 인코딩되어 있어도 찾는다', () => {
    expect(run({ 'a.md': '[x](docs/%ED%95%9C.md)', 'docs/한.md': '' })).toEqual([])
  })
})
