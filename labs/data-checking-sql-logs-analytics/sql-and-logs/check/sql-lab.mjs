import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { buildDataset, verificationAnswers } from '../setup/dataset.mjs'
import { readerUrlFrom } from '../setup/db.mjs'

// bigint/numeric 은 숫자로, 날짜·시각은 문자열 그대로 받는다 (시간대 변환으로 값이 달라지지 않게)
pg.types.setTypeParser(20, (v) => Number(v))
pg.types.setTypeParser(1700, (v) => Number(v))
pg.types.setTypeParser(1114, (v) => v)
pg.types.setTypeParser(1082, (v) => v)

/**
 * 학습자 SQL 파일을 실행 가능한 한 문장으로 정리한다.
 * 허용: 주석을 뺀 SELECT / WITH 문 한 개 (끝의 ; 는 허용). 따옴표 안의 ; 는 구분자로 보지 않는다.
 */
export function prepareSql(text) {
  let out = ''
  let i = 0
  let quote = null
  while (i < text.length) {
    const c = text[i]
    const next = text[i + 1]
    if (quote) {
      out += c
      if (c === quote) {
        if (next === quote) out += text[++i]
        else quote = null
      }
    } else if (c === '-' && next === '-') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    } else if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2)
      if (end === -1) return { error: '/* 주석이 닫히지 않았습니다.' }
      i = end + 2
      out += ' '
      continue
    } else if (c === "'" || c === '"') {
      quote = c
      out += c
    } else out += c
    i++
  }
  if (quote) return { error: `따옴표(${quote})가 닫히지 않았습니다.` }
  const statements = []
  let cur = ''
  let q = null
  for (let k = 0; k < out.length; k++) {
    const c = out[k]
    if (q) {
      cur += c
      if (c === q) {
        if (out[k + 1] === q) cur += out[++k]
        else q = null
      }
    } else if (c === "'" || c === '"') {
      q = c
      cur += c
    } else if (c === ';') {
      statements.push(cur)
      cur = ''
    } else cur += c
  }
  if (cur.trim()) statements.push(cur)
  const real = statements.map((s) => s.trim()).filter(Boolean)
  if (real.length === 0) return { error: 'SQL 이 비어 있습니다 (주석만 있나요?).' }
  if (real.length > 1) return { error: `문장이 ${real.length}개입니다. SELECT 문 하나만 쓰세요.` }
  if (!/^(select|with)\b/i.test(real[0])) return { error: 'SELECT (또는 WITH … SELECT) 문만 실행할 수 있습니다.' }
  return { sql: real[0] }
}

/** 셀 값을 비교 가능한 문자열로: 숫자는 소수 둘째 자리까지 다듬고, 문자열은 앞뒤 공백을 뗀다. */
export function normalizeCell(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(Math.round(v * 100) / 100)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return v.toISOString()
  return String(v).trim()
}

/**
 * 결과 행을 정답과 비교한다 (행 순서는 무시, 같은 행은 개수까지 센다). 정답 행 자체는 돌려주지 않는다.
 * @returns {{ correct: number, missing: number, extra: number, columnMismatch: boolean }}
 */
export function compareRows(actual, expected, { firstColumnOnly = false } = {}) {
  const width = expected[0]?.length ?? 1
  if (!firstColumnOnly && actual.length > 0 && actual[0].length !== width) return { correct: 0, missing: expected.length, extra: actual.length, columnMismatch: true, expectedWidth: width }
  const key = (row) => JSON.stringify((firstColumnOnly ? row.slice(0, 1) : row).map(normalizeCell))
  const pool = new Map()
  for (const row of expected) pool.set(key(row), (pool.get(key(row)) ?? 0) + 1)
  let correct = 0
  let extra = 0
  for (const row of actual) {
    const k = key(row)
    if ((pool.get(k) ?? 0) > 0) {
      pool.set(k, pool.get(k) - 1)
      correct++
    } else extra++
  }
  return { correct, missing: expected.length - correct, extra, columnMismatch: false }
}

export async function runQuery(client, sql) {
  await client.query('BEGIN READ ONLY')
  try {
    const r = await client.query({ text: sql, rowMode: 'array' })
    return { rows: r.rows }
  } catch (e) {
    return { error: String(e.message).split('\n')[0] }
  } finally {
    await client.query('ROLLBACK').catch(() => {})
  }
}

