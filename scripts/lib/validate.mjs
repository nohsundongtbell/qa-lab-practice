import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { paths } from './paths.mjs'
import { loadSnapshot } from './snapshot.mjs'
import { discoverLabs } from './labs.mjs'
import { checkFiles, validateLabData } from './lab-schema.mjs'
import { checkLabReadme, checkOsBlocks } from './readme-check.mjs'
import {
  checkDefects, checkFilenames, checkGitattributes, checkLineEndings, checkPackageScripts,
  checkShPs1Pairs, checkSpoilerLinks, walkFiles,
} from './repo-checks.mjs'

/**
 * 저장소 전체를 검증한다.
 * @param {string} root 저장소 루트
 * @param {{ syntaxCheck?: boolean }} [opts] syntaxCheck: .mjs check 스크립트를 `node --check` 로 문법 검사 (기본 true)
 * @returns {{ errors: Array<{ file: string, message: string }>, labCount: number }}
 */
export function validateRepo(root, { syntaxCheck = true } = {}) {
  const p = paths(root)
  const errors = []
  const add = (file, message) => errors.push({ file, message })
  const addAll = (issues) => issues.forEach((i) => add(i.file, i.message))

  // 1) 스냅샷이 있어야 slug 검증을 할 수 있다 — 없으면 통과시키지 않는다.
  let snapshot = null
  try {
    snapshot = loadSnapshot(p.snapshot)
  } catch (e) {
    add('data/qa-lab-modules.snapshot.json', `스냅샷을 읽을 수 없습니다 (${e.code ?? e.message}). QA-Lab slug 를 검증할 수 없어 실패 처리합니다. npm run snapshot:update -- <modules.json> 으로 만드세요.`)
  }

  const files = walkFiles(root)
  addAll(checkFilenames(files))
  addAll(checkLineEndings(root, files))
  addAll(checkShPs1Pairs(files))
  addAll(checkSpoilerLinks(root, files))

  // 2) 줄바꿈 정책, package.json 스크립트
  const gitattributes = path.join(root, '.gitattributes')
  if (!fs.existsSync(gitattributes)) add('.gitattributes', '.gitattributes 가 없습니다.')
  else addAll(checkGitattributes(fs.readFileSync(gitattributes, 'utf8')))
  for (const f of files.filter((x) => x === 'package.json' || x.endsWith('/package.json'))) {
    try {
      addAll(checkPackageScripts(JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')), { file: f, isRoot: f === 'package.json' }))
    } catch (e) {
      add(f, `package.json 을 읽을 수 없습니다: ${e.message}`)
    }
  }

  // 3) 마크다운의 OS 별 명령 블록 쌍 (랩 README 는 아래에서 따로 검사하므로 제외)
  const labReadme = /^labs\/[^/]+\/[^/]+\/README\.md$/
  for (const f of files.filter((x) => x.endsWith('.md') && !labReadme.test(x) && !x.startsWith('defects/'))) {
    for (const i of checkOsBlocks(fs.readFileSync(path.join(root, f), 'utf8'))) add(f, `${i.line}번째 줄: ${i.message}`)
  }

  // 4) 결함 카탈로그
  if (snapshot) addAll(checkDefects(root, snapshot))

  // 5) 랩
  const labs = discoverLabs(p.labsDir)
  for (const lab of labs) {
    const where = `${lab.rel}/lab.yaml`
    if (!lab.hasYaml) {
      add(lab.rel, 'lab.yaml 이 없습니다.')
      continue
    }
    if (lab.parseError) {
      add(where, `YAML 을 읽을 수 없습니다: ${lab.parseError}`)
      continue
    }
    if (snapshot) {
      for (const m of validateLabData(lab.data, snapshot, { moduleDir: lab.moduleDir, labSlug: lab.labSlug })) add(where, m)
    }
    const status = lab.data?.status
    const readmePath = path.join(lab.dir, 'README.md')
    if (!fs.existsSync(readmePath)) add(`${lab.rel}/README.md`, 'README.md 가 없습니다.')
    else if (snapshot) {
      for (const m of checkLabReadme(fs.readFileSync(readmePath, 'utf8'), lab.data, snapshot)) add(`${lab.rel}/README.md`, m)
    }
    if (status && status !== 'planned') {
      for (const dir of ['starter', 'solution', 'check']) {
        if (!fs.existsSync(path.join(lab.dir, dir))) add(lab.rel, `status 가 ${status} 인데 ${dir}/ 폴더가 없습니다.`)
      }
    }
    for (const t of Array.isArray(lab.data?.tasks) ? lab.data.tasks : []) {
      const entries = checkFiles(t?.check)
      for (const { file } of entries ?? []) {
        const full = path.join(lab.dir, file)
        if (!fs.existsSync(full)) add(where, `tasks.${t.id}: check 파일이 없습니다: ${file}`)
        else if (syntaxCheck && file.endsWith('.mjs')) {
          const r = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' })
          if (r.status !== 0) add(`${lab.rel}/${file}`, `문법 오류: ${(r.stderr || '').split('\n').find((l) => l.trim()) ?? ''}`)
        }
      }
    }
  }
  return { errors, labCount: labs.length }
}

/** 오류를 파일별로 묶어 한국어로 출력할 문자열을 만든다. */
export function formatErrors(errors) {
  const byFile = new Map()
  for (const e of errors) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e.message])
  return [...byFile.entries()].map(([file, msgs]) => `${file}\n${msgs.map((m) => `  - ${m}`).join('\n')}`).join('\n')
}
