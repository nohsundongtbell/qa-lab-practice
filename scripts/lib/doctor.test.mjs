import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, makeRepo } from '../test-support/fixtures.mjs'
import { formatDoctor, runDoctor } from './doctor.mjs'

const roots = []
afterEach(() => roots.splice(0).forEach(cleanup))

const okDocker = (args) => {
  if (args[0] === 'compose' && args[1] === 'version') return { status: 0, stdout: 'Docker Compose version v2.0.0\n', missing: false }
  if (args[0] === 'compose' && args[1] === 'ps') return { status: 0, stdout: '', missing: false }
  return { status: 0, stdout: '', missing: false }
}

function deps(overrides = {}) {
  const root = makeRepo({})
  roots.push(root)
  return {
    root, platform: 'linux', nodeVersion: '24.1.0', docker: okDocker, isPortFree: async () => true,
    readEnv: () => null, hasSnapshot: () => true, ...overrides,
  }
}
const levels = (results) => results.map((r) => r.level)
const find = (results, re) => results.find((r) => re.test(r.title))

describe('runDoctor', () => {
  it('모두 정상이면 fail/warn 이 없다', async () => {
    const results = await runDoctor(deps())
    expect(levels(results)).not.toContain('fail')
    expect(levels(results)).not.toContain('warn')
  })

  it('Node 버전이 낮으면 실패', async () => {
    expect(find(await runDoctor(deps({ nodeVersion: '20.11.0' })), /Node/).level).toBe('fail')
    expect(find(await runDoctor(deps({ nodeVersion: '22.12.0' })), /Node/).level).toBe('ok')
    expect(find(await runDoctor(deps({ nodeVersion: '22.11.9' })), /Node/).level).toBe('fail')
  })

  it('Docker 가 없거나, compose 가 안 되거나, 데몬이 꺼져 있으면 각각 안내한다', async () => {
    const missing = await runDoctor(deps({ docker: () => ({ status: 1, stdout: '', missing: true }) }))
    expect(find(missing, /^Docker$/).detail).toMatch(/설치/)

    const noCompose = await runDoctor(deps({ docker: () => ({ status: 1, stdout: '', missing: false }) }))
    expect(find(noCompose, /Compose/).level).toBe('fail')

    const daemonDown = (platform) => runDoctor(deps({ platform, docker: (a) => (a[0] === 'info' ? { status: 1, stdout: '', missing: false } : okDocker(a)) }))
    expect(find(await daemonDown('darwin'), /데몬/).hint).toMatch(/메뉴 막대/)
    expect(find(await daemonDown('win32'), /데몬/).hint).toMatch(/WSL 2/)
    expect(find(await daemonDown('linux'), /데몬/).hint).toMatch(/systemctl/)
  })

  it('.env 의 프로필이 잘못되면 실패', async () => {
    const results = await runDoctor(deps({ readEnv: () => 'DEFECT_PROFILE=expert\n' }))
    expect(find(results, /DEFECT_PROFILE=expert/).level).toBe('fail')
    expect(find(await runDoctor(deps({ readEnv: () => 'DEFECT_PROFILE=beginner\n' })), /결함 프로필/).title).toMatch(/beginner/)
  })

  it('포트가 사용 중이면 OS 에 맞는 확인 명령을 알려 준다', async () => {
    const busy = (platform) => runDoctor(deps({ platform, isPortFree: async (p) => p !== 8080 }))
    expect(find(await busy('darwin'), /8080/).hint).toContain('lsof -i :8080')
    expect(find(await busy('win32'), /8080/).hint).toContain('Get-NetTCPConnection -LocalPort 8080')
    expect(find(await busy('linux'), /8080/).level).toBe('warn')
  })

  it('내 QA 숍이 실행 중이라 포트가 쓰이는 것은 정상', async () => {
    const running = (args) => (args[0] === 'compose' && args[1] === 'ps' ? { status: 0, stdout: 'abc123\n', missing: false } : okDocker(args))
    const results = await runDoctor(deps({ docker: running, isPortFree: async () => false }))
    expect(find(results, /8080/).level).toBe('ok')
  })

  it('.env 의 포트 값이 이상하면 실패, 바꾼 포트는 그 값으로 검사', async () => {
    expect(find(await runDoctor(deps({ readEnv: () => 'WEB_PORT=abc\n' })), /WEB_PORT=abc/).level).toBe('fail')
    const seen = []
    await runDoctor(deps({ readEnv: () => 'API_PORT=4001\n', isPortFree: async (p) => (seen.push(p), true) }))
    expect(seen).toContain(4001)
  })

  it('CRLF 로 체크아웃된 컨테이너용 파일을 잡는다', async () => {
    const root = makeRepo({ 'apps/shop/api/Dockerfile': 'FROM x\r\n' })
    roots.push(root)
    const results = await runDoctor({ ...deps(), root })
    expect(find(results, /CRLF/).level).toBe('fail')
    expect(find(results, /CRLF/).hint).toMatch(/autocrlf/)
  })

  it('스냅샷이 없으면 경고', async () => {
    expect(find(await runDoctor(deps({ hasSnapshot: () => false })), /스냅샷/).level).toBe('warn')
  })
})

describe('formatDoctor', () => {
  it('수준 표지와 해결 힌트를 ASCII/한글 태그로 출력한다 (이모지 없음)', () => {
    const text = formatDoctor([
      { level: 'ok', title: '좋음' },
      { level: 'fail', title: '나쁨', detail: '이유', hint: '이렇게 고치세요' },
    ])
    expect(text).toBe('[ OK ] 좋음\n[실패] 나쁨 — 이유\n       → 이렇게 고치세요')
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u2714\u2716]/u)
  })
})
