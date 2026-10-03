import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { checkWorkflow, RULE_IDS } from './workflow-rules.mjs'

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p) => load(fs.readFileSync(path.join(lab, ...p), 'utf8'))
const good = () => structuredClone(read('solution', 'quality.yml'))
const failedIds = (doc) => checkWorkflow(doc).filter((r) => r.problem).map((r) => r.id)
const step = (doc, pred) => doc.jobs['test-and-gate'].steps.find(pred)

describe('모범 답안과 시작 파일', () => {
  it('모범 답안은 규칙 10개를 모두 지킨다', () => {
    expect(RULE_IDS).toHaveLength(10)
    expect(failedIds(good())).toEqual([])
  })
  it('시작 파일은 여러 규칙을 어긴다 (그대로는 통과하지 못한다)', () => {
    expect(failedIds(read('starter', 'quality.yml')).length).toBeGreaterThanOrEqual(8)
  })
})

describe('규칙을 하나만 망가뜨리면 그 규칙만 실패한다', () => {
  const cases = [
    ['R1', '트리거 pull_request 없음', (d) => { d.on = { push: { branches: ['main'] } } }],
    ['R1', 'push 에 branches 없음', (d) => { d.on = { push: null, pull_request: null } }],
    ['R1', 'pull_request_target 사용', (d) => { d.on.pull_request_target = null }],
    ['R2', 'permissions 없음', (d) => { delete d.permissions }],
    ['R2', 'write-all', (d) => { d.permissions = 'write-all' }],
    ['R2', '쓰기 권한 추가', (d) => { d.permissions = { contents: 'read', 'pull-requests': 'write' } }],
    ['R3', 'timeout 없음', (d) => { delete d.jobs['test-and-gate']['timeout-minutes'] }],
    ['R3', 'timeout 360', (d) => { d.jobs['test-and-gate']['timeout-minutes'] = 360 }],
    ['R4', 'concurrency 없음', (d) => { delete d.concurrency }],
    ['R4', 'cancel-in-progress false', (d) => { d.concurrency['cancel-in-progress'] = false }],
    ['R5', '브랜치 고정(@main)', (d) => { step(d, (s) => /checkout/.test(s.uses ?? '')).uses = 'actions/checkout@main' }],
    ['R5', '버전 없음', (d) => { step(d, (s) => /checkout/.test(s.uses ?? '')).uses = 'actions/checkout' }],
    ['R6', 'windows 러너', (d) => { d.jobs['test-and-gate']['runs-on'] = 'windows-latest' }],
    ['R7', 'node 20', (d) => { step(d, (s) => /setup-node/.test(s.uses ?? '')).with['node-version'] = '20' }],
    ['R7', 'cache 없음', (d) => { delete step(d, (s) => /setup-node/.test(s.uses ?? '')).with.cache }],
    ['R7', 'npm install', (d) => { step(d, (s) => s.run === 'npm ci').run = 'npm install' }],
    ['R7', '순서 뒤바뀜', (d) => { const st = d.jobs['test-and-gate'].steps; [st[2], st[3]] = [st[3], st[2]] }],
    ['R8', '게이트 단계 없음', (d) => { const j = d.jobs['test-and-gate']; j.steps = j.steps.filter((s) => !/gate\.mjs/.test(s.run ?? '')) }],
    ['R8', '게이트에 continue-on-error', (d) => { step(d, (s) => /gate\.mjs/.test(s.run ?? ''))['continue-on-error'] = true }],
    ['R8', '게이트 || true', (d) => { const g = step(d, (s) => /gate\.mjs/.test(s.run ?? '')); g.run += ' || true' }],
    ['R8', '테스트에 continue-on-error', (d) => { step(d, (s) => s.name?.startsWith('테스트'))['continue-on-error'] = true }],
    ['R9', '비밀 값 echo', (d) => { d.jobs['test-and-gate'].steps.push({ run: 'echo ${{ secrets.TOKEN }}' }) }],
    ['R10', 'artifact 없음', (d) => { const j = d.jobs['test-and-gate']; j.steps = j.steps.filter((s) => !/upload-artifact/.test(s.uses ?? '')) }],
    ['R10', 'if: always() 없음', (d) => { delete step(d, (s) => /upload-artifact/.test(s.uses ?? '')).if }],
  ]
  it.each(cases)('%s — %s', (id, _label, mutate) => {
    const doc = good()
    mutate(doc)
    expect(failedIds(doc)).toEqual([id])
  })
})

describe('방어', () => {
  it('객체가 아닌 YAML 은 모든 규칙 실패', () => {
    expect(failedIds(null)).toHaveLength(10)
    expect(failedIds([1, 2])).toHaveLength(10)
  })
  it('on 을 목록으로 쓰면 push 의 branches 를 정할 수 없어 R1 이 안내한다', () => {
    const doc = good()
    doc.on = ['push', 'pull_request']
    expect(checkWorkflow(doc).find((r) => r.id === 'R1').problem).toMatch(/branches/)
  })
})
