/**
 * 이 저장소 자신의 워크플로가 랩 9 에서 가르치는 규칙을 지키는지 검사한다.
 * (남에게 가르친 기준을 우리 워크플로에도 적용 — 실제 GitHub 에서 돌려 보기 전에 잡을 수 있는 것들)
 */
import fs from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { repoRoot } from '../lib/paths.mjs'

const dir = path.join(repoRoot, '.github', 'workflows')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yml')).sort()
const docs = Object.fromEntries(files.map((f) => [f, load(fs.readFileSync(path.join(dir, f), 'utf8'))]))
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

const jobs = (doc) => Object.entries(doc.jobs ?? {})
const steps = (job) => (Array.isArray(job.steps) ? job.steps : [])
const onNames = (doc) => (typeof doc.on === 'object' && !Array.isArray(doc.on) ? Object.keys(doc.on) : [].concat(doc.on))

describe('워크플로 파일', () => {
  it('기대하는 워크플로가 모두 있다', () => {
    expect(files).toEqual(['codeql.yml', 'lab-ci.yml', 'nightly.yml', 'publish-index.yml', 'validate.yml'])
  })

  it.each(files)('%s: YAML 이 객체이고 name·on·jobs 가 있다', (f) => {
    expect(docs[f]).toMatchObject({ name: expect.any(String) })
    expect(onNames(docs[f]).length).toBeGreaterThan(0)
    expect(jobs(docs[f]).length).toBeGreaterThan(0)
  })
})

