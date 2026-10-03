/**
 * 허가·범위 체크리스트 검사 (t1, 그리고 t2 를 채점하기 전의 관문).
 * 이 랩의 대상은 "내 컴퓨터에서 내가 띄운 실습 앱"과 "이 저장소의 실습 코드"뿐이다.
 */
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]'])
const ALLOWED_PATHS = ['labs/security-testing-tools/', 'apps/shop/']
const AFFIRMATIONS = {
  own_environment: '대상은 내 컴퓨터에서 내가 띄운 실습 앱·실습 코드뿐이다',
  no_third_party: '다른 사람·회사의 시스템과 공개 인터넷 주소는 대상이 아니다',
  no_real_data: '실제 개인정보·비밀 값을 쓰거나 모으지 않는다',
  stop_on_doubt: '범위가 애매하면 멈추고 확인한다',
}

/** 대상 하나가 범위 안인지. 안이면 null, 밖이면 사유. */
export function targetProblem(target) {
  const t = String(target ?? '').trim()
  if (!t) return '빈 대상'
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) {
    let u
    try {
      u = new URL(t)
    } catch {
      return `주소 형식이 올바르지 않습니다: ${t}`
    }
    if (!['http:', 'https:'].includes(u.protocol)) return `http/https 주소만 쓸 수 있습니다: ${t}`
    if (!LOOPBACK.has(u.hostname)) return `범위 밖 주소입니다(내 컴퓨터 127.0.0.1·localhost 만 가능): ${t}`
    if (u.username || u.password) return `주소에 계정 정보를 넣지 마세요: ${t}`
    return null
  }
  if (LOOPBACK.has(t) || t === '::1') return null
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(t) || /^[\w-]+(\.[\w-]+)+$/.test(t) && !t.includes('/')) return `범위 밖 대상입니다: ${t}`
  const p = t.replaceAll('\\', '/')
  if (p.startsWith('/') || /^[a-z]:/i.test(p)) return `저장소 기준 상대 경로로 쓰세요: ${t}`
  if (p.split('/').includes('..')) return `저장소 밖을 가리키는 경로입니다: ${t}`
  if (!ALLOWED_PATHS.some((a) => p === a.slice(0, -1) || p.startsWith(a))) return `이 랩의 실습 코드 경로가 아닙니다(${ALLOWED_PATHS.join(', ')} 아래만 가능): ${t}`
  return null
}

/** @returns {string[]} 문제 목록 (비어 있으면 통과) */
export function scopeProblems(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['scope.yaml 의 형식이 올바르지 않습니다']
  const problems = []
  if (!String(data.tester ?? '').trim()) problems.push('tester(진행자 이름)를 적으세요')
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) problems.push('date 는 YYYY-MM-DD 형식이어야 합니다')
  const targets = Array.isArray(data.targets) ? data.targets.filter((t) => String(t ?? '').trim()) : []
  if (targets.length === 0) problems.push('targets 에 대상을 1개 이상 적으세요')
  for (const t of targets) {
    const p = targetProblem(t)
    if (p) problems.push(p)
  }
  for (const [k, text] of Object.entries(AFFIRMATIONS)) {
    if (data.authorization?.[k] !== true) problems.push(`authorization.${k}: "${text}" 를 확인하고 true 로 바꾸세요`)
  }
  const out = Array.isArray(data.out_of_scope) ? data.out_of_scope.filter((t) => String(t ?? '').trim()) : []
  if (out.length === 0) problems.push('out_of_scope 에 범위 밖 대상을 1개 이상 적으세요 (무엇을 하지 않을지)')
  return problems
}
