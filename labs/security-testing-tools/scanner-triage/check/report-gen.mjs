/**
 * 가상 스캐너 리포트(100건)를 결정적으로 만든다. 채점기 전용 — 정답(판정)이 들어 있다.
 *
 * 분석 대상은 starter/scan-target/ 의 샘플 코드(실행하지 않음)다. 위치는 "표식 문자열"로 정의하고 줄 번호는 파일에서 계산한다.
 * 그래서 샘플 코드를 고치면 줄 번호가 따라오고, 표식이 사라지면 생성이 실패한다(테스트가 잡는다).
 * 사용: node check/report-gen.mjs   (starter/scan-report.json, starter/triage.csv 를 다시 쓴다)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const SCAN_TARGET = path.join(here, '..', 'starter', 'scan-target')

/** 위치 정의. verdict 는 README 의 분류 기준에 따른 판정, reason 은 해설용(출력하지 않음). */
export const LOCATIONS = [
  { key: 'P1', file: 'src/routes/products.js', marker: `name LIKE '%" + req.query.q`, cwe: 89, verdict: 'TP', reason: '검색어를 SQL 문자열에 이어 붙임' },
  { key: 'P2', file: 'src/routes/products.js', marker: `WHERE id = $1', [req.params.id]`, cwe: 89, verdict: 'FP', reason: '매개변수화된 쿼리' },
  { key: 'P3', file: 'src/routes/products.js', marker: `res.send('<h1>검색 결과: ' + req.query.q`, cwe: 79, verdict: 'TP', reason: '이스케이프 없이 HTML 에 출력' },
  { key: 'P4', file: 'src/routes/products.js', marker: 'escapeHtml(req.query.q)', cwe: 79, verdict: 'FP', reason: '이스케이프 후 출력' },
  { key: 'O1', file: 'src/routes/orders.js', marker: `'SELECT * FROM orders WHERE id = $1', [req.params.id]`, cwe: 639, verdict: 'TP', reason: '주문 소유자를 확인하지 않음' },
  { key: 'O2', file: 'src/routes/orders.js', marker: `AND member_id = $2', [req.params.id, req.user.id]`, cwe: 639, verdict: 'FP', reason: '소유자 조건 포함' },
  { key: 'O3', file: 'src/routes/orders.js', marker: 'Object.assign(order, req.body)', cwe: 915, verdict: 'TP', reason: '요청 본문으로 status·total 까지 덮어씀' },
  { key: 'O4', file: 'src/routes/orders.js', marker: 'UPDATE orders SET status = $2', cwe: 89, verdict: 'FP', reason: '매개변수화된 쿼리' },
  { key: 'F1', file: 'src/routes/files.js', marker: 'path.join(UPLOAD_DIR, req.query.name)', cwe: 22, verdict: 'TP', reason: '../ 로 업로드 폴더 밖을 읽을 수 있음' },
  { key: 'F2', file: 'src/routes/files.js', marker: 'path.join(UPLOAD_DIR, safe)', cwe: 22, verdict: 'FP', reason: 'basename 으로 경로 제거' },
  { key: 'F3', file: 'src/routes/files.js', marker: `exec('convert ' + req.query.file`, cwe: 78, verdict: 'TP', reason: '셸 명령 문자열에 입력을 이어 붙임' },
  { key: 'F4', file: 'src/routes/files.js', marker: `execFile('convert'`, cwe: 78, verdict: 'FP', reason: '형식 검사 + 셸 없는 execFile' },
  { key: 'W1', file: 'src/auth/password.js', marker: 'const JWT_SECRET =', cwe: 798, verdict: 'TP', reason: '운영 코드에 서명 비밀키 하드코딩' },
  { key: 'W2', file: 'src/auth/password.js', marker: 'export const EXAMPLE_ENV', cwe: 798, verdict: 'FP', reason: '문서용 자리 표시자' },
  { key: 'W3', file: 'src/auth/password.js', marker: `createHash('md5').update(password)`, cwe: 328, verdict: 'TP', reason: '비밀번호 저장에 MD5' },
  { key: 'W4', file: 'src/auth/password.js', marker: `createHash('md5').update(fileBuffer)`, cwe: 328, verdict: 'FP', reason: '보안 목적이 아닌 ETag' },
  { key: 'W5', file: 'src/auth/password.js', marker: 'Math.random().toString(36)', cwe: 338, verdict: 'TP', reason: '비밀번호 재설정 토큰에 예측 가능한 난수' },
  { key: 'W6', file: 'src/auth/password.js', marker: 'Math.random() - 0.5', cwe: 338, verdict: 'FP', reason: '추천 순서 섞기(보안 목적 아님)' },
  { key: 'S1', file: 'src/auth/session.js', marker: 'httpOnly: false', cwe: 1004, verdict: 'TP', reason: '세션 쿠키를 스크립트가 읽을 수 있음' },
  { key: 'S2', file: 'src/auth/session.js', marker: `algorithms: ['HS256', 'none']`, cwe: 347, verdict: 'TP', reason: '서명 없는 토큰(none) 허용' },
  { key: 'S3', file: 'src/auth/session.js', marker: `{ algorithms: ['HS256'] })`, cwe: 347, verdict: 'FP', reason: '알고리즘 고정' },
  { key: 'R1', file: 'src/util/redirect.js', marker: 'res.redirect(req.query.next)', cwe: 601, verdict: 'TP', reason: '임의 주소로 이동' },
  { key: 'R2', file: 'src/util/redirect.js', marker: `ALLOWED_NEXT.includes(next) ? next : '/'`, cwe: 601, verdict: 'FP', reason: '허용 목록' },
  { key: 'L1', file: 'src/util/logger.js', marker: '{ email, password, ok }', cwe: 532, verdict: 'TP', reason: '비밀번호를 로그에 기록' },
  { key: 'L2', file: 'src/util/logger.js', marker: '{ email, ok }', cwe: 532, verdict: 'FP', reason: '비밀번호 없음' },
  { key: 'V1', file: 'src/util/validate.js', marker: '/^(a+)+$/', cwe: 1333, verdict: 'TP', reason: '재앙적 역추적 정규식' },
  { key: 'V2', file: 'src/util/validate.js', marker: '/^[a-z0-9_-]{3,20}$/', cwe: 1333, verdict: 'FP', reason: '길이 제한된 단순 문자 집합' },
  { key: 'C1', file: 'src/payments/card.js', marker: `VALUES ($1, $2)', [memberId, cardNumber])`, cwe: 312, verdict: 'TP', reason: '카드 번호 전체를 평문 저장' },
  { key: 'C2', file: 'src/payments/card.js', marker: 'cardNumber.slice(-4)', cwe: 312, verdict: 'FP', reason: '끝 4자리만 저장' },
  { key: 'A1', file: 'src/admin/report.js', marker: 'eval(req.body.formula)', cwe: 95, verdict: 'TP', reason: '요청 본문을 코드로 실행' },
  { key: 'A2', file: 'src/admin/report.js', marker: 'JSON.parse(req.body.data)', cwe: 95, verdict: 'FP', reason: 'JSON.parse 는 코드를 실행하지 않음' },
  { key: 'A3', file: 'src/admin/report.js', marker: 'fetch(req.query.url)', cwe: 918, verdict: 'TP', reason: '서버가 임의 주소를 요청' },
  { key: 'A4', file: 'src/admin/report.js', marker: `fetch(new URL('/api/health', INTERNAL_BASE))`, cwe: 918, verdict: 'FP', reason: '고정 주소' },
  { key: 'H1', file: 'src/util/html.js', marker: 'return String(value).replace', cwe: 79, verdict: 'FP', reason: '이스케이프 함수 자체' },
  { key: 'T1', file: 'test/products.test.js', marker: `eval('1 + 1')`, cwe: 95, verdict: 'FP', reason: '테스트 코드' },
  { key: 'T2', file: 'test/products.test.js', marker: 'const TEST_PASSWORD', cwe: 798, verdict: 'FP', reason: '테스트 코드' },
  // AI 스캐너의 환각: 없는 파일, 또는 실제와 다른 코드를 인용
  { key: 'X1', file: 'src/routes/cart.js', line: 12, snippet: "db.query('SELECT * FROM cart WHERE member_id = ' + req.user.id)", cwe: 89, verdict: 'FP', reason: '파일이 없음', hallucinated: true },
  { key: 'X2', file: 'src/routes/products.js', line: 1, snippet: "db.query('SELECT * FROM products WHERE id = ' + req.params.id)", cwe: 89, verdict: 'FP', reason: '그 줄은 주석. 인용한 코드가 없음', hallucinated: true },
]

