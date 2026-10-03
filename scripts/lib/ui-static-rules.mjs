import fs from 'node:fs'
import path from 'node:path'

/** 주석을 지운 소스 (주석 안의 예시 코드가 규칙에 걸리지 않도록). */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

export const countExpects = (src) => (stripComments(src).match(/\bexpect\s*\(/g) ?? []).length

/** 고정 대기(sleep). 조건을 기다리지 않고 시간만 기다리는 코드. */
export function findFixedSleeps(src) {
  const code = stripComments(src)
  return [...code.matchAll(/waitForTimeout\s*\(|setTimeout\s*\(|\bsleep\s*\(/g)].map((m) => m[0].replace(/\s*\($/, ''))
}

export const usesFixtureApi = (src) => stripComments(src).includes('/__admin/fixtures/')

/** 테스트가 ../pages/ 의 파일을 가져오고, 그 파일이 클래스를 정의하는가. */
export function usesPageObject(testSources, pageSources) {
  const imported = new Set()
  for (const src of testSources) {
    for (const m of stripComments(src).matchAll(/from\s+['"]\.\.\/pages\/([^'"]+)['"]/g)) imported.add(path.basename(m[1]).replace(/\.mjs$/, ''))
  }
  return [...imported].some((name) => {
    const page = pageSources[`${name}.mjs`]
    return page !== undefined && /\bclass\s+\w+/.test(stripComments(page))
  })
}

/** 작업 폴더에서 과제의 테스트·페이지 소스를 읽는다. */
export function readSources(workDir, prefix, suffix = '.spec.mjs') {
  const dir = path.join(workDir, 'tests')
  const tests = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(suffix)) : []
  const pagesDir = path.join(workDir, 'pages')
  const pages = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.mjs')) : []
  return {
    testFiles: tests,
    tests: tests.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')),
    pages: Object.fromEntries(pages.map((f) => [f, fs.readFileSync(path.join(pagesDir, f), 'utf8')])),
  }
}
