import { LAB_README_SECTIONS, OS_LABEL_UNIX, OS_LABEL_WINDOWS } from './constants.mjs'
import { lessonUrl, findLesson } from './snapshot.mjs'

/** 코드 블록 안의 주석·빈 줄을 뺀 실제 내용이 있는지. */
const hasContent = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .some((l) => l && !l.startsWith('#') && !l.startsWith('//') && !l.startsWith('<!--'))

/**
 * "macOS / Linux (터미널)" 와 "Windows (PowerShell)" 표지 + 코드 블록이 항상 쌍으로 있고 비어 있지 않은지 검사한다.
 * 두 OS 에서 명령이 같으면 표지 없이 코드 블록 하나만 쓰는 "공통" 형식이므로 검사 대상이 아니다.
 */
export function checkOsBlocks(markdown) {
  const issues = []
  const lines = markdown.split(/\r?\n/)
  const blocks = []
  let pending = null
  let inFence = false
  let fenceLabel = null
  let fenceStart = 0
  let buf = []
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t.startsWith('```')) {
      if (!inFence) {
        inFence = true
        fenceLabel = pending
        fenceStart = i + 1
        buf = []
        pending = null
      } else {
        inFence = false
        if (fenceLabel) blocks.push({ label: fenceLabel.label, line: fenceLabel.line, content: buf.join('\n') })
        fenceLabel = null
      }
      return
    }
    if (inFence) return buf.push(line)
    if (t === OS_LABEL_UNIX || t === OS_LABEL_WINDOWS) {
      if (pending) issues.push({ line: pending.line, message: `"${pending.label}" 표지 뒤에 코드 블록이 없습니다.` })
      pending = { label: t, line: i + 1 }
    } else if (t !== '' && pending) {
      issues.push({ line: pending.line, message: `"${pending.label}" 표지 바로 뒤에 코드 블록이 와야 합니다.` })
      pending = null
    }
  })
  if (pending) issues.push({ line: pending.line, message: `"${pending.label}" 표지 뒤에 코드 블록이 없습니다.` })

  for (const b of blocks) {
    if (!hasContent(b.content)) issues.push({ line: b.line, message: `"${b.label}" 코드 블록이 비어 있습니다.` })
  }

  // 쌍 검사: macOS/Linux 블록 바로 다음에 Windows 블록이 와야 한다.
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.label === OS_LABEL_UNIX) {
      if (blocks[i + 1]?.label === OS_LABEL_WINDOWS) i++
      else issues.push({ line: b.line, message: `"${OS_LABEL_UNIX}" 블록 뒤에 "${OS_LABEL_WINDOWS}" 블록이 없습니다. OS 별 명령은 두 버전을 모두 써야 합니다.` })
    } else {
      issues.push({ line: b.line, message: `"${OS_LABEL_WINDOWS}" 블록 앞에 "${OS_LABEL_UNIX}" 블록이 없습니다.` })
    }
  }
  return issues
}

/** 마크다운에서 링크 대상 URL 을 모두 뽑는다 ([text](url) 와 <https://...>). */
export function extractLinks(markdown) {
  const links = []
  for (const m of markdown.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) links.push(m[1])
  for (const m of markdown.matchAll(/<(https?:\/\/[^>\s]+)>/g)) links.push(m[1])
  return links
}

/** 랩 README 검사: 필수 절, 힌트 단계, 레슨 링크, 앵커 금지. */
export function checkLabReadme(markdown, lab, snapshot) {
  const issues = []
  const headings = new Set(markdown.split(/\r?\n/).map((l) => l.trim()))
  for (const section of LAB_README_SECTIONS) {
    if (!headings.has(section)) issues.push(`필수 절이 없습니다: ${section}`)
  }
  const stuck = markdown.split(/^## /m).find((s) => s.startsWith('막혔을 때'))
  if (stuck !== undefined) {
    if (!stuck.includes('힌트 1') || !stuck.includes('힌트 2')) issues.push('"## 막혔을 때" 에는 힌트 1 → 힌트 2 단계가 모두 있어야 합니다.')
  }
  const links = extractLinks(markdown)
  const siteBase = snapshot.meta?.siteBaseUrl
  for (const url of links.filter((u) => siteBase && u.startsWith(siteBase))) {
    if (url.includes('#')) issues.push(`QA-Lab 링크에는 앵커(#)를 쓰지 않습니다 (헤딩이 바뀌면 깨짐): ${url}`)
  }
  const wanted = [
    ...(lab.lessons ?? []).map((l) => [lab.module, l]),
    ...(lab.also_for ?? []).flatMap((a) => (a.lessons ?? []).map((l) => [a.module, l])),
  ]
  for (const [m, l] of wanted) {
    const lesson = findLesson(snapshot, m, l)
    if (lesson && !links.includes(lessonUrl(snapshot, lesson))) {
      issues.push(`README 에 레슨 링크가 없습니다: ${lessonUrl(snapshot, lesson)}`)
    }
  }
  for (const issue of checkOsBlocks(markdown)) issues.push(`${issue.line}번째 줄: ${issue.message}`)
  return issues
}
