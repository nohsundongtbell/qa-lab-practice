import { describe, expect, it } from 'vitest'
import { buildReport, expectedVerdict } from './report-gen.mjs'
import { formatGrade, gradeTriage, parseTriage } from './triage.mjs'
import { scopeProblems, targetProblem } from './scope.mjs'

const { findings, key } = buildReport()
const ids = findings.map((f) => f.id)
const perfect = () => findings.map((f) => {
  const v = expectedVerdict(key, f.id)
  return { id: f.id, verdict: v, duplicate_of: v === 'DUP' ? key.get(f.id).canonical : '' }
})
const grade = (rows) => {
  const { problems, byId } = parseTriage(rows, ids)
  expect(problems).toEqual([])
  return gradeTriage(byId, key)
}

describe('분류표 채점', () => {
  it('모범 답안은 100점, 놓친 TP 0', () => {
    expect(grade(perfect())).toMatchObject({ correct: 100, missedTp: 0, fpAsTp: 0, missedDup: 0, falseDup: 0, wrongDupTarget: 0 })
  })

  it('DUP 는 같은 그룹의 어느 항목을 가리켜도 맞다 (대표가 아니어도)', () => {
    const rows = perfect()
    const dup = rows.find((r) => r.verdict === 'DUP')
    const sibling = findings.find((f) => f.id !== dup.id && key.get(f.id).group === key.get(dup.id).group && f.id !== dup.duplicate_of)
    if (sibling) {
      dup.duplicate_of = sibling.id
      expect(grade(rows).correct).toBe(100)
    }
  })

  it('실수 종류별로 센다', () => {
    const rows = perfect()
    const tp = rows.find((r) => r.verdict === 'TP')
    const fp = rows.find((r) => r.verdict === 'FP')
    const dup = rows.find((r) => r.verdict === 'DUP')
    const otherGroup = findings.find((f) => key.get(f.id).group !== key.get(dup.id).group).id
    tp.verdict = 'FP'
    fp.verdict = 'TP'
    dup.duplicate_of = otherGroup
    expect(grade(rows)).toMatchObject({ correct: 97, missedTp: 1, fpAsTp: 1, wrongDupTarget: 1 })
  })

  it('모두 TP 로 찍거나 모두 FP 로 찍으면 통과할 수 없다', () => {
    const all = (v) => grade(findings.map((f) => ({ id: f.id, verdict: v, duplicate_of: '' })))
    expect(all('TP').correct).toBe(17)
    expect(all('FP').correct).toBe(21)
    expect(all('FP').missedTp).toBe(17)
  })

  it('출력은 집계뿐이고 항목 id 를 담지 않는다', () => {
    const rows = perfect()
    rows[0].verdict = rows[0].verdict === 'TP' ? 'FP' : 'TP'
    const out = formatGrade(grade(rows)).join('\n')
    expect(out).not.toMatch(/F-\d{3}/)
  })

  it('형식 오류를 행 번호와 함께 알린다', () => {
    const rows = perfect()
    rows[0].verdict = 'MAYBE'
    rows[1].verdict = 'DUP'
    rows[1].duplicate_of = rows[1].id
    rows[2].id = 'F-999'
    const { problems } = parseTriage(rows, ids)
    expect(problems.join('\n')).toMatch(/2행: .* TP, FP, DUP/)
    expect(problems.join('\n')).toMatch(/3행: .* 자기 자신/)
    expect(problems.join('\n')).toMatch(/4행: 리포트에 없는 id/)
  })

  it('빠진 항목을 알린다', () => {
    expect(parseTriage(perfect().slice(0, 50), ids).problems.join()).toMatch(/분류하지 않은 항목이 50개/)
  })
})

describe('허가·범위 체크리스트', () => {
  it.each([
    'http://127.0.0.1:9000', 'https://localhost:8080/path', 'http://[::1]:3000', '127.0.0.1', 'localhost', '::1',
    'labs/security-testing-tools/scanner-triage/work/scan-target', 'apps/shop/api/src',
  ])('범위 안: %s', (t) => expect(targetProblem(t)).toBeNull())

  it.each([
    ['http://example.com', /범위 밖 주소/],
    ['https://10.0.0.5', /범위 밖 주소/],
    ['http://0.0.0.0:3000', /범위 밖 주소/],
    ['http://127.0.0.1.nip.io', /범위 밖 주소/],
    ['http://localhost.evil.test', /범위 밖 주소/],
    ['http://user:pw@127.0.0.1', /계정 정보/],
    ['ftp://127.0.0.1', /http\/https/],
    ['192.168.0.10', /범위 밖 대상/],
    ['shop.example.com', /범위 밖 대상/],
    ['/etc/passwd', /상대 경로/],
    ['C:\\Windows', /상대 경로/],
    ['labs/security-testing-tools/../../etc', /저장소 밖/],
    ['scripts/lib', /실습 코드 경로가 아닙니다/],
  ])('범위 밖: %s', (t, re) => expect(targetProblem(t)).toMatch(re))

  const ok = {
    tester: '홍길동', date: '2026-10-03', targets: ['http://127.0.0.1:9000'],
    authorization: { own_environment: true, no_third_party: true, no_real_data: true, stop_on_doubt: true }, out_of_scope: ['공개 서비스'],
  }
  it('모두 채우면 통과, 하나라도 빠지면 실패', () => {
    expect(scopeProblems(ok)).toEqual([])
    expect(scopeProblems({ ...ok, tester: ' ' }).join()).toMatch(/tester/)
    expect(scopeProblems({ ...ok, date: '내일' }).join()).toMatch(/date/)
    expect(scopeProblems({ ...ok, targets: [] }).join()).toMatch(/targets/)
    expect(scopeProblems({ ...ok, targets: ['http://127.0.0.1', 'https://naver.com'] }).join()).toMatch(/범위 밖/)
    expect(scopeProblems({ ...ok, authorization: { ...ok.authorization, no_third_party: 'yes' } }).join()).toMatch(/no_third_party/)
    expect(scopeProblems({ ...ok, out_of_scope: [''] }).join()).toMatch(/out_of_scope/)
    expect(scopeProblems({ ...ok, date: new Date('2026-10-03') })).toEqual([]) // YAML 이 날짜로 읽은 경우
    expect(scopeProblems(null)).toHaveLength(1)
  })
})
