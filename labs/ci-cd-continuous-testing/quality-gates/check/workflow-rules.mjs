/**
 * GitHub Actions 워크플로 정적 검사. 규칙 하나가 판정 하나다 — README 의 표와 같은 번호를 쓴다.
 * 실제 GitHub 에서 돌려 보지 않고도 "게이트가 막아야 할 때 막는 구조인가"를 본다.
 */

const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : typeof v === 'object' ? Object.keys(v) : [v])
const jobsOf = (doc) => Object.entries(doc?.jobs ?? {})
const stepsOf = (job) => (Array.isArray(job?.steps) ? job.steps : [])
const runOf = (step) => (typeof step?.run === 'string' ? step.run : '')

/** YAML 1.1 은 키 on 을 true 로 읽기도 한다 (js-yaml 은 문자열 on 으로 두지만 방어). */
const triggersOf = (doc) => doc?.on ?? doc?.[true]

const RULES = [
  {
    id: 'R1', title: '트리거: pull_request 와 push(main 한정)',
    check(doc) {
      const on = triggersOf(doc)
      const names = asList(on)
      if (names.includes('pull_request_target')) return 'pull_request_target 은 쓰지 마세요 (포크의 코드가 비밀 값에 닿을 수 있습니다)'
      if (!names.includes('pull_request')) return 'pull_request 트리거가 없습니다'
      if (!names.includes('push')) return 'push 트리거가 없습니다'
      const branches = on?.push?.branches
      if (!Array.isArray(branches) || branches.length === 0) return 'push 는 branches(예: [main])로 한정하세요 — 모든 브랜치에서 돌면 PR 과 중복 실행됩니다'
      return null
    },
  },
  {
    id: 'R2', title: '최소 권한: permissions 는 contents: read',
    check(doc) {
      const perms = [['워크플로', doc?.permissions], ...jobsOf(doc).map(([n, j]) => [`잡 ${n}`, j?.permissions])]
      const declared = perms.filter(([, p]) => p !== undefined)
      if (declared.length === 0) return 'permissions 를 선언하세요 (기본 권한은 넓습니다)'
      for (const [where, p] of declared) {
        if (typeof p === 'string') return `${where}: permissions: ${p} 는 너무 넓습니다 (contents: read 만)`
        if (p?.contents !== 'read') return `${where}: contents 권한은 read 여야 합니다`
        const extra = Object.entries(p).filter(([k, v]) => k !== 'contents' && v !== 'none' && v !== 'read')
        if (extra.length) return `${where}: 쓰기 권한(${extra.map(([k]) => k).join(', ')})은 이 워크플로에 필요하지 않습니다`
      }
      return null
    },
  },
  {
    id: 'R3', title: '모든 잡에 timeout-minutes (30분 이하)',
    check(doc) {
      for (const [name, job] of jobsOf(doc)) {
        const t = job?.['timeout-minutes']
        if (!Number.isInteger(t) || t < 1 || t > 30) return `잡 ${name}: timeout-minutes 를 1~30 사이 정수로 정하세요 (멈춘 잡이 6시간 동안 러너를 잡고 있지 않도록)`
      }
      return jobsOf(doc).length ? null : '잡이 없습니다'
    },
  },
  {
    id: 'R4', title: '동시 실행 제어: concurrency + cancel-in-progress',
    check(doc) {
      const c = doc?.concurrency
      if (!c || typeof c !== 'object' || !c.group) return 'concurrency.group 을 정하세요 (같은 브랜치의 이전 실행을 취소하려면)'
      if (c['cancel-in-progress'] !== true) return 'concurrency.cancel-in-progress: true 가 필요합니다'
      return null
    },
  },
  {
    id: 'R5', title: '액션은 브랜치가 아니라 버전(또는 SHA)으로 고정',
    check(doc) {
      for (const [name, job] of jobsOf(doc)) {
        for (const step of stepsOf(job)) {
          if (typeof step?.uses !== 'string' || step.uses.startsWith('./')) continue
          const ref = step.uses.split('@')[1]
          if (!ref) return `잡 ${name}: ${step.uses} — @버전을 붙이세요`
          if (!/^(v\d+(\.\d+){0,2}|[0-9a-f]{40})$/.test(ref)) return `잡 ${name}: ${step.uses} — 브랜치(${ref})가 아니라 버전(v4)이나 커밋 SHA 로 고정하세요`
        }
      }
      return null
    },
  },
  {
    id: 'R6', title: '실행 환경: Ubuntu 러너',
    check(doc) {
      for (const [name, job] of jobsOf(doc)) {
        const r = job?.['runs-on']
        if (typeof r !== 'string' || !/^ubuntu-(latest|\d{2}\.\d{2})$/.test(r)) return `잡 ${name}: runs-on 은 ubuntu-latest 또는 ubuntu-24.04 같은 Ubuntu 러너여야 합니다`
      }
      return null
    },
  },
  {
    id: 'R7', title: '준비: checkout → setup-node(24, cache: npm) → npm ci → npm test',
    check(doc) {
      const steps = jobsOf(doc).flatMap(([, j]) => stepsOf(j))
      const idx = (pred) => steps.findIndex(pred)
      const co = idx((s) => /^actions\/checkout(@|$)/.test(s?.uses ?? ''))
      const node = idx((s) => /^actions\/setup-node(@|$)/.test(s?.uses ?? ''))
      const ci = idx((s) => /(^|\s|&&|;)npm ci(\s|$)/.test(runOf(s)))
      const test = idx((s) => /(^|\s|&&|;)npm (run )?test(\s|$)/.test(runOf(s)))
      if (co < 0) return 'actions/checkout 단계가 없습니다'
      if (node < 0) return 'actions/setup-node 단계가 없습니다'
      if (String(steps[node]?.with?.['node-version'] ?? '') !== '24') return "setup-node 의 node-version 은 '24' 여야 합니다 (이 저장소의 기준 Node.js)"
      if (steps[node]?.with?.cache !== 'npm') return 'setup-node 에 cache: npm 을 켜세요 (의존성 설치 시간 단축)'
      if (ci < 0) return 'npm ci 단계가 없습니다 (npm install 이 아니라 npm ci: 잠금 파일 그대로 설치)'
      if (test < 0) return 'npm test 단계가 없습니다'
      if (!(co < node && node < ci && ci < test)) return '단계 순서가 checkout → setup-node → npm ci → npm test 여야 합니다'
      return null
    },
  },
  {
    id: 'R8', title: '게이트는 막아야 한다: gate 단계가 있고 continue-on-error·|| true 가 없다',
    check(doc) {
      const steps = jobsOf(doc).flatMap(([, j]) => stepsOf(j))
      const gate = steps.find((s) => /node\s+\S*gate\.mjs/.test(runOf(s)))
      if (!gate) return 'node …/gate.mjs 를 실행하는 게이트 단계가 없습니다'
      const testStep = steps.find((s) => /(^|\s|&&|;)npm (run )?test(\s|$)/.test(runOf(s)))
      for (const s of [gate, testStep].filter(Boolean)) {
        if (s['continue-on-error'] === true || String(s['continue-on-error']).includes('true')) return `단계 "${s.name ?? runOf(s)}": continue-on-error 로 실패를 삼키면 게이트가 아닙니다`
        if (/\|\|\s*(true|:|exit\s+0)/.test(runOf(s))) return `단계 "${s.name ?? runOf(s)}": || true 로 실패를 삼키면 게이트가 아닙니다`
      }
      return null
    },
  },
  {
    id: 'R9', title: '비밀 값을 출력하지 않는다',
    check(doc) {
      for (const [, job] of jobsOf(doc)) {
        for (const step of stepsOf(job)) {
          if (/\$\{\{\s*secrets\./.test(runOf(step)) && /\b(echo|printf|cat|tee)\b/.test(runOf(step))) return `단계 "${step.name ?? runOf(step)}": 비밀 값을 출력할 수 있는 명령입니다`
        }
      }
      return null
    },
  },
  {
    id: 'R10', title: '증거 남기기: upload-artifact 를 if: always() 로',
    check(doc) {
      const steps = jobsOf(doc).flatMap(([, j]) => stepsOf(j))
      const up = steps.find((s) => /^actions\/upload-artifact(@|$)/.test(s?.uses ?? ''))
      if (!up) return 'actions/upload-artifact 단계가 없습니다 (테스트·게이트 결과를 증거로 남기세요)'
      if (!/always\(\)/.test(String(up.if ?? ''))) return 'upload-artifact 는 if: always() 로 실행하세요 — 게이트가 실패했을 때 가장 필요한 증거입니다'
      return null
    },
  },
]

export const RULE_IDS = RULES.map((r) => r.id)

/** @returns {Array<{ id: string, title: string, problem: string|null }>} */
export function checkWorkflow(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return RULES.map((r) => ({ id: r.id, title: r.title, problem: '워크플로 형식이 올바르지 않습니다 (YAML 최상위가 객체여야 합니다)' }))
  return RULES.map((r) => {
    let problem
    try {
      problem = r.check(doc)
    } catch (e) {
      problem = `검사 중 오류: ${e.message}`
    }
    return { id: r.id, title: r.title, problem }
  })
}
