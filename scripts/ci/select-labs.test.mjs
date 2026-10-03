import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { selectLabs, toMatrix } from './select-labs.mjs'

const labs = [
  { slug: 'test-design/shop-rules', status: 'ready', tools: [], requires: ['docker', 'node24'] },
  { slug: 'ui-automation/shop-ui-flows', status: 'ready', tools: ['playwright'], requires: ['docker', 'node24'] },
  { slug: 'ui-automation-tools/selenium-shop-flow', status: 'beta', tools: ['selenium-webdriver'], requires: ['docker', 'node24', 'chrome'] },
  { slug: 'ci-cd-continuous-testing/quality-gates', status: 'ready', tools: ['github-actions'], requires: ['node24'] },
  { slug: 'later/planned-lab', status: 'planned', tools: [], requires: [] },
]
const slugs = (files) => selectLabs(files, labs).map((l) => l.slug)

describe('selectLabs', () => {
  it('랩 폴더 안의 변경은 그 랩만 고른다', () => {
    expect(slugs(['labs/test-design/shop-rules/README.md', 'labs/test-design/shop-rules/check/t1.mjs'])).toEqual(['test-design/shop-rules'])
    expect(slugs(['labs/ui-automation/shop-ui-flows/solution/tests/t1-purchase.spec.mjs', 'labs/ci-cd-continuous-testing/quality-gates/lab.yaml'])).toEqual(['ui-automation/shop-ui-flows', 'ci-cd-continuous-testing/quality-gates'])
  })

  it('모든 랩이 기대는 곳이 바뀌면 모든 실행 가능한 랩을 고른다 (planned 제외)', () => {
    for (const f of ['apps/shop/api/src/routes/shop.ts', 'defects/catalog.yaml', 'scripts/lib/runner.mjs', 'compose.yaml', 'package-lock.json', 'data/qa-lab-modules.snapshot.json', 'templates/lab.yaml', 'vitest.e2e.config.mjs']) {
      expect(slugs([f]), f).toHaveLength(4)
      expect(slugs([f])).not.toContain('later/planned-lab')
    }
  })

  it('문서만 바뀌면 고르지 않는다', () => {
    expect(slugs(['docs/PLAN.md', 'README.md', 'CLAUDE.md'])).toEqual([])
    expect(slugs([])).toEqual([])
  })

  it('planned 랩의 변경은 무시한다', () => {
    expect(slugs(['labs/later/planned-lab/README.md'])).toEqual([])
  })

  it('Windows 경로 구분자도 받아들인다', () => {
    expect(slugs(['labs\\test-design\\shop-rules\\README.md'])).toEqual(['test-design/shop-rules'])
  })

  it('이름이 비슷한 다른 폴더를 잘못 고르지 않는다', () => {
    expect(slugs(['labs/ui-automation-tools/other/README.md'])).toEqual([])
    expect(slugs(['labs/ui-automation/shop-ui-flows-copy/README.md'])).toEqual([])
  })
})

describe('toMatrix', () => {
  it('랩마다 필요한 준비를 플래그로 담는다', () => {
    const m = toMatrix(selectLabs(['apps/x'], labs))
    const by = Object.fromEntries(m.include.map((e) => [e.slug, e]))
    expect(by['ui-automation/shop-ui-flows']).toMatchObject({ docker: true, playwright: true, selenium: false })
    expect(by['ui-automation-tools/selenium-shop-flow']).toMatchObject({ docker: true, playwright: false, selenium: true })
    expect(by['ci-cd-continuous-testing/quality-gates']).toMatchObject({ docker: false, playwright: false, selenium: false })
  })
})

describe('select-labs-cli (워크플로가 부르는 그대로)', () => {
  it('--base 를 받아 실행되고, 바뀐 파일이 없으면 랩을 고르지 않는다', () => {
    const cli = path.join(import.meta.dirname, 'select-labs-cli.mjs')
    const env = { ...process.env }
    delete env.GITHUB_OUTPUT
    const r = spawnSync(process.execPath, [cli, '--base', 'HEAD'], { encoding: 'utf8', env })
    expect(r.status, r.stderr).toBe(0)
    expect(JSON.parse(r.stdout)).toEqual({ changedFiles: 0, selected: [] })
  })
})
