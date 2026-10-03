import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRow, LOCUST_IMAGE, locustRunArgs, parseStats } from './locust-runner.mjs'

describe('locustRunArgs — 안전 장치', () => {
  const args = locustRunArgs({ name: 'n', network: 'net', locustDir: '/tmp/l', outDir: '/tmp/o', users: 10, durationS: 15, env: { QA_LAB_DEFECTS: 'none' } })
  it('권한을 모두 빼고, 학습자 코드는 읽기 전용으로 마운트하며, 호스트 포트를 열지 않는다', () => {
    expect(args[args.indexOf('--cap-drop') + 1]).toBe('ALL')
    expect(args).toContain('no-new-privileges')
    expect(args.find((a) => a.includes('target=/mnt/locust'))).toMatch(/readonly$/)
    expect(args).not.toContain('-p')
    expect(args).not.toContain('--publish')
  })
  it('이미지는 태그와 다이제스트로 고정한다', () => {
    expect(args).toContain(LOCUST_IMAGE)
    expect(LOCUST_IMAGE).toMatch(/:\d+\.\d+\.\d+@sha256:[0-9a-f]{64}$/)
  })
  it('compose 네트워크 안의 api 서비스를 부하 대상으로 한다 (사용자 수·시간·환경 변수 전달)', () => {
    expect(args[args.indexOf('--host') + 1]).toBe('http://api:3000')
    expect(args[args.indexOf('-u') + 1]).toBe('10')
    expect(args[args.indexOf('-t') + 1]).toBe('15s')
    expect(args).toContain('QA_LAB_DEFECTS=none')
  })
})

describe('parseStats', () => {
  const csv = [
    'Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%',
    'GET,/api/products,100,0,510,520,500,700,100,6.6,0,510,520,530,540,560,600,650,690,700,700,700',
    'POST,/api/quote,50,1,12,13,8,40,200,3.3,0.06,12,13,14,15,20,25,30,35,40,40,40',
    ',Aggregated,150,1,300,350,8,700,150,10,0.06,300,400,500,510,540,600,650,690,700,700,700',
  ].join('\n')
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qa-lab-loc-')), 'result_stats.csv')
  fs.writeFileSync(file, csv)

  it('요청별 p95·요청 수·실패 수를 읽고 Aggregated 는 뺀다', () => {
    const { rows, errors } = parseStats(file)
    expect(errors).toEqual([])
    expect(rows.map((r) => [r.key, r.requests, r.failures, r.p95])).toEqual([['GET /api/products', 100, 0, 600], ['POST /api/quote', 50, 1, 25]])
  })

  it('findRow 는 메서드와 경로로 찾는다', () => {
    const { rows } = parseStats(file)
    expect(findRow(rows, 'GET', '/api/products').p95).toBe(600)
    expect(findRow(rows, 'GET', '/api/quote')).toBeUndefined()
  })

  it('열이 빠진 파일은 오류로 알린다', () => {
    const bad = path.join(path.dirname(file), 'bad.csv')
    fs.writeFileSync(bad, 'Type,Name\nGET,/x\n')
    expect(parseStats(bad).errors.join()).toMatch(/머리글에 열이 없습니다/)
  })
})
