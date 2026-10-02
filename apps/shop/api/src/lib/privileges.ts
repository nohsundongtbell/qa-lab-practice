import fs from 'node:fs'
import path from 'node:path'

/**
 * 컨테이너가 root 로 시작했을 때만 동작한다.
 * 로그 폴더(호스트 bind mount)를 node 사용자(uid/gid 1000)가 쓸 수 있게 만든 뒤 권한을 낮춘다.
 * 외부 패키지(su-exec 등) 없이 처리하려고 Node 에서 직접 한다.
 */
export function dropPrivileges(logFile: string | undefined, uid = 1000, gid = 1000): void {
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) return
  if (logFile) {
    const dir = path.dirname(logFile)
    fs.mkdirSync(dir, { recursive: true })
    try {
      fs.chownSync(dir, uid, gid)
      if (fs.existsSync(logFile)) fs.chownSync(logFile, uid, gid)
    } catch {
      // 일부 파일 시스템(예: 호스트 공유 폴더)은 chown 을 지원하지 않는다. 쓰기가 되면 그대로 진행한다.
    }
  }
  process.setgid?.(gid)
  process.setuid?.(uid)
}
