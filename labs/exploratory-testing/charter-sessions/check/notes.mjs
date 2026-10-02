import fs from 'node:fs'
import path from 'node:path'
import { fencedBlocks, findSection, hasText, metaList, sections, stripComments } from '../../../../scripts/lib/markdown.mjs'
import { reproFromBlock } from '../../../../scripts/lib/lab-kit.mjs'

export const CHARTER_FIELDS = ['탐험 대상', '자원', '알아낼 정보', '리스크']
export const SESSION_META = ['차터', '테스터', '시작', '시간 상자(분)', '시간 배분(%)']
const REQUEST_ID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i

const filled = (v) => typeof v === 'string' && v.trim() !== '' && !v.includes('<')

/** charters.md → { charters: [{ no, fields }], errors } */
export function parseCharters(markdown) {
  const errors = []
  const charters = []
  for (const s of sections(markdown)) {
    const m = /^차터\s*(\d+)/.exec(s.title)
    if (!m) continue
    const fields = metaList(s.body)
    const missing = CHARTER_FIELDS.filter((f) => !filled(fields[f]))
    if (missing.length) errors.push(`차터 ${m[1]}: 비어 있는 항목 — ${missing.join(', ')}`)
    charters.push({ no: Number(m[1]), fields })
  }
  const complete = charters.filter((c) => CHARTER_FIELDS.every((f) => filled(c.fields[f])))
  const targets = complete.map((c) => c.fields['탐험 대상'].trim())
  if (new Set(targets).size !== targets.length) errors.push('탐험 대상이 같은 차터가 있습니다. 차터마다 다른 대상을 고르세요')
  return { charters, complete, errors }
}

/** 세션 노트 하나 → { meta, bugs: [{ title, repro?, text, error? }], errors } */
export function parseSession(markdown, charterNos = []) {
  const errors = []
  const head = markdown.split(/^## /m)[0]
  const meta = metaList(head)
  for (const key of SESSION_META) if (!filled(meta[key])) errors.push(`머리 목록 "- ${key}: …" 가 비어 있습니다`)

  if (filled(meta.차터)) {
    const no = /차터\s*(\d+)/.exec(meta.차터)
    if (!no) errors.push(`"차터" 에는 charters.md 의 차터 번호를 적습니다 (예: 차터 1): "${meta.차터}"`)
    else if (!charterNos.includes(Number(no[1]))) errors.push(`charters.md 에 차터 ${no[1]} 가 없습니다`)
  }
  if (filled(meta['시작']) && !/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}$/.test(meta['시작'])) errors.push(`"시작" 은 YYYY-MM-DD HH:MM 형식이어야 합니다: "${meta['시작']}"`)
  if (filled(meta['시간 상자(분)'])) {
    const n = Number(meta['시간 상자(분)'])
    if (!Number.isInteger(n) || n < 15 || n > 120) errors.push(`시간 상자는 15~120분 사이의 정수여야 합니다: "${meta['시간 상자(분)']}"`)
  }
  if (filled(meta['시간 배분(%)'])) {
    const nums = (meta['시간 배분(%)'].match(/\d+/g) ?? []).map(Number)
    if (nums.length !== 3 || nums.reduce((a, b) => a + b, 0) !== 100) errors.push(`시간 배분은 준비·테스트·버그 조사 세 값의 합이 100 이어야 합니다: "${meta['시간 배분(%)']}"`)
  }

  const secs = sections(markdown)
  for (const name of ['테스트 노트', '발견한 버그', '이슈·질문']) {
    const s = findSection(secs, name)
    if (!s) errors.push(`"## ${name}" 절이 없습니다`)
    else if (name !== '발견한 버그' && !hasText(s.body)) errors.push(`"## ${name}" 절이 비어 있습니다`)
  }

  const bugs = []
  const bugSection = findSection(secs, '발견한 버그')
  if (bugSection) {
    for (const b of sections(bugSection.body, 3)) {
      const blocks = fencedBlocks(b.body, 'repro')
      const text = stripComments(b.body).replace(/```[\s\S]*?```/g, '').trim()
      const bug = { title: b.title, text, hasRequestId: REQUEST_ID.test(b.body) }
      if (blocks.length !== 1) bug.error = `repro 블록이 정확히 하나 있어야 합니다 (지금 ${blocks.length}개)`
      else if (!text) bug.error = '버그 설명(무엇이 사양과 다른지)이 없습니다'
      else {
        const parsed = reproFromBlock(blocks[0].content)
        if (parsed.error) bug.error = parsed.error
        else bug.repro = parsed.repro
      }
      bugs.push(bug)
    }
  }
  return { meta, bugs, errors }
}

export function readCharters(workDir) {
  const file = path.join(workDir, 'charters.md')
  if (!fs.existsSync(file)) return { charters: [], complete: [], errors: ['work/charters.md 가 없습니다'] }
  return parseCharters(fs.readFileSync(file, 'utf8'))
}

/** work/sessions/*.md (밑줄로 시작하는 파일은 템플릿으로 보고 건너뜀) */
export function readSessions(workDir, charterNos) {
  const dir = path.join(workDir, 'sessions')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map((f) => ({ file: `sessions/${f}`, ...parseSession(fs.readFileSync(path.join(dir, f), 'utf8'), charterNos) }))
}

/** 형식이 맞는 세션의 버그를 채점 케이스로. */
export function bugCases(sessions) {
  const cases = []
  const errors = []
  for (const s of sessions.filter((x) => x.errors.length === 0)) {
    for (const b of s.bugs) {
      const label = `${s.file} — ${b.title}`
      if (b.error) errors.push(`${label}: ${b.error}`)
      else cases.push({ id: label, label, repro: b.repro, reset: true })
    }
  }
  return { cases, errors }
}
