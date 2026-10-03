import fs from 'node:fs'
import path from 'node:path'
import { docker } from './docker.mjs'
import { readCsvTable } from './csv.mjs'

/** 태그와 멀티 아키텍처 인덱스 다이제스트로 고정한 이미지 (docs/PLATFORM_SUPPORT.md). */
export const LOCUST_IMAGE = 'locustio/locust:2.46.6@sha256:d43616228012a7d79b883e2ecd42f87640469377f2b666c4ab27e5248dfdf35f'

/**
 * Locust 를 헤드리스로 실행하는 docker 인자. 학습자의 locustfile 은 컨테이너 안에서만 실행된다:
 * 읽기 전용 마운트, 권한 제거, 메모리 제한, compose 네트워크 안의 api 서비스에만 닿는다. 호스트에는 포트를 열지 않는다.
 */
export function locustRunArgs({ name, network, locustDir, outDir, users, durationS, env = {} }) {
  const args = [
    'run', '--rm', '--name', name, '--network', network,
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '1g', '--tmpfs', '/tmp',
    '--mount', `type=bind,source=${locustDir},target=/mnt/locust,readonly`,
    '--mount', `type=bind,source=${outDir},target=/out`,
  ]
  for (const [k, v] of Object.entries(env)) args.push('--env', `${k}=${v}`)
  args.push(
    LOCUST_IMAGE, '-f', '/mnt/locust/locustfile.py', '--headless', '-u', String(users), '-r', String(users), '-t', `${durationS}s`,
    '--host', 'http://api:3000', '--csv', '/out/result', '--only-summary',
  )
  return args
}

/** compose 네트워크 이름 (api 서비스가 붙어 있는). 앱이 안 떠 있으면 null. */
export function apiNetwork(cwd) {
  const ps = docker(['ps', '-q', '--filter', 'label=com.docker.compose.project=qa-lab-shop', '--filter', 'label=com.docker.compose.service=api'], { cwd })
  const id = ps.stdout.trim().split('\n')[0]
  if (!id) return null
  return docker(['inspect', '-f', '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}', id], { cwd }).stdout.trim().split(/\s+/)[0] || null
}

/**
 * Locust CSV(_stats.csv) → 요청별 통계. Name 은 이름 그룹, Type 은 메서드.
 * @returns {{ rows: Array<{ key: string, method: string, name: string, requests: number, failures: number, p95: number, median: number }>, errors: string[] }}
 */
export function parseStats(file) {
  const t = readCsvTable(file, ['Type', 'Name', 'Request Count', 'Failure Count', 'Median Response Time', '95%'])
  if (t.errors.length) return { rows: [], errors: t.errors }
  const rows = t.rows
    .filter((r) => r.Name !== 'Aggregated')
    .map((r) => ({
      key: `${r.Type} ${r.Name}`, method: r.Type, name: r.Name,
      requests: Number(r['Request Count']), failures: Number(r['Failure Count']), p95: Number(r['95%']), median: Number(r['Median Response Time']),
    }))
  return { rows, errors: [] }
}

/** 이름이 경로와 맞는 행(이름 그룹을 쓰는 경우도 있으므로 경로가 이름에 들어 있으면 같은 것으로 본다). */
export const findRow = (rows, method, pathName) => rows.find((r) => r.method === method && (r.name === pathName || r.name.split('?')[0] === pathName))

/** 한 번 실행해 통계를 돌려준다. 실행 폴더·출력 폴더는 호출자가 만든다. */
export function runLocust({ repoRoot, network, locustDir, outDir, users, durationS, env, name = `qa-lab-locust-${process.pid}-${Math.random().toString(36).slice(2, 7)}` }) {
  fs.chmodSync(outDir, 0o777) // 컨테이너의 비특권 사용자가 결과를 쓸 수 있게
  const r = docker(locustRunArgs({ name, network, locustDir: path.resolve(locustDir), outDir: path.resolve(outDir), users, durationS, env }), { cwd: repoRoot })
  docker(['rm', '-f', name], { cwd: repoRoot })
  const statsFile = path.join(outDir, 'result_stats.csv')
  return { exitCode: r.status, output: `${r.stdout}\n${r.stderr}`, stats: fs.existsSync(statsFile) ? parseStats(statsFile) : { rows: [], errors: ['결과 파일이 만들어지지 않았습니다'] } }
}
