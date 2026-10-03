import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, makeRepo, validLabYaml } from './test-support/fixtures.mjs'

const cli = path.resolve(import.meta.dirname, 'cli.mjs')
const roots = []
afterEach(() => roots.splice(0).forEach(cleanup))

function run(args, root, env = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...(root ? { QA_LAB_ROOT: root } : {}), ...env },
  })
  return { status: r.status, out: r.stdout, err: r.stderr }
}

/** 채점기: work 폴더의 a.txt 에 "solution" 이 들어 있어야 통과 (정답으로는 통과, 시작 파일로는 실패해야 한다) */
const checkScript = `
import fs from 'node:fs'
import { checkEnv, finish } from '${pathToFileURL(path.resolve(import.meta.dirname, 'lib/check-kit.mjs')).href}'
const env = checkEnv()
const text = fs.readFileSync(env.workDir + '/a.txt', 'utf8')
finish({ passed: text.includes('solution'), message: text.includes('solution') ? '정답 확인' : '아직 풀지 않았습니다', hints: ['a.txt 에 solution 이라고 적어 보세요'] })
`
const labFiles = (extra = {}) => ({
  'labs/test-design/shop-pricing/lab.yaml': validLabYaml.replace('requires: [docker, node24]', 'requires: [node24]'),
  'labs/test-design/shop-pricing/check/t1.mjs': checkScript,
  ...extra,
})
const repo = (files = {}, opts = { withLab: true }) => {
  const r = makeRepo(files, opts)
  roots.push(r)
  return r
}

describe('cli 공통', () => {
  it('도움말과 알 수 없는 명령', () => {
    const help = run(['help'])
    expect(help.status).toBe(0)
    for (const c of ['up', 'down', 'reset', 'lab', 'check', 'solution', 'logs', 'doctor', 'validate', 'build-index']) expect(help.out).toContain(c)
    const bad = run(['nope'])
    expect(bad.status).toBe(2)
    expect(bad.err).toMatch(/알 수 없는 명령/)
  })

  it('잘못된 옵션은 종료 코드 2 와 한국어 안내', () => {
    const r = run(['up', '--profile', 'expert'])
    expect(r.status).toBe(2)
    expect(r.err).toMatch(/--profile 은 none \| beginner/)
    expect(run(['up', '--bogus']).err).toMatch(/알 수 없는 옵션/)
  })
})

describe('validate / build-index', () => {
  it('validate: 통과·실패에 따라 종료 코드를 정한다', () => {
    expect(run(['validate'], repo()).status).toBe(0)
    const broken = run(['validate'], repo({ 'labs/test-design/shop-pricing/README.md': '# 비어 있음\n' }))
    expect(broken.status).toBe(1)
    expect(broken.err).toMatch(/필수 절이 없습니다/)
    expect(broken.err).toMatch(/검증 실패: 오류 \d+건/)
  })

  it('build-index: 인덱스를 만들고, --check 로 최신 여부를 확인한다', () => {
    const root = repo()
    const indexPath = path.join(root, 'labs/index.json')
    expect(run(['build-index', '--check'], root).status).toBe(1) // 아직 없음
    expect(run(['build-index'], root).status).toBe(0)
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    expect(index.labs).toHaveLength(1)
    expect(index.labs[0]).toMatchObject({ id: 'test-design/shop-pricing', moduleSlug: 'test-design', level: '입문' })
    expect(run(['build-index', '--check'], root).status).toBe(0)

    fs.writeFileSync(path.join(root, 'labs/test-design/shop-pricing/lab.yaml'), validLabYaml.replace('est_minutes: 60', 'est_minutes: 90'))
    const stale = run(['build-index', '--check'], root)
    expect(stale.status).toBe(1)
    expect(stale.err).toMatch(/최신이 아닙니다/)
  })

  it('build-index: 검증에 실패하면 인덱스를 만들지 않는다', () => {
    const root = repo({ 'labs/test-design/shop-pricing/lab.yaml': validLabYaml.replace('level: beginner', 'level: expert') })
    const r = run(['build-index'], root)
    expect(r.status).toBe(1)
    expect(fs.existsSync(path.join(root, 'labs/index.json'))).toBe(false)
  })
})

