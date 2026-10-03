import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

/**
 * 학습자의 Vitest 테스트를 격리된 폴더에서 실행한다.
 * 실행 폴더는 랩 폴더 아래(.runs/)에 만든다 — 저장소 루트의 node_modules 를 찾을 수 있어야 `import 'vitest'` 가 동작하기 때문이다.
 */

/** 실행 폴더를 만들고 파일을 채운다. copies: [{ from, to }] (폴더 가능), files: [{ to, content }] */
export function prepareRunDir(base, name, { copies = [], files = [] } = {}) {
  const dir = path.join(base, '.runs', `${name}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(dir, { recursive: true })
  for (const { from, to } of copies) {
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dir, to), { recursive: true })
  }
  for (const { to, content } of files) {
    fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true })
    fs.writeFileSync(path.join(dir, to), content)
  }
  return dir
}

export const removeRunDir = (dir) => fs.rmSync(dir, { recursive: true, force: true })

/** 새 문자열로 바꾼 소스를 돌려준다. 바꿀 문자열이 없으면 던진다 (뮤턴트 정의가 낡았다는 신호). */
export function applyMutation(source, { from, to, id }) {
  if (!source.includes(from)) throw new Error(`뮤턴트 ${id}: 원본 소스에서 바꿀 부분을 찾지 못했습니다: ${from}`)
  const mutated = source.replace(from, to)
  if (mutated === source) throw new Error(`뮤턴트 ${id}: 소스가 바뀌지 않았습니다`)
  return mutated
}

/**
 * vitest 를 실행하고 JSON 보고서를 읽는다.
 * @param {{ repoRoot: string, runDir: string, config: string, filter?: string, env?: Record<string,string>, coverage?: boolean, timeoutMs?: number }} o
 * @returns {Promise<{ exitCode: number|null, report: object|null, output: string, timedOut: boolean }>}
 */
export function runVitest({ repoRoot, runDir, config, filter, env = {}, coverage = false, timeoutMs = 90_000 }) {
  const vitest = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs')
  const out = path.join(runDir, 'result.json')
  const args = [vitest, 'run', '--config', config, '--root', runDir, '--reporter=json', `--outputFile=${out}`]
  if (coverage) args.push('--coverage')
  if (filter) args.push(filter)
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: runDir, env: { ...process.env, CI: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (d) => (output += d))
    child.stderr.on('data', (d) => (output += d))
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ exitCode: null, report: null, output: String(err), timedOut: false })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      let report = null
      try {
        report = JSON.parse(fs.readFileSync(out, 'utf8'))
      } catch {
        /* 보고서가 없으면 null (설정 오류·문법 오류 등) */
      }
      resolve({ exitCode: code, report, output, timedOut })
    })
  })
}

/** JSON 보고서 요약. 테스트 파일 자체가 깨졌으면 loadError 에 사유를 담는다. */
export function summarize(report) {
  if (!report) return { total: 0, passed: 0, failed: 0, failures: [], loadError: '테스트를 실행하지 못했습니다' }
  const failures = []
  let loadError = null
  for (const file of report.testResults ?? []) {
    if (file.status === 'failed' && (file.assertionResults ?? []).length === 0) {
      loadError = (file.message || '테스트 파일을 읽지 못했습니다').split('\n').find((l) => l.trim()) ?? '테스트 파일을 읽지 못했습니다'
    }
    for (const t of file.assertionResults ?? []) {
      if (t.status === 'failed') failures.push({ name: t.fullName ?? t.title, message: (t.failureMessages?.[0] ?? '').split('\n')[0] })
    }
  }
  return { total: report.numTotalTests ?? 0, passed: report.numPassedTests ?? 0, failed: report.numFailedTests ?? 0, failures, loadError }
}

/** 동시에 limit 개까지만 실행하는 map. 결과 순서는 입력 순서와 같다. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    }),
  )
  return out
}