const CWE_NAME = {
  22: '경로 조작(Path Traversal)', 78: 'OS 명령 주입', 79: '크로스 사이트 스크립팅(XSS)', 89: 'SQL 주입', 95: '동적 코드 실행(eval)',
  312: '민감 정보 평문 저장', 328: '취약한 해시', 338: '예측 가능한 난수', 347: '서명 검증 미흡', 532: '로그에 민감 정보',
  601: '열린 리다이렉트', 639: '권한 확인 없는 객체 접근(IDOR)', 798: '하드코딩된 비밀 값', 915: '대량 할당(Mass Assignment)',
  918: '서버 측 요청 위조(SSRF)', 1004: 'HttpOnly 없는 쿠키', 1333: '정규식 서비스 거부(ReDoS)',
}
const RULES = {
  RuleScan: (cwe) => `rs/cwe-${cwe}`,
  'RuleScan#2': (cwe) => `rs/cwe-${cwe}-taint`,
  TaintCheck: (cwe) => `TC${String(cwe).padStart(4, '0')}`,
  'AI-Review': () => 'ai/security-review',
  SecretScan: () => 'secret/generic-high-entropy',
}
const SEVERITY = (cwe) => ([78, 89, 95, 918, 347].includes(cwe) ? 'HIGH' : [22, 79, 639, 798, 915, 312].includes(cwe) ? 'MEDIUM' : 'LOW')
const MESSAGES = {
  RuleScan: (n) => `${n} 패턴이 감지되었습니다.`,
  'RuleScan#2': (n) => `신뢰할 수 없는 데이터가 위험한 함수에 도달할 수 있습니다 (${n}).`,
  TaintCheck: (n) => `[${n}] 사용자 입력 흐름이 싱크에 도달합니다.`,
  'AI-Review': (n) => `이 코드는 ${n} 취약점이 있는 것이 확실합니다. 공격자가 이를 악용해 시스템을 장악할 수 있으므로 즉시 수정해야 합니다.`,
  SecretScan: () => '하드코딩된 비밀 값으로 보이는 문자열이 있습니다.',
}

