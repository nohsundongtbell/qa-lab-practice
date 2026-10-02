import net from 'node:net'

/** 127.0.0.1 의 포트가 비어 있으면 true. */
export function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, host)
  })
}

/** 포트를 쓰는 프로그램을 확인하는 명령 (OS 별). */
export function portInspectHint(port, platform = process.platform) {
  return platform === 'win32' ? `Get-NetTCPConnection -LocalPort ${port}` : `lsof -i :${port}`
}
