import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { followFile, tailLines } from './logs.mjs'

const dirs = []
const tmpFile = (content = '') => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-logs-'))
  dirs.push(dir)
  const file = path.join(dir, 'app.log')
  fs.writeFileSync(file, content)
  return file
}
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

describe('tailLines', () => {
  it('마지막 n 줄을 돌려준다 (CRLF·끝 줄바꿈 처리)', () => {
    expect(tailLines(tmpFile('a\nb\r\nc\nd\n'), 2)).toEqual(['c', 'd'])
    expect(tailLines(tmpFile('a\nb\n'), 10)).toEqual(['a', 'b'])
    expect(tailLines(tmpFile(''), 5)).toEqual([])
  })

  it('큰 파일은 끝부분만 읽고, 잘린 첫 줄은 버린다', () => {
    const lines = Array.from({ length: 5000 }, (_, i) => `line-${i}`)
    const out = tailLines(tmpFile(`${lines.join('\n')}\n`), 3, { maxBytes: 200 })
    expect(out).toEqual(['line-4997', 'line-4998', 'line-4999'])
  })

  it('한글이 있는 로그도 읽는다', () => {
    expect(tailLines(tmpFile('{"msg":"주문 완료"}\n'), 1)).toEqual(['{"msg":"주문 완료"}'])
  })
})

describe('followFile', () => {
  it('새로 붙는 줄만 전달하고, 줄이 완성될 때까지 기다린다', async () => {
    const file = tmpFile('old\n')
    const got = []
    const stop = followFile(file, (l) => got.push(l), { intervalMs: 20 })
    fs.appendFileSync(file, 'new-1\nnew-')
    await sleep(120)
    expect(got).toEqual(['new-1'])
    fs.appendFileSync(file, '2\n')
    await sleep(120)
    stop()
    expect(got).toEqual(['new-1', 'new-2'])
  })

  it('파일이 초기화(축소)되면 처음부터 다시 읽는다', async () => {
    const file = tmpFile('aaaaaaaaaa\n')
    const got = []
    const stop = followFile(file, (l) => got.push(l), { intervalMs: 20 })
    fs.writeFileSync(file, 'x\n')
    await sleep(120)
    stop()
    expect(got).toEqual(['x'])
  })

  it('중지 후에는 더 이상 전달하지 않는다', async () => {
    const file = tmpFile('')
    const got = []
    const stop = followFile(file, (l) => got.push(l), { intervalMs: 20 })
    stop()
    fs.appendFileSync(file, 'late\n')
    await sleep(100)
    expect(got).toEqual([])
  })
})