describe('랩 9 의 규칙을 우리 워크플로에도', () => {
  it.each(files)('%s: pull_request_target 을 쓰지 않는다', (f) => {
    expect(onNames(docs[f])).not.toContain('pull_request_target')
  })

  it.each(files)('%s: 모든 잡에 timeout-minutes (재사용 호출 잡은 제외)', (f) => {
    for (const [name, job] of jobs(docs[f])) {
      if (job.uses) continue
      expect(Number.isInteger(job['timeout-minutes']), `${f} › ${name}`).toBe(true)
      expect(job['timeout-minutes']).toBeLessThanOrEqual(120)
    }
  })

  it.each(files)('%s: 최소 권한 — 워크플로 권한은 contents: read, 쓰기는 허용 목록만', (f) => {
    expect(docs[f].permissions).toEqual({ contents: 'read' })
    for (const [name, job] of jobs(docs[f])) {
      for (const [scope, level] of Object.entries(job.permissions ?? {})) {
        if (level !== 'write') continue
        expect(f === 'codeql.yml' && scope === 'security-events', `${f} › ${name}: ${scope}: write`).toBe(true)
      }
    }
  })

  it.each(files)('%s: 액션은 @버전(또는 SHA)으로 고정, 브랜치 금지', (f) => {
    for (const [name, job] of jobs(docs[f])) {
      for (const s of [...steps(job), job]) {
        if (typeof s.uses !== 'string' || s.uses.startsWith('./')) continue
        expect(s.uses.split('@')[1], `${f} › ${name}: ${s.uses}`).toMatch(/^(v\d+(\.\d+){0,2}|[0-9a-f]{40})$/)
      }
    }
  })

  it.each(files)('%s: 실패를 삼키지 않는다 (continue-on-error·|| true 없음)', (f) => {
    for (const [name, job] of jobs(docs[f])) {
      expect(job['continue-on-error'], `${f} › ${name}`).not.toBe(true)
      for (const s of steps(job)) {
        expect(s['continue-on-error'], `${f} › ${name} › ${s.name ?? s.run}`).not.toBe(true)
        expect(String(s.run ?? ''), `${f} › ${name}`).not.toMatch(/\|\|\s*(true|:|exit\s+0)/)
      }
    }
  })

  it.each(files)('%s: Node 는 24 로 설정하고 npm 캐시를 쓴다', (f) => {
    for (const [name, job] of jobs(docs[f])) {
      for (const s of steps(job).filter((x) => /^actions\/setup-node@/.test(x.uses ?? ''))) {
        expect(String(s.with?.['node-version']), `${f} › ${name}`).toBe('24')
        expect(s.with?.cache, `${f} › ${name}`).toBe('npm')
      }
    }
  })

  it.each(['lab-ci.yml', 'codeql.yml', 'validate.yml', 'publish-index.yml'])('%s: 같은 브랜치의 이전 실행을 취소한다 (concurrency)', (f) => {
    expect(docs[f].concurrency?.group).toBeTruthy()
    expect(docs[f].concurrency['cancel-in-progress']).toBe(true)
  })

  it.each(files)('%s: 비밀 값을 출력하지 않는다', (f) => {
    for (const [, job] of jobs(docs[f])) {
      for (const s of steps(job)) expect(String(s.run ?? '')).not.toMatch(/\$\{\{\s*secrets\./)
    }
  })

  it('nightly 는 길게 도는 잡을 취소하지 않는다 (cancel-in-progress: false)', () => {
    expect(docs['nightly.yml'].concurrency['cancel-in-progress']).toBe(false)
  })
})

describe('워크플로가 부르는 것들이 실제로 있다', () => {
  const runs = files.flatMap((f) => jobs(docs[f]).flatMap(([, job]) => steps(job).map((s) => ({ f, run: String(s.run ?? '') }))))

  it('npm run <스크립트> 는 package.json 에 있다', () => {
    for (const { f, run } of runs) {
      for (const m of run.matchAll(/npm run ([\w:.-]+)/g)) expect(Object.keys(pkg.scripts), `${f}: npm run ${m[1]}`).toContain(m[1])
    }
  })

  it('node scripts/… 로 부르는 파일이 있다', () => {
    for (const { f, run } of runs) {
      for (const m of run.matchAll(/node (scripts\/[\w./-]+\.mjs)/g)) expect(fs.existsSync(path.join(repoRoot, m[1])), `${f}: ${m[1]}`).toBe(true)
    }
  })

  it('--prefix 로 부르는 하위 프로젝트 스크립트가 있다 (api)', () => {
    const apiPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps/shop/api/package.json'), 'utf8'))
    for (const { f, run } of runs) {
      for (const m of run.matchAll(/npm --prefix apps\/shop\/api (?:run )?([\w:.-]+)/g)) {
        if (m[1] === 'ci') continue
        expect(Object.keys(apiPkg.scripts), `${f}: ${m[1]}`).toContain(m[1])
      }
    }
  })
})

describe('워크플로의 설계 의도', () => {
  it('validate 는 세 OS 에서 돌고 fail-fast 하지 않는다 (한 OS 의 실패가 다른 OS 결과를 가리지 않게)', () => {
    const v = docs['validate.yml'].jobs.validate
    expect(v.strategy.matrix.os).toEqual(['ubuntu-latest', 'macos-latest', 'windows-latest'])
    expect(v.strategy['fail-fast']).toBe(false)
  })

  it('validate 는 workflow_call 로 nightly 가 재사용한다', () => {
    expect(onNames(docs['validate.yml'])).toContain('workflow_call')
    expect(docs['nightly.yml'].jobs.validate.uses).toBe('./.github/workflows/validate.yml')
  })

  it('PR 은 validate·lab-ci·codeql, main 푸시는 validate·publish-index 가 돈다', () => {
    expect(onNames(docs['validate.yml'])).toEqual(expect.arrayContaining(['pull_request', 'push']))
    expect(onNames(docs['lab-ci.yml'])).toContain('pull_request')
    expect(onNames(docs['publish-index.yml'])).toContain('push')
    expect(docs['publish-index.yml'].on.push.branches).toEqual(['main'])
  })

  it('lab-ci 는 선택된 랩만 matrix 로 돌고 한 랩의 실패가 다른 랩을 멈추지 않는다', () => {
    const lab = docs['lab-ci.yml'].jobs.lab
    expect(lab.strategy['fail-fast']).toBe(false)
    expect(lab.strategy.matrix).toContain('fromJSON')
    expect(steps(lab).some((s) => s.env?.QA_LAB_E2E_ONLY === '${{ matrix.slug }}')).toBe(true)
  })

  it('lab-ci 결과 잡은 랩을 고르지 않아도 항상 돌고 랩 잡에 기댄다 (main 브랜치 보호의 필수 체크 이름)', () => {
    const result = docs['lab-ci.yml'].jobs.result
    expect(result.name).toBe('lab-ci 결과')
    expect(result.needs).toEqual(['select', 'lab'])
    expect(result.if).toBe('always()')
  })

  it('publish-index 는 검증 → 최신 여부 확인 → 보관 순서다', () => {
    const runList = steps(docs['publish-index.yml'].jobs.index).map((s) => s.run ?? s.uses)
    const at = (re) => runList.findIndex((x) => re.test(x))
    expect(at(/npm run validate/)).toBeGreaterThan(-1)
    expect(at(/validate/)).toBeLessThan(at(/build-index -- --check/))
    expect(at(/build-index -- --check/)).toBeLessThan(at(/upload-artifact/))
  })

  it('앱을 띄운 잡은 실패해도 정리(down)한다', () => {
    for (const f of ['lab-ci.yml', 'nightly.yml']) {
      for (const [, job] of jobs(docs[f])) {
        const up = steps(job).some((s) => /npm run up/.test(s.run ?? ''))
        if (!up) continue
        const down = steps(job).find((s) => /npm run down/.test(s.run ?? ''))
        expect(down?.if, f).toMatch(/always\(\)/)
      }
    }
  })
})

describe('CodeQL 설정', () => {
  it('분석용 샘플 코드는 제외하고, 제외 경로가 실제로 있다', () => {
    const cfg = load(fs.readFileSync(path.join(repoRoot, '.github/codeql/codeql-config.yml'), 'utf8'))
    expect(cfg['paths-ignore']).toContain('labs/security-testing-tools/scanner-triage/starter/scan-target')
    for (const p of cfg['paths-ignore']) expect(fs.existsSync(path.join(repoRoot, p)), p).toBe(true)
    const wf = docs['codeql.yml'].jobs.analyze.steps.find((s) => /codeql-action\/init/.test(s.uses ?? ''))
    expect(wf.with['config-file']).toBe('./.github/codeql/codeql-config.yml')
  })
})
