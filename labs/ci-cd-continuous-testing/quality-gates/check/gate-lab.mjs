import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

/** 학습자 gate.mjs 를 시나리오 하나에 실행해 종료 코드로 판정을 얻는다. 시간 제한 있음. */
export function runGate(gateFile, metricsFile, { timeoutMs = 10_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [gateFile, metricsFile], { cwd: path.dirname(gateFile), stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (d) => (output += d))
    child.stderr.on('data', (d) => (output += d))
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({ decision: 'error', output: '시간 초과', timedOut: true })
    }, timeoutMs)
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ decision: 'error', output: String(e) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ decision: code === 0 ? 'pass' : code === 1 ? 'block' : 'error', code, output })
    })
  })
}

/** 모든 시나리오에 실행. 지표 파일은 임시 폴더에 쓴다. */
export async function runScenarios(gateFile, scenarios) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-lab-gate-'))
  try {
    const results = []
    for (const [i, s] of scenarios.entries()) {
      const file = path.join(dir, `m${i}.json`)
      fs.writeFileSync(file, s.raw ?? JSON.stringify(s.metrics))
      const r = await runGate(gateFile, file)
      results.push({ name: s.name, expect: s.expect, got: r.decision, output: r.output })
    }
    return results
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** 틀린 시나리오를 방향과 함께 분류한다. 너무 느슨함 = 막아야 하는데 통과, 너무 엄격함 = 통과해야 하는데 막음. */
export function summarize(results) {
  const wrong = results.filter((r) => r.got !== r.expect)
  return {
    correct: results.length - wrong.length,
    total: results.length,
    lenient: wrong.filter((r) => r.expect === 'block' && r.got === 'pass').map((r) => r.name),
    strict: wrong.filter((r) => r.expect === 'pass' && r.got === 'block').map((r) => r.name),
    errors: wrong.filter((r) => r.got === 'error').map((r) => r.name),
  }
}
