// 보안 랩 안전 장치를 고정하는 테스트 (docs/SECURITY_LAB_SAFETY.md).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(lab, '..', '..', '..')
const target = path.join(lab, 'starter', 'scan-target')

function walk(dir, skip = new Set(['node_modules', '.git', '.runs', 'work', 'dist', 'coverage'])) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, skip))
    else out.push(p)
  }
  return out
}

/** 실제 서비스의 비밀 값 형식. 가짜 값이라도 이 형식이면 비밀 스캐너·푸시 보호에 걸리고, 진짜로 오해될 수 있다. */
const REAL_SECRET_FORMATS = [
  /AKIA[0-9A-Z]{16}/, /ASIA[0-9A-Z]{16}/, /gh[pousr]_[A-Za-z0-9]{36}/, /github_pat_[A-Za-z0-9_]{20,}/,
  /xox[abpors]-[A-Za-z0-9-]{10,}/, /sk_live_[A-Za-z0-9]{10,}/, /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
]

describe('보안 랩 안전 장치', () => {
  it('분석 대상 샘플 코드는 실행될 수 없다 (package.json 없음, 저장소 어디서도 불러오지 않음)', () => {
    expect(walk(target).some((f) => path.basename(f) === 'package.json')).toBe(false)
    const importers = walk(root)
      .filter((f) => /\.(m?js|ts|tsx)$/.test(f) && !f.startsWith(target) && !f.includes(`${path.sep}check${path.sep}`))
      .filter((f) => /from\s+['"][^'"]*scan-target|require\(\s*['"][^'"]*scan-target/.test(fs.readFileSync(f, 'utf8')))
    expect(importers).toEqual([])
  })

  it('저장소에 실제 서비스 형식의 비밀 값이 없다', () => {
    const hits = []
    for (const f of walk(root)) {
      if (/\.(png|jpg|gif|ico|pcap|woff2|lock)$/.test(f) || f.endsWith('package-lock.json')) continue
      const text = fs.readFileSync(f, 'utf8')
      for (const re of REAL_SECRET_FORMATS) if (re.test(text)) hits.push(`${path.relative(root, f)} ~ ${re}`)
    }
    expect(hits).toEqual([])
  })

  it('샘플 코드의 가짜 비밀 값은 가짜임이 드러나는 이름을 쓴다', () => {
    const src = fs.readFileSync(path.join(target, 'src', 'auth', 'password.js'), 'utf8')
    expect(src).toMatch(/'qa-lab-fake-[a-z-]+'/)
  })

  it('샘플 코드의 외부 주소는 루프백뿐이다', () => {
    for (const f of walk(target).filter((p) => p.endsWith('.js'))) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/https?:\/\/([^/'"\s:]+)/g)) {
        expect(['127.0.0.1', 'localhost'], `${path.relative(lab, f)}: ${m[0]}`).toContain(m[1])
      }
    }
  })
})
