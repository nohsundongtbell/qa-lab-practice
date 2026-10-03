import { describe, expect, it } from 'vitest'
import { load } from 'js-yaml'
import { snapshotFixture, validLabYaml } from '../test-support/fixtures.mjs'
import { checkFiles, validateLabData } from './lab-schema.mjs'

const base = () => load(validLabYaml)
const validate = (data, where) => validateLabData(data, snapshotFixture, where)
const withChange = (change) => {
  const d = base()
  change(d)
  return validate(d)
}

describe('validateLabData', () => {
  it('올바른 lab.yaml 은 통과한다', () => {
    expect(validate(base(), { moduleDir: 'test-design', labSlug: 'shop-pricing' })).toEqual([])
  })

  it('템플릿의 lab.yaml 도 형식이 맞다 (module/lessons 가 실제 slug)', async () => {
    const fs = await import('node:fs')
    const { paths } = await import('./paths.mjs')
    const { loadSnapshot } = await import('./snapshot.mjs')
    const template = load(fs.readFileSync(`${paths().root}/templates/lab.yaml`, 'utf8'))
    expect(validateLabData(template, loadSnapshot(paths().snapshot))).toEqual([])
  })

  it('최상위가 객체가 아니면 거부', () => {
    expect(validate(null)).toHaveLength(1)
    expect(validate([])).toHaveLength(1)
  })

  it('스냅샷에 없는 module·lesson 은 거부', () => {
    expect(withChange((d) => (d.module = 'nope')).join()).toMatch(/스냅샷에 없습니다/)
    expect(withChange((d) => (d.lessons = ['nope'])).join()).toMatch(/test-design\/nope/)
  })

  it('lessons 는 주 module 의 레슨이어야 한다 (다른 모듈 레슨은 거부)', () => {
    expect(withChange((d) => (d.lessons = ['writing-good-defect-reports'])).join()).toMatch(/스냅샷에 없습니다/)
  })

  it('coming-soon 모듈·미추적 모듈에는 연결할 수 없다', () => {
    expect(withChange((d) => { d.module = 'testops'; d.lessons = [] }).join()).toMatch(/coming-soon/)
    expect(withChange((d) => { d.module = 'automation-architecture'; d.lessons = ['layers'] }).join()).toMatch(/커밋되지 않은/)
  })

  it('폴더 이름과 module 이 다르면 거부', () => {
    expect(validate(base(), { moduleDir: 'defect-management' }).join()).toMatch(/폴더 이름/)
    expect(validate(base(), { labSlug: 'Bad_Name' }).join()).toMatch(/소문자/)
  })

  it('also_for 검증', () => {
    expect(withChange((d) => (d.also_for = [{ module: 'defect-management', lessons: ['writing-good-defect-reports'] }]))).toEqual([])
    expect(withChange((d) => (d.also_for = [{ module: 'test-design', lessons: [] }])).join()).toMatch(/주 module 과 같습니다/)
    expect(withChange((d) => (d.also_for = [{ module: 'testops', lessons: [] }])).join()).toMatch(/coming-soon/)
    expect(withChange((d) => (d.also_for = [{ module: 'defect-management', lessons: ['x'] }])).join()).toMatch(/defect-management\/x/)
    expect(withChange((d) => (d.also_for = 'nope')).join()).toMatch(/also_for/)
  })

  it('알 수 없는 필드(오타)를 잡는다', () => {
    expect(withChange((d) => (d.est_minute = 5)).join()).toMatch(/알 수 없는 필드.*est_minute/)
    expect(withChange((d) => (d.tasks[0].chek = 'x')).join()).toMatch(/chek/)
  })

  it.each([
    ['level', 'expert', /level/],
    ['est_minutes', 0, /est_minutes/],
    ['est_minutes', 1.5, /est_minutes/],
    ['status', 'draft', /status/],
    ['sut_profile', 'hard', /sut_profile/],
    ['requires', [], /requires/],
    ['title_ko', '  ', /title_ko/],
  ])('%s = %j 은 거부', (field, value, message) => {
    expect(withChange((d) => (d[field] = value)).join()).toMatch(message)
  })

  it('일부 OS 만 지원하면 notes 가 필요하다', () => {
    expect(withChange((d) => (d.platforms = ['macos', 'linux'])).join()).toMatch(/notes/)
    expect(withChange((d) => { d.platforms = ['macos', 'linux']; d.notes = 'Windows 는 WSL 에서만 동작' })).toEqual([])
    expect(withChange((d) => (d.platforms = ['beos'])).join()).toMatch(/platforms/)
  })

  describe('tasks', () => {
    it('비어 있으면 거부, id 는 t1 형식·중복 금지', () => {
      expect(withChange((d) => (d.tasks = [])).join()).toMatch(/tasks/)
      expect(withChange((d) => (d.tasks[0].id = 'task1')).join()).toMatch(/t1, t2/)
      expect(withChange((d) => d.tasks.push({ ...d.tasks[0] })).join()).toMatch(/중복/)
    })

    it('goal 이 필요하다', () => {
      expect(withChange((d) => delete d.tasks[0].goal).join()).toMatch(/goal/)
    })

    it('단일 check 는 .mjs 여야 한다', () => {
      expect(withChange((d) => (d.tasks[0].check = 'check/t1.sh')).join()).toMatch(/Node\(\.mjs\)/)
    })

    it('셸 check 는 unix(.sh) + windows(.ps1) 쌍이어야 한다', () => {
      expect(withChange((d) => (d.tasks[0].check = { unix: 'check/t1.sh', windows: 'check/t1.ps1' }))).toEqual([])
      expect(withChange((d) => (d.tasks[0].check = { unix: 'check/t1.sh' })).join()).toMatch(/check/)
      expect(withChange((d) => (d.tasks[0].check = { unix: 'check/t1.mjs', windows: 'check/t1.ps1' })).join()).toMatch(/\.sh/)
      expect(withChange((d) => (d.tasks[0].check = { unix: 'check/t1.sh', windows: 'check/t1.bat' })).join()).toMatch(/\.ps1/)
    })

    it('pass 의 max_cases·beyond_profile 과 알 수 없는 기준', () => {
      expect(withChange((d) => (d.tasks[0].pass = { min_defects: 2, max_cases: 10, beyond_profile: 'beginner' }))).toEqual([])
      expect(withChange((d) => (d.tasks[0].pass = { min_killed: 5 }))).toEqual([])
      expect(withChange((d) => (d.tasks[0].pass = { min_killed: -1 })).join()).toMatch(/min_killed/)
      expect(withChange((d) => (d.tasks[0].pass = { min_line_pct: 100, min_branch_pct: 87.5 }))).toEqual([])
      expect(withChange((d) => (d.tasks[0].pass = { min_branch_pct: 101 })).join()).toMatch(/min_branch_pct/)
      expect(withChange((d) => (d.tasks[0].pass = { min_line_pct: '100' })).join()).toMatch(/min_line_pct/)
      expect(withChange((d) => (d.tasks[0].pass = { max_cases: 0 })).join()).toMatch(/max_cases/)
      expect(withChange((d) => (d.tasks[0].pass = { beyond_profile: 'hard' })).join()).toMatch(/beyond_profile/)
      expect(withChange((d) => (d.tasks[0].pass = { min_defect: 1 })).join()).toMatch(/알 수 없는 기준입니다: min_defect/)
      expect(withChange((d) => (d.tasks[0].pass = [1])).join()).toMatch(/객체/)
    })

    it('pass.min_defects 는 0 이상의 정수', () => {
      expect(withChange((d) => (d.tasks[0].pass = { min_defects: -1 })).join()).toMatch(/min_defects/)
      expect(withChange((d) => (d.tasks[0].pass = { min_defects: 0 }))).toEqual([])
    })
  })
})

describe('checkFiles', () => {
  it('문자열은 공통, 쌍은 unix/windows 로 펼친다', () => {
    expect(checkFiles('a.mjs')).toEqual([{ platform: 'any', file: 'a.mjs' }])
    expect(checkFiles({ unix: 'a.sh', windows: 'a.ps1' })).toEqual([{ platform: 'unix', file: 'a.sh' }, { platform: 'windows', file: 'a.ps1' }])
    expect(checkFiles({ unix: 'a.sh' })).toBeNull()
    expect(checkFiles(42)).toBeNull()
  })
})