describe('lab / check / solution', () => {
  it('lab: 인자 없으면 목록, 랩이 없으면 안내', () => {
    const list = run(['lab'], repo(labFiles()))
    expect(list.out).toContain('test-design/shop-pricing')
    expect(list.out).toContain('입문')
    expect(run(['lab'], repo({}, { withLab: false })).out).toMatch(/아직 만들어진 랩이 없습니다/)
  })

  it('lab: starter 를 work/ 로 복사하고, 이미 있으면 덮어쓰지 않는다', () => {
    const root = repo(labFiles())
    const first = run(['lab', 'test-design/shop-pricing'], root)
    expect(first.status).toBe(0)
    expect(first.out).toMatch(/npm run up -- --profile beginner/)
    const work = path.join(root, 'labs/test-design/shop-pricing/work/a.txt')
    expect(fs.readFileSync(work, 'utf8')).toBe('start\n')
    fs.writeFileSync(work, '내 작업\n')
    expect(run(['lab', 'test-design'], root).out).toMatch(/이미 있습니다/)
    expect(fs.readFileSync(work, 'utf8')).toBe('내 작업\n')
  })

  it('lab: 모듈 slug 로도 찾고, 없는 랩은 실패', () => {
    const root = repo(labFiles())
    expect(run(['lab', 'test-design'], root).status).toBe(0)
    const missing = run(['lab', 'nope'], root)
    expect(missing.status).toBe(1)
    expect(missing.err).toMatch(/랩을 찾을 수 없습니다/)
  })

  it('check: solution 으로는 통과, starter 로는 실패 (CI 가 쓰는 검증)', () => {
    const root = repo(labFiles())
    const solution = run(['check', 'test-design/shop-pricing', '--from', 'solution'], root)
    expect(solution.status).toBe(0)
    expect(solution.out).toMatch(/\[통과\] 정답 확인/)
    expect(solution.out).toMatch(/결과: 1\/1 과제 통과/)

    const starter = run(['check', 'test-design/shop-pricing', '--from', 'starter'], root)
    expect(starter.status).toBe(1)
    expect(starter.out).toMatch(/\[실패\] 아직 풀지 않았습니다/)
    expect(starter.out).toMatch(/힌트: a\.txt 에 solution/)
  })

  it('check: lab 을 시작하지 않았으면 안내하고, 작업 결과로 채점한다', () => {
    const root = repo(labFiles())
    const before = run(['check', 'test-design/shop-pricing'], root)
    expect(before.status).toBe(1)
    expect(before.err).toMatch(/npm run lab -- test-design\/shop-pricing/)

    run(['lab', 'test-design/shop-pricing'], root)
    expect(run(['check', 'test-design/shop-pricing'], root).status).toBe(1) // 시작 파일 그대로
    fs.writeFileSync(path.join(root, 'labs/test-design/shop-pricing/work/a.txt'), 'solution\n')
    expect(run(['check', 'test-design/shop-pricing'], root).status).toBe(0)
  })

  it('check: --task 로 과제를 고르고, 없는 과제는 실패', () => {
    const root = repo(labFiles())
    expect(run(['check', 'test-design/shop-pricing', '--from', 'solution', '--task', 't1'], root).status).toBe(0)
    expect(run(['check', 'test-design/shop-pricing', '--from', 'solution', '--task', 't9'], root).err).toMatch(/과제를 찾을 수 없습니다/)
  })

  it('check: docker 가 필요한 랩인데 앱이 꺼져 있으면 기동 방법을 알려 준다', () => {
    const root = repo({ ...labFiles(), 'labs/test-design/shop-pricing/lab.yaml': validLabYaml })
    fs.writeFileSync(path.join(root, '.env'), 'API_PORT=1\n')
    const r = run(['check', 'test-design/shop-pricing', '--from', 'solution'], root)
    expect(r.status).toBe(1)
    expect(r.err).toMatch(/대상 앱에 연결할 수 없습니다/)
    expect(r.err).toMatch(/npm run up -- --profile beginner/)
  })

  it('check: planned 랩은 채점하지 않는다', () => {
    const root = repo(labFiles({ 'labs/test-design/shop-pricing/lab.yaml': validLabYaml.replace('requires: [docker, node24]', 'requires: [node24]').replace('status: beta', 'status: planned') }))
    expect(run(['check', 'test-design/shop-pricing'], root).out).toMatch(/준비 중/)
  })

  it('solution: --yes 없이는 경로를 보여 주지 않고 힌트를 먼저 권한다', () => {
    const root = repo(labFiles())
    const noYes = run(['solution', 'test-design/shop-pricing'], root)
    expect(noYes.status).toBe(0)
    expect(noYes.out).toMatch(/스포일러/)
    expect(noYes.out).not.toMatch(/정답 위치:/)
    expect(run(['solution', 'test-design/shop-pricing', '--yes'], root).out).toMatch(/정답 위치: labs\/test-design\/shop-pricing\/solution\//)
  })
})

describe('lab setup 훅', () => {
  const setupYaml = (extra = '') => validLabYaml.replace('requires: [docker, node24]', 'requires: [node24]') + `setup: setup/seed.mjs\n${extra}`
  // labFiles() 의 랩은 shop-pricing 이다. 같은 폴더에 setup 을 둔다.
  const repoWith = (script) => {
    const root = repo(labFiles({ 'labs/test-design/shop-pricing/lab.yaml': setupYaml(), 'labs/test-design/shop-pricing/setup/seed.mjs': script }))
    return root
  }
  const marker = (root) => path.join(root, 'labs/test-design/shop-pricing/setup-ran.json')
  const recorder = (code = 0) => `import fs from 'node:fs'
fs.appendFileSync(process.env.QA_LAB_LAB_DIR + '/setup-ran.json', JSON.stringify({ db: process.env.QA_LAB_DB_URL, base: process.env.QA_LAB_BASE_URL, work: process.env.QA_LAB_WORK_DIR, cwd: process.cwd() }) + '\\n')
process.exit(${code})
`

  it('lab: starter 복사 뒤에 setup 을 실행하고 DB 주소·앱 주소를 환경 변수로 넘긴다', () => {
    const root = repoWith(recorder())
    fs.writeFileSync(path.join(root, '.env'), 'DB_PORT=55999\nAPI_PORT=3999\n')
    const r = run(['lab', 'test-design/shop-pricing'], root)
    expect(r.status).toBe(0)
    expect(r.out).toMatch(/준비 작업을 실행합니다/)
    const seen = JSON.parse(fs.readFileSync(marker(root), 'utf8').trim())
    expect(seen).toMatchObject({ db: 'postgres://shop:shop@127.0.0.1:55999/shop', base: 'http://127.0.0.1:3999' })
    expect(fs.realpathSync(seen.cwd)).toBe(fs.realpathSync(path.join(root, 'labs/test-design/shop-pricing')))
    expect(fs.existsSync(path.join(root, 'labs/test-design/shop-pricing/work/a.txt'))).toBe(true)
  })

  it('lab: setup 이 실패하면 기동 방법을 알려 주고 종료 코드 1', () => {
    const r = run(['lab', 'test-design/shop-pricing'], repoWith(recorder(3)))
    expect(r.status).toBe(1)
    expect(r.err).toMatch(/준비 작업에 실패했습니다/)
    expect(r.err).toMatch(/npm run up -- --profile beginner/)
  })

  it('check: 채점 전에 setup 을 다시 실행한다 (DB 를 초기화한 뒤에도 동작하도록)', () => {
    const root = repoWith(recorder())
    run(['lab', 'test-design/shop-pricing'], root)
    run(['check', 'test-design/shop-pricing', '--from', 'solution'], root)
    expect(fs.readFileSync(marker(root), 'utf8').trim().split('\n')).toHaveLength(2)
  })

  it('check: setup 이 실패하면 채점하지 않는다', () => {
    const root = repoWith(recorder(3))
    const r = run(['check', 'test-design/shop-pricing', '--from', 'solution'], root)
    expect(r.status).toBe(1)
    expect(r.err).toMatch(/setup/)
    expect(r.out).not.toMatch(/\[통과\]|\[실패\]/)
  })
})

describe('logs / snapshot-update', () => {
  it('logs: 파일이 없으면 기동 안내, 있으면 마지막 줄과 --grep', () => {
    const root = repo({}, { withLab: false })
    const none = run(['logs'], root)
    expect(none.status).toBe(1)
    expect(none.err).toMatch(/npm run up/)

    fs.mkdirSync(path.join(root, 'var/logs'), { recursive: true })
    fs.writeFileSync(path.join(root, 'var/logs/app.log'), 'a-1\nb-2\na-3\n')
    expect(run(['logs', '--lines', '2'], root).out).toBe('b-2\na-3\n')
    expect(run(['logs', '--grep', 'a-'], root).out).toBe('a-1\na-3\n')
    expect(run(['logs', '--lines', '0'], root).status).toBe(2)
  })

  it('snapshot-update: 이름 없는 스냅샷을 만들고 slug 삭제를 경고한다', () => {
    const root = repo({}, { withLab: false })
    const src = {
      meta: { source: 'new@2', generatedAt: '2026-03-03', stages: [], counts: { comingSoonModules: [] } },
      modules: [{ id: 'm03', slug: 'test-design', title: '고유모듈제목XYZ', stage: 's1', order: 1, level: '중급', status: 'published', prerequisites: [], url: '/module/test-design/', lessons: [{ id: 'l1', slug: 'only-one', order: 1, url: '/lesson/test-design/only-one/' }] }],
    }
    const srcFile = path.join(root, 'modules.json')
    fs.writeFileSync(srcFile, JSON.stringify(src))
    const r = run(['snapshot-update', srcFile], root)
    expect(r.status).toBe(0)
    expect(r.out).toMatch(/삭제된 모듈 3개/)
    expect(r.out).toMatch(/slug 가 삭제·변경되면/)
    const written = fs.readFileSync(path.join(root, 'data/qa-lab-modules.snapshot.json'), 'utf8')
    expect(written).not.toContain('고유모듈제목XYZ')
    expect(JSON.parse(written).meta.excludeFromLabs.untrackedInSource).toEqual(['m55']) // 이전 값 유지
    expect(run(['snapshot-update'], root).status).toBe(2)
  })
})

describe('doctor', () => {
  it('저장소 환경에서 실행되고 종료 코드는 실패 항목 유무를 따른다', () => {
    const r = run(['doctor'])
    expect([0, 1]).toContain(r.status)
    expect(r.out).toMatch(/Node\.js/)
    expect(r.out).toMatch(/포트 3000/)
  })
})

