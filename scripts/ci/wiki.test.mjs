/** docs/wiki(위키 원본)가 저장소와 어긋나지 않게: 랩 목록, 링크 규칙, 스포일러 금지. */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { repoRoot } from '../lib/paths.mjs'

const dir = path.join(repoRoot, 'docs', 'wiki')
const pages = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8')
const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'labs', 'index.json'), 'utf8'))
const REPO = 'https://github.com/nohsundongtbell/qa-lab-practice'

describe('위키 원본', () => {
  it('랩 목록 페이지가 모든 랩을 담는다', () => {
    const roadmap = read('Lab-Roadmap.md')
    for (const id of new Set(index.labs.map((l) => l.id))) expect(roadmap, id).toContain(`\`${id}\``)
  })

  it.each(pages)('%s: 정답표·카탈로그로 링크하지 않고, QA-Lab 주소에 앵커가 없다', (f) => {
    const text = read(f)
    expect(text).not.toMatch(/ANSWERS\.md|catalog\.yaml/)
    expect(text).not.toMatch(/qa-lab\.pages\.dev[^\s)]*#/)
  })

  it.each(pages)('%s: 저장소 파일 링크는 기본 브랜치(HEAD)를 가리키고, 가리키는 파일이 있다', (f) => {
    for (const m of read(f).matchAll(new RegExp(`${REPO}/(blob|tree)/([^/]+)/([^)\\s]+)`, 'g'))) {
      expect(m[2], m[0]).toBe('HEAD')
      expect(fs.existsSync(path.join(repoRoot, m[3])), m[0]).toBe(true)
    }
  })

  it.each(pages)('%s: 위키 페이지 링크는 실제 페이지 파일이 있다', (f) => {
    for (const m of read(f).matchAll(new RegExp(`${REPO}/wiki/([\\w-]+)`, 'g'))) {
      expect(pages, m[0]).toContain(`${m[1]}.md`)
    }
  })
})