/** 과제별 쿼리 목록과 정답. 정답은 데이터 생성기(이상치를 심은 쪽)에서 가져온다. */
export function taskSpecs() {
  const data = buildDataset()
  const v = verificationAnswers(data)
  const ids = (list) => list.map((id) => [id])
  return {
    t1: [
      { file: 'q1-status-count.sql', expected: v.statusCounts, label: '상태별 주문 수' },
      { file: 'q2-monthly-revenue.sql', expected: v.monthlyRevenue, label: '월별 매출' },
      { file: 'q3-top-members.sql', expected: v.topMembers, label: '구매액 상위 3명' },
    ],
    t2: [
      { file: 'q4-orphan-items.sql', expected: ids(data.expected.orphanItemIds), firstColumnOnly: true, label: '고아 주문 품목' },
      { file: 'q5-duplicate-orders.sql', expected: ids(data.expected.duplicateOrderIds), firstColumnOnly: true, label: '중복 주문' },
      { file: 'q6-total-mismatch.sql', expected: ids(data.expected.mismatchOrderIds), firstColumnOnly: true, label: '합계 불일치 주문' },
      { file: 'q7-duplicate-members.sql', expected: ids(data.expected.duplicateMemberIds), firstColumnOnly: true, label: '중복 회원' },
    ],
  }
}

export async function gradeSqlTask() {
  const ctx = loadLabContext()
  const specs = taskSpecs()[ctx.taskId]
  const client = new pg.Client({ connectionString: readerUrlFrom(process.env.QA_LAB_DB_URL ?? '') })
  try {
    await client.connect()
  } catch (e) {
    return finish({ passed: false, message: `DB 에 연결할 수 없습니다 (${e.code ?? e.message})`, hints: ['`npm run up` 으로 대상 앱을 기동한 뒤 다시 채점하세요.'] })
  }
  const problems = []
  let ok = 0
  try {
    for (const spec of specs) {
      const file = path.join(ctx.workDir, spec.file)
      if (!fs.existsSync(file)) {
        console.log(`  [없음] ${spec.file} — 파일이 없습니다`)
        problems.push(`${spec.file}: 파일이 없습니다`)
        continue
      }
      const prepared = prepareSql(fs.readFileSync(file, 'utf8'))
      if (prepared.error) {
        console.log(`  [형식] ${spec.file} — ${prepared.error}`)
        problems.push(`${spec.file}: ${prepared.error}`)
        continue
      }
      const r = await runQuery(client, prepared.sql)
      if (r.error) {
        console.log(`  [오류] ${spec.file} — SQL 오류: ${r.error}`)
        problems.push(`${spec.file}: SQL 오류`)
        continue
      }
      const c = compareRows(r.rows, spec.expected, { firstColumnOnly: spec.firstColumnOnly })
      const same = !c.columnMismatch && c.missing === 0 && c.extra === 0
      if (same) {
        ok++
        console.log(`  [맞음] ${spec.file} — ${spec.label}: 행 ${spec.expected.length}개 모두 일치`)
      } else if (c.columnMismatch) {
        console.log(`  [다름] ${spec.file} — 열 개수가 다릅니다 (필요한 열 ${c.expectedWidth}개)`)
        problems.push(`${spec.file}: 열 개수`)
      } else {
        console.log(`  [다름] ${spec.file} — ${spec.label}: 정답 ${spec.expected.length}행 중 ${c.correct}행 일치, 정답에 없는 행 ${c.extra}개`)
        problems.push(`${spec.file}: 결과 다름`)
      }
    }
  } finally {
    await client.end()
  }
  finish({
    passed: problems.length === 0,
    message: `쿼리 ${ok}/${specs.length}개 정답`,
    details: problems,
    hints: ctx.taskId === 't1'
      ? ['README 의 "이 랩의 규칙"(매출에 포함하는 상태, 월 표기, 열 순서)을 다시 확인하세요.']
      : ['이 데이터에는 UI 로는 보이지 않는 이상치가 심겨 있습니다. 결과 행 수와 정답 행 수가 같아도 "어떤 행인지"가 다를 수 있습니다. README 의 "막혔을 때"를 확인하세요.'],
  })
}
