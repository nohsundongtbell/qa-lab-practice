import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { labUrl, labsForLesson, lessonUrls, validateIndexContract } from './index-contract.mjs'
import { repoRoot } from './paths.mjs'

const read = (...p) => JSON.parse(fs.readFileSync(path.join(repoRoot, ...p), 'utf8'))
const index = read('labs', 'index.json')
const snapshot = read('data', 'qa-lab-modules.snapshot.json')
const fresh = () => structuredClone(index)

describe('실제 labs/index.json', () => {
  it('계약을 지킨다', () => {
    expect(validateIndexContract(index, snapshot)).toEqual([])
  })
  it('랩 13개(1차 목표)가 모두 ready 이고, also_for 는 모듈별 항목으로 펼쳐져 같은 id 가 모듈만 달리 나온다', () => {
    expect(new Set(index.labs.map((l) => l.id)).size).toBe(13)
    expect(index.labs.every((l) => l.status === 'ready')).toBe(true)
    const multi = Object.entries(Object.groupBy(index.labs, (l) => l.id)).filter(([, v]) => v.length > 1)
    for (const [, v] of multi) expect(new Set(v.map((l) => l.moduleSlug)).size).toBe(v.length)
  })
})

describe('계약을 깨뜨리면 잡는다', () => {
  const cases = [
    ['schemaVersion', (i) => { i.schemaVersion = 2 }, /schemaVersion/],
    ['ref 없음', (i) => { delete i.ref }, /ref 가 없습니다/],
    ['labs 가 배열 아님', (i) => { i.labs = {} }, /labs 가 배열이 아닙니다/],
    ['id 없음', (i) => { delete i.labs[0].id }, /id 가 없습니다/],
    ['알 수 없는 status', (i) => { i.labs[0].status = 'draft' }, /status 는/],
    ['알 수 없는 level', (i) => { i.labs[0].level = 'expert' }, /level 은/],
    ['estimatedMinutes 0', (i) => { i.labs[0].estimatedMinutes = 0 }, /estimatedMinutes/],
    ['알 수 없는 platform', (i) => { i.labs[0].platforms = ['beos'] }, /platform/],
    ['path 에 앵커', (i) => { i.labs[0].path += '#top' }, /앵커/],
    ['path 에 ..', (i) => { i.labs[0].path = '../x' }, /상위 경로/],
    ['중복', (i) => { i.labs.push(structuredClone(i.labs[0])) }, /중복/],
    ['없는 모듈', (i) => { i.labs[0].moduleSlug = 'no-such-module' }, /스냅샷에 없는 moduleSlug/],
    ['다른 모듈의 레슨', (i) => { i.labs[0].lessonSlugs = ['boundary-value-analysis'] }, /없는 lessonSlug/],
  ]
  it.each(cases)('%s', (_n, mutate, re) => {
    const i = fresh()
    mutate(i)
    expect(validateIndexContract(i, snapshot).join('\n')).toMatch(re)
  })

  it('모르는 필드는 거절하지 않는다 (호환: 필드 추가는 허용)', () => {
    const i = fresh()
    i.labs[0].futureField = { a: 1 }
    i.extra = true
    expect(validateIndexContract(i, snapshot)).toEqual([])
  })
})

describe('조회 도우미', () => {
  it('(moduleSlug, lessonSlug) 로 랩을 찾는다. 레슨이 같아도 모듈이 다르면 찾지 않는다', () => {
    const labs = labsForLesson(index, 'api-contract-testing', 'contract-testing-with-openapi')
    expect(labs.map((l) => l.id)).toEqual(['api-contract-testing/shop-api-contract'])
    expect(labsForLesson(index, 'api-testing-tools', 'contract-testing-with-openapi')).toEqual([])
    expect(labsForLesson(index, 'api-contract-testing', 'no-such-lesson')).toEqual([])
  })

  it('랩 주소는 저장소의 랩 폴더이고, 레슨 주소는 끝 / 포함·앵커 없음', () => {
    const lab = index.labs.find((l) => l.id === 'test-design/shop-rules')
    expect(labUrl(index, lab)).toBe('https://github.com/nohsundongtbell/qa-lab-practice/tree/main/labs/test-design/shop-rules')
    for (const u of lessonUrls(lab, snapshot)) {
      expect(u).toMatch(/^https:\/\/qa-lab\.pages\.dev\/lesson\/test-design\/[a-z0-9-]+\/$/)
      expect(u).not.toContain('#')
    }
  })

  it('모든 랩의 레슨 주소를 만들 수 있다', () => {
    for (const lab of index.labs) expect(lessonUrls(lab, snapshot).length).toBe(lab.lessonSlugs.length)
  })
})

describe('연동 제안서(docs/QA_LAB_INTEGRATION.md)와의 일치', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'QA_LAB_INTEGRATION.md'), 'utf8')
  const rows = doc.split('\n').filter((l) => /^\| `[\w-]+\/[\w-]+` \| `[\w-]+` \|/.test(l)).map((l) => l.split('|').map((c) => c.trim()))

  it('현재 내용 표가 labs/index.json 의 항목과 (id, 모듈) 쌍까지 같다', () => {
    const fromDoc = rows.map((r) => `${r[1].replaceAll('`', '')} ${r[2].replaceAll('`', '')}`).sort()
    const fromIndex = index.labs.map((l) => `${l.id} ${l.moduleSlug}`).sort()
    expect(fromDoc).toEqual(fromIndex)
  })

  it('표의 레슨 수·분·수준이 인덱스와 같다', () => {
    for (const r of rows) {
      const lab = index.labs.find((l) => l.id === r[1].replaceAll('`', '') && l.moduleSlug === r[2].replaceAll('`', ''))
      expect([Number(r[3]), r[4], Number(r[5])]).toEqual([lab.lessonSlugs.length, lab.level, lab.estimatedMinutes])
    }
  })

  it('문서에 정답표·카탈로그 링크가 없고, QA-Lab 주소에 앵커가 없다', () => {
    expect(doc).not.toMatch(/ANSWERS\.md|catalog\.yaml/)
    expect(doc).not.toMatch(/qa-lab\.pages\.dev[^\s)]*#/)
  })
})
