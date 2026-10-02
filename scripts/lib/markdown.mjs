/**
 * 학습자가 쓴 마크다운(결함 리포트, 세션 노트, 차터)을 읽는 작은 도구들.
 * 형식은 templates/ 의 템플릿을 기준으로 한다.
 */

/** "## 제목" 단위로 나눈다. level=3 이면 "### 제목". → [{ title, body, line }] */
export function sections(markdown, level = 2) {
  const marker = '#'.repeat(level)
  const re = new RegExp(`^${marker}\\s+(.+?)\\s*$`)
  const out = []
  let cur = null
  let inFence = false
  markdown.split(/\r?\n/).forEach((line, i) => {
    if (line.trim().startsWith('```')) inFence = !inFence
    const m = !inFence && re.exec(line)
    if (m && !line.startsWith(`${marker}#`)) {
      cur = { title: m[1], body: '', line: i + 1 }
      out.push(cur)
    } else if (cur) cur.body += `${line}\n`
  })
  return out
}

export const findSection = (secs, title) => secs.find((s) => s.title === title || s.title.startsWith(`${title} `) || s.title.startsWith(`${title}:`))

/** 주석(<!-- -->)과 빈 줄을 뺀 실제 내용이 있는지. */
export function hasText(body) {
  return stripComments(body).trim() !== ''
}

export function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '')
}

/** 언어가 lang 인 코드 블록 내용을 모두 뽑는다. → [{ content, line }] */
export function fencedBlocks(markdown, lang) {
  const out = []
  const lines = markdown.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s*```\s*([\w-]*)\s*$/.exec(lines[i])
    if (!open) continue
    const buf = []
    let j = i + 1
    while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) buf.push(lines[j++])
    if (open[1] === lang) out.push({ content: buf.join('\n'), line: i + 1 })
    i = j
  }
  return out
}

/** "- 키: 값" 형식의 목록을 { 키: 값 } 으로. 첫 번째 값만 쓴다. */
export function metaList(text) {
  const out = {}
  for (const line of stripComments(text).split(/\r?\n/)) {
    const m = /^\s*[-*]\s*([^:：]+?)\s*[:：]\s*(.*?)\s*$/.exec(line)
    if (m && !(m[1] in out)) out[m[1]] = m[2]
  }
  return out
}
