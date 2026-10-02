import fs from 'node:fs'

/** 파일의 마지막 n 줄 (큰 로그도 끝부분만 읽는다). */
export function tailLines(file, n = 50, { maxBytes = 256 * 1024 } = {}) {
  const fd = fs.openSync(file, 'r')
  try {
    const { size } = fs.fstatSync(fd)
    const start = Math.max(0, size - maxBytes)
    const buf = Buffer.alloc(size - start)
    fs.readSync(fd, buf, 0, buf.length, start)
    let lines = buf.toString('utf8').split(/\r?\n/)
    if (start > 0) lines = lines.slice(1) // 잘린 첫 줄 버림
    if (lines[lines.length - 1] === '') lines.pop()
    return lines.slice(-n)
  } finally {
    fs.closeSync(fd)
  }
}

/**
 * 파일에 새로 붙는 줄을 계속 읽는다 (tail -f / Get-Content -Wait 를 Node 로 대신한다 — OS 차이가 없다).
 * @returns {() => void} 중지 함수
 */
export function followFile(file, onLine, { intervalMs = 300, fromEnd = true } = {}) {
  let offset = fromEnd && fs.existsSync(file) ? fs.statSync(file).size : 0
  let rest = ''
  let stopped = false
  const timer = setInterval(() => {
    if (stopped) return
    let size
    try {
      size = fs.statSync(file).size
    } catch {
      return
    }
    if (size < offset) offset = 0 // 파일이 새로 만들어졌다 (초기화)
    if (size === offset) return
    const fd = fs.openSync(file, 'r')
    try {
      const buf = Buffer.alloc(size - offset)
      fs.readSync(fd, buf, 0, buf.length, offset)
      offset = size
      const chunks = (rest + buf.toString('utf8')).split(/\r?\n/)
      rest = chunks.pop() ?? ''
      for (const line of chunks) onLine(line)
    } finally {
      fs.closeSync(fd)
    }
  }, intervalMs)
  return () => {
    stopped = true
    clearInterval(timer)
  }
}
