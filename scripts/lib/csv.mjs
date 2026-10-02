import fs from 'node:fs'

/**
 * CSV 바이트를 문자열로. UTF-8(BOM 포함)을 먼저 시도하고, 아니면 CP949(EUC-KR)로 읽는다.
 * Windows 의 Excel 은 "CSV(쉼표로 분리)"로 저장하면 CP949 로 저장하기 때문이다.
 */
export function decodeText(buffer) {
  const bytes = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf ? buffer.subarray(3) : buffer
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('euc-kr').decode(bytes), encoding: 'cp949' }
  }
}

/** RFC 4180 CSV 파서 (따옴표, 따옴표 안의 쉼표·줄바꿈, "" 이스케이프, CRLF). 각 행에 시작 줄 번호를 붙인다. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let line = 1
  let rowLine = 1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') inQuotes = false
      else {
        if (ch === '\n') line++
        field += ch
      }
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push({ line: rowLine, cells: row })
      row = []
      field = ''
      line++
      rowLine = line
    } else field += ch
  }
  if (inQuotes) throw new Error(`${rowLine}번째 줄: 따옴표(")가 닫히지 않았습니다.`)
  if (field !== '' || row.length) {
    row.push(field)
    rows.push({ line: rowLine, cells: row })
  }
  // 완전히 빈 줄은 버린다
  return rows.filter((r) => r.cells.some((c) => c.trim() !== ''))
}

/**
 * 머리글이 있는 CSV 표를 읽는다.
 * @returns {{ rows: Array<Record<string, string> & { _line: number }>, errors: string[], encoding: string }}
 */
export function readCsvTable(file, columns) {
  if (!fs.existsSync(file)) return { rows: [], errors: [`파일이 없습니다: ${file}`], encoding: 'utf-8' }
  const { text, encoding } = decodeText(fs.readFileSync(file))
  let parsed
  try {
    parsed = parseCsv(text)
  } catch (e) {
    return { rows: [], errors: [e.message], encoding }
  }
  if (parsed.length === 0) return { rows: [], errors: ['머리글 줄이 없습니다.'], encoding }
  const header = parsed[0].cells.map((h) => h.trim())
  const missing = columns.filter((c) => !header.includes(c))
  if (missing.length) return { rows: [], errors: [`머리글에 열이 없습니다: ${missing.join(', ')} (필요한 열: ${columns.join(', ')})`], encoding }
  const errors = []
  const rows = parsed.slice(1).map((r) => {
    if (r.cells.length > header.length) errors.push(`${r.line}번째 줄: 열이 머리글보다 많습니다 (값에 쉼표가 있으면 큰따옴표로 감싸세요).`)
    const obj = { _line: r.line }
    header.forEach((h, i) => (obj[h] = (r.cells[i] ?? '').trim()))
    return obj
  })
  return { rows, errors, encoding }
}
