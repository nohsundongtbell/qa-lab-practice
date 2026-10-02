import fs from 'node:fs'
import path from 'node:path'
import { fencedBlocks, findSection, hasText, metaList, sections } from '../../../../scripts/lib/markdown.mjs'
import { reproFromBlock } from '../../../../scripts/lib/lab-kit.mjs'
import { gradeCases } from '../../../../scripts/lib/grading.mjs'

export const REQUIRED_SECTIONS = ['재현 절차', '기대 결과', '실제 결과', '심각도·우선순위 근거', '증거']
export const REQUIRED_META = ['심각도', '우선순위', '발견 환경', '관련 사양']

/**
 * 결함 리포트(마크다운) 하나를 읽고 형식을 검사한다.
 * @returns {{ title: string, meta: Record<string,string>, repro?: object, errors: string[] }}
 */
export function parseReport(markdown) {
  const errors = []
  const titleLine = markdown.split(/\r?\n/).find((l) => /^#\s+/.test(l))
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : ''
  if (!title || title.includes('<')) errors.push('첫 줄에 "# 제목"이 필요합니다 (무엇이 어디서 어떻게 잘못되는지 한 줄로)')

  const secs = sections(markdown)
  const head = markdown.split(/^## /m)[0]
  const meta = metaList(head)
  for (const key of REQUIRED_META) if (!meta[key]) errors.push(`머리 목록에 "- ${key}: …" 가 비어 있습니다`)
  if (meta.심각도 && !/^S[1-4]$/.test(meta.심각도)) errors.push(`심각도는 S1~S4 중 하나여야 합니다: "${meta.심각도}"`)
  if (meta.우선순위 && !/^P[1-4]$/.test(meta.우선순위)) errors.push(`우선순위는 P1~P4 중 하나여야 합니다: "${meta.우선순위}"`)

  for (const name of REQUIRED_SECTIONS) {
    const s = findSection(secs, name)
    if (!s) errors.push(`"## ${name}" 절이 없습니다`)
    else if (!hasText(s.body)) errors.push(`"## ${name}" 절이 비어 있습니다`)
  }

  let repro
  const steps = findSection(secs, '재현 절차')
  if (steps) {
    const blocks = fencedBlocks(steps.body, 'repro')
    if (blocks.length !== 1) errors.push(`"## 재현 절차" 에는 \`\`\`repro 블록이 정확히 하나 있어야 합니다 (지금 ${blocks.length}개)`)
    else {
      const parsed = reproFromBlock(blocks[0].content)
      if (parsed.error) errors.push(parsed.error)
      else repro = parsed.repro
      const human = steps.body.replace(/```[\s\S]*?```/g, '')
      if (!hasText(human)) errors.push('"## 재현 절차" 에는 repro 블록 말고도 사람이 읽을 수 있는 절차(번호 목록)가 있어야 합니다')
    }
  }
  return { title, meta, repro, errors }
}

/** work/reports/*.md (밑줄로 시작하는 파일은 템플릿으로 보고 건너뜀) */
export function listReports(workDir) {
  const dir = path.join(workDir, 'reports')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map((f) => ({ file: `reports/${f}`, ...parseReport(fs.readFileSync(path.join(dir, f), 'utf8')) }))
}

/** 형식이 맞는 리포트의 재현 절차를 채점한다. */
export async function gradeReports(reports, ctx) {
  const ok = reports.filter((r) => r.errors.length === 0)
  const graded = await gradeCases(
    ok.map((r) => ({ id: r.file, label: `${r.file} — ${r.title}`, repro: r.repro, reset: true })),
    { baseUrl: ctx.baseUrl, defectIds: ctx.defectIds },
  )
  const byFile = new Map(graded.results.map((g) => [g.id, g]))
  return { graded, byFile }
}

const SEV = (s) => Number(s.slice(1))

/** 심각도 판단 검사: 리포트가 재현한 결함의 기준 심각도와 1단계 이내인지. */
export function judgeSeverity(report, defectIds, catalog) {
  const levels = defectIds.map((id) => SEV(catalog.get(id).severity))
  const mine = SEV(report.meta.심각도)
  const diffs = levels.map((l) => mine - l)
  const best = diffs.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a))
  if (best === 0) return { ok: true, note: '기준과 같음' }
  if (Math.abs(best) === 1) return { ok: true, note: `기준과 1단계 차이 (${best > 0 ? '기준보다 낮게' : '기준보다 높게'} 판단)` }
  return { ok: false, note: `기준과 ${Math.abs(best)}단계 차이 — ${best > 0 ? '영향을 너무 낮게' : '영향을 너무 높게'} 본 것 같습니다` }
}
