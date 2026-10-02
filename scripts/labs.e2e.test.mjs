/**
 * 랩 E2E: 실행 중인 대상 앱(SUT)에 대해 모든 ready/beta 랩을 실제로 채점한다.
 * - solution 으로는 모든 과제가 통과해야 한다
 * - starter 로는 과제 하나하나가 실패해야 한다 (시작 파일만으로 통과하는 과제가 없도록)
 * SUT 가 꺼져 있거나 개발용 기능(ALLOW_DEV_TOOLS)이 없으면 건너뛴다. CI 에서는 SUT 를 띄우고 실행한다.
 */
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { discoverLabs } from './lib/labs.mjs'
import { paths } from './lib/paths.mjs'
import { readEnvFile } from './lib/env.mjs'
import { baseUrlFrom, probeSut } from './lib/sut.mjs'

const p = paths()
const sut = await probeSut(baseUrlFrom(readEnvFile(p.env)))
const labs = discoverLabs(p.labsDir).filter((l) => l.data && ['ready', 'beta'].includes(l.data.status))
const cli = path.join(p.root, 'scripts', 'cli.mjs')
const check = (slug, args) => spawnSync(process.execPath, [cli, 'check', slug, ...args], { encoding: 'utf8', cwd: p.root })

describe.skipIf(!sut || sut.profile === null)('랩 E2E (실행 중인 SUT 필요)', () => {
  for (const lab of labs) {
    const slug = `${lab.moduleDir}/${lab.labSlug}`
    describe(slug, () => {
      it('solution 으로 모든 과제가 통과한다', () => {
        const r = check(slug, ['--from', 'solution'])
        expect(r.status, r.stdout + r.stderr).toBe(0)
        expect(r.stdout).toContain(`결과: ${lab.data.tasks.length}/${lab.data.tasks.length} 과제 통과`)
      }, 600_000)

      for (const task of lab.data.tasks) {
        it(`starter 로는 ${task.id} 가 실패한다`, () => {
          const r = check(slug, ['--from', 'starter', '--task', task.id])
          expect(r.status, r.stdout + r.stderr).toBe(1)
          expect(r.stdout).toContain('[실패]')
        }, 300_000)
      }
    })
  }
})
