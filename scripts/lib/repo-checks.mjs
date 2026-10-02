import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { toPosix } from './paths.mjs'
import { extractLinks } from './readme-check.mjs'
import { findModule } from './snapshot.mjs'

export const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'var', 'work', 'test-results', 'playwright-report', '.stryker-tmp', 'reports'])
export const MAX_PATH_LENGTH = 120

/** 저장소 안의 모든 파일(상대 경로, / 구분)을 돌려준다. 빌드 산출물 폴더는 건너뛴다. */
export function walkFiles(root) {
  const out = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name))
      } else out.push(toPosix(path.relative(root, path.join(dir, e.name))))
    }
  }
  walk(root)
  return out.sort()
}

/** 파일 이름 규칙: 한글(비ASCII) 금지, 대소문자만 다른 이름 금지, 경로 길이 제한. */
export function checkFilenames(relPaths) {
  const issues = []
  const seen = new Map()
  for (const p of relPaths) {
    if (/[^\x20-\x7e]/.test(p)) issues.push({ file: p, message: '파일·폴더 이름에는 ASCII 문자만 씁니다 (한글 이름은 macOS/Windows 에서 git 정규화 문제가 생길 수 있음).' })
    if (p.length > MAX_PATH_LENGTH) issues.push({ file: p, message: `경로가 ${MAX_PATH_LENGTH}자를 넘습니다 (${p.length}자). Windows 260자 제한에 여유가 필요합니다.` })
    const key = p.toLowerCase()
    if (seen.has(key) && seen.get(key) !== p) issues.push({ file: p, message: `대소문자만 다른 파일이 있습니다: ${seen.get(key)}` })
    seen.set(key, p)
  }
  return issues
}

const SHELL_TOKENS = [
  [/&&|\|\|/, '`&&`/`||` 는 OS 마다 동작이 다릅니다'],
  [/(^|\s)(rm|cp|mv|mkdir|cat|grep|export|set)\s/, '셸 명령(rm, cp, mkdir, cat, grep, export …)은 쓸 수 없습니다'],
  [/(^|\s)[A-Za-z_][A-Za-z0-9_]*=\S*\s+\S/, '`VAR=값 명령` 형식은 Windows 에서 동작하지 않습니다'],
  [/[|><;]/, '파이프·리다이렉션·`;` 는 쓸 수 없습니다'],
]

/**
 * package.json 스크립트 검사.
 * - 모든 스크립트: 셸 의존 문법 금지
 * - 루트 package.json: 학습자 명령은 `node scripts/cli.mjs <명령>` 한 줄이어야 한다 (test 만 `vitest run` 허용)
 */
export function checkPackageScripts(pkg, { file, isRoot }) {
  const issues = []
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    for (const [re, why] of SHELL_TOKENS) {
      if (re.test(cmd)) issues.push({ file, message: `scripts.${name}: ${why}. Node 스크립트로 옮기세요. (${cmd})` })
    }
    if (isRoot && name !== 'test' && !/^node scripts\/cli\.mjs [a-z-]+$/.test(cmd)) {
      issues.push({ file, message: `scripts.${name}: 루트 스크립트는 "node scripts/cli.mjs <명령>" 한 줄이어야 합니다. (${cmd})` })
    }
  }
  return issues
}

/** .gitattributes 가 줄바꿈 정책을 지키는지. */
export function checkGitattributes(text) {
  const issues = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  const has = (re) => lines.some((l) => re.test(l))
  if (!has(/^\*\s+.*\beol=lf\b/)) issues.push({ file: '.gitattributes', message: '기본 정책 `* text=auto eol=lf` 가 없습니다.' })
  if (!has(/^\*\.ps1\s+.*\beol=crlf\b/)) issues.push({ file: '.gitattributes', message: '`*.ps1 text eol=crlf` 가 없습니다.' })
  return issues
}

/** 컨테이너·셸에서 쓰는 파일은 LF 여야 한다 (CRLF 면 컨테이너 안에서 깨진다). */
export function checkLineEndings(root, relPaths) {
  const issues = []
  const lfOnly = (p) => /\.(sh|ya?ml)$/.test(p) || /(^|\/)Dockerfile[^/]*$/.test(p) || /(^|\/)entrypoint[^/]*$/.test(p)
  for (const p of relPaths.filter(lfOnly)) {
    if (fs.readFileSync(path.join(root, p), 'utf8').includes('\r')) {
      issues.push({ file: p, message: 'CRLF 줄바꿈이 들어 있습니다. LF 로 바꾸세요 (.gitattributes 가 적용되도록 다시 체크아웃).' })
    }
  }
  return issues
}

