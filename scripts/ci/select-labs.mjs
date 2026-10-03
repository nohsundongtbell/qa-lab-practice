/**
 * CI 에서 어떤 랩을 검증할지 고른다 (순수 함수).
 * - 랩 폴더 안의 파일이 바뀌면 그 랩만
 * - 대상 앱·결함·공통 스크립트·의존성 등 **모든 랩이 기대는 곳**이 바뀌면 모든 랩
 * - 문서만 바뀌었으면 없음 (validate 는 항상 따로 돈다)
 */
const SHARED = [/^apps\//, /^defects\//, /^scripts\//, /^compose\.yaml$/, /^package(-lock)?\.json$/, /^data\//, /^templates\//, /^vitest(\.e2e)?\.config\.mjs$/, /^\.github\/workflows\/lab-ci\.yml$/]

/**
 * @param {string[]} changedFiles 저장소 루트 기준 경로(슬래시)
 * @param {Array<{ slug: string, status: string, tools?: string[], requires?: string[] }>} labs
 */
export function selectLabs(changedFiles, labs) {
  const files = changedFiles.map((f) => f.replaceAll('\\', '/'))
  const runnable = labs.filter((l) => ['ready', 'beta'].includes(l.status))
  if (files.some((f) => SHARED.some((re) => re.test(f)))) return runnable
  const touched = new Set()
  for (const f of files) {
    const m = /^labs\/([^/]+)\/([^/]+)\//.exec(f)
    if (m) touched.add(`${m[1]}/${m[2]}`)
  }
  return runnable.filter((l) => touched.has(l.slug))
}

/** GitHub Actions 의 matrix 입력 모양으로. 랩마다 필요한 준비(브라우저·Docker 등)를 플래그로 담는다. */
export function toMatrix(selected) {
  return {
    include: selected.map((l) => ({
      slug: l.slug,
      docker: (l.requires ?? []).includes('docker'),
      playwright: (l.tools ?? []).includes('playwright'),
      selenium: (l.tools ?? []).includes('selenium-webdriver'),
    })),
  }
}