/** 위치마다 보고한 도구 목록. 합계가 정확히 100건이 되도록 정했다. */
function reportersOf(loc) {
  if (loc.hallucinated) return ['AI-Review']
  const tools = loc.verdict === 'TP' ? ['RuleScan', 'TaintCheck', 'AI-Review'] : ['RuleScan', 'AI-Review']
  if (loc.cwe === 798) tools.push('SecretScan')
  if (['P1', 'F3', 'A1', 'S2', 'O1', 'W3'].includes(loc.key)) tools.push('RuleScan#2')
  return tools
}

/** 결정적 난수 (mulberry32) */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 표식으로 줄 번호와 그 줄의 코드를 찾는다. */
export function locate(root, loc) {
  if (loc.hallucinated) return { line: loc.line, snippet: loc.snippet }
  const lines = fs.readFileSync(path.join(root, loc.file), 'utf8').split('\n')
  const hits = lines.flatMap((l, i) => (l.includes(loc.marker) ? [i] : []))
  if (hits.length !== 1) throw new Error(`위치 ${loc.key}: 표식이 ${hits.length}번 나옵니다 (정확히 1번이어야 함): ${loc.marker}`)
  return { line: hits[0] + 1, snippet: lines[hits[0]].trim() }
}

/**
 * @returns {{ findings: Array<{ id, tool, rule, cwe, title, severity, file, line, snippet, message }>, key: Map<string, { verdict, group, canonical }> }}
 */
export function buildReport(root = SCAN_TARGET) {
  const raw = []
  for (const loc of LOCATIONS) {
    const { line, snippet } = locate(root, loc)
    for (const tool of reportersOf(loc)) {
      raw.push({
        tool: tool.replace('#2', ''), rule: RULES[tool](loc.cwe), cwe: loc.cwe, title: CWE_NAME[loc.cwe], severity: SEVERITY(loc.cwe),
        file: loc.file, line, snippet, message: MESSAGES[tool](CWE_NAME[loc.cwe]), group: `${loc.file}:${line}:${loc.cwe}`, verdict: loc.verdict,
      })
    }
  }
  // 도구별로 모은 것처럼 보이지 않게 섞는다 (고정 시드)
  const r = rng(20261003)
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[raw[i], raw[j]] = [raw[j], raw[i]]
  }
  const key = new Map()
  const canonicalOf = new Map()
  const findings = raw.map((f, i) => {
    const id = `F-${String(i + 1).padStart(3, '0')}`
    if (!canonicalOf.has(f.group)) canonicalOf.set(f.group, id)
    key.set(id, { verdict: f.verdict, group: f.group, canonical: canonicalOf.get(f.group) })
    const { group: _g, verdict: _v, ...pub } = f
    return { id, ...pub }
  })
  return { findings, key }
}

/** 기대 판정: 그룹의 첫 항목은 TP/FP, 나머지는 DUP */
export const expectedVerdict = (key, id) => {
  const k = key.get(id)
  return k.canonical === id ? k.verdict : 'DUP'
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v))

export function reportCsv(findings) {
  const cols = ['id', 'tool', 'rule', 'cwe', 'title', 'severity', 'file', 'line', 'snippet', 'message']
  return [cols.join(','), ...findings.map((f) => cols.map((c) => csvCell(f[c])).join(','))].join('\n') + '\n'
}

export function triageTemplate(findings) {
  return ['id,verdict,duplicate_of,note', ...findings.map((f) => `${f.id},,,`)].join('\n') + '\n'
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { findings, key } = buildReport()
  const starter = path.join(here, '..', 'starter')
  fs.writeFileSync(path.join(starter, 'scan-report.json'), JSON.stringify({ scanner: '가상 통합 스캐너 리포트 (실습용)', target: 'scan-target/', findings }, null, 2) + '\n')
  fs.writeFileSync(path.join(starter, 'scan-report.csv'), reportCsv(findings))
  fs.writeFileSync(path.join(starter, 'triage.csv'), triageTemplate(findings))
  // 모범 답안
  const rows = findings.map((f) => {
    const v = expectedVerdict(key, f.id)
    return `${f.id},${v},${v === 'DUP' ? key.get(f.id).canonical : ''},`
  })
  fs.writeFileSync(path.join(here, '..', 'solution', 'triage.csv'), ['id,verdict,duplicate_of,note', ...rows].join('\n') + '\n')
  console.log(`findings: ${findings.length}`)
}