/** 랩 check 폴더의 .sh ↔ .ps1 은 항상 쌍으로 있어야 한다. */
export function checkShPs1Pairs(relPaths) {
  const issues = []
  const set = new Set(relPaths)
  for (const p of relPaths.filter((x) => /^labs\/.*\/check\/.*\.(sh|ps1)$/.test(x))) {
    const other = p.endsWith('.sh') ? p.replace(/\.sh$/, '.ps1') : p.replace(/\.ps1$/, '.sh')
    if (!set.has(other)) issues.push({ file: p, message: `쌍이 되는 파일이 없습니다: ${other}` })
  }
  return issues
}

/** 정답표·결함 카탈로그는 어떤 마크다운에서도 링크하지 않는다 (학습자가 우연히 먼저 보지 않도록). */
export function checkSpoilerLinks(root, relPaths) {
  const issues = []
  for (const p of relPaths.filter((x) => x.endsWith('.md') && !x.startsWith('defects/'))) {
    for (const url of extractLinks(fs.readFileSync(path.join(root, p), 'utf8'))) {
      if (/(^|\/)(ANSWERS\.md|catalog\.yaml)(#.*)?$/.test(url)) issues.push({ file: p, message: `정답표/결함 카탈로그로 링크하면 안 됩니다: ${url}` })
    }
  }
  return issues
}

/** defects/catalog.yaml 검사: 모듈 slug 유효성, ANSWERS.md 와 ID 대조, 프로필 등록. */
export function checkDefects(root, snapshot) {
  const issues = []
  const dir = path.join(root, 'defects')
  const catalogPath = path.join(dir, 'catalog.yaml')
  if (!fs.existsSync(catalogPath)) return issues
  const file = 'defects/catalog.yaml'
  const catalog = loadYaml(fs.readFileSync(catalogPath, 'utf8'))
  const defects = catalog?.defects ?? []
  const ids = new Set()
  for (const d of defects) {
    if (!/^DF-\d{3}$/.test(d.id ?? '')) issues.push({ file, message: `결함 ID 형식이 잘못되었습니다: ${d.id}` })
    if (ids.has(d.id)) issues.push({ file, message: `결함 ID 가 중복되었습니다: ${d.id}` })
    ids.add(d.id)
    for (const key of ['type', 'severity', 'surface', 'modules', 'location', 'spec', 'repro']) {
      if (d[key] === undefined) issues.push({ file, message: `${d.id}: ${key} 가 없습니다.` })
    }
    if (!Array.isArray(d.modules) || d.modules.length === 0) issues.push({ file, message: `${d.id}: modules 는 비어 있지 않은 목록이어야 합니다.` })
    for (const m of d.modules ?? []) {
      if (!findModule(snapshot, m)) issues.push({ file, message: `${d.id}: 모듈 slug "${m}" 이(가) QA-Lab 스냅샷에 없습니다.` })
    }
    if (!Array.isArray(d.repro?.steps) || d.repro.steps.length === 0) issues.push({ file, message: `${d.id}: repro.steps 가 비어 있습니다.` })
    if (d.location && !fs.existsSync(path.join(root, d.location))) issues.push({ file, message: `${d.id}: location 파일이 없습니다: ${d.location}` })
  }

  const answersPath = path.join(dir, 'ANSWERS.md')
  if (!fs.existsSync(answersPath)) issues.push({ file: 'defects/ANSWERS.md', message: '정답표가 없습니다.' })
  else {
    const answered = new Set([...fs.readFileSync(answersPath, 'utf8').matchAll(/^\|\s*(DF-\d{3})\s*\|/gm)].map((m) => m[1]))
    for (const id of ids) if (!answered.has(id)) issues.push({ file: 'defects/ANSWERS.md', message: `정답표에 ${id} 가 없습니다.` })
    for (const id of answered) if (!ids.has(id)) issues.push({ file: 'defects/ANSWERS.md', message: `카탈로그에 없는 결함이 정답표에 있습니다: ${id}` })
  }

  const registered = new Map()
  for (const profile of ['none', 'beginner', 'intermediate', 'advanced']) {
    const pf = path.join(dir, 'profiles', `${profile}.yaml`)
    if (!fs.existsSync(pf)) {
      issues.push({ file: `defects/profiles/${profile}.yaml`, message: '프로필 파일이 없습니다.' })
      continue
    }
    for (const id of loadYaml(fs.readFileSync(pf, 'utf8'))?.defects ?? []) {
      if (registered.has(id)) issues.push({ file: `defects/profiles/${profile}.yaml`, message: `${id} 가 ${registered.get(id)} 에도 등록되어 있습니다 (한 프로필에만 등록).` })
      registered.set(id, profile)
    }
  }
  for (const id of ids) if (!registered.has(id)) issues.push({ file, message: `${id} 가 어떤 프로필에도 등록되어 있지 않습니다.` })
  for (const id of registered.keys()) if (!ids.has(id)) issues.push({ file: 'defects/profiles', message: `카탈로그에 없는 결함이 프로필에 있습니다: ${id}` })
  return issues
}
