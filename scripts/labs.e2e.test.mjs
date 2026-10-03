/**
 * 랩 E2E: 실행 중인 대상 앱(SUT)에 대해 모든 ready/beta 랩을 실제로 채점한다.
 * - solution 으로는 모든 과제가 통과해야 한다
 * - starter 로는 과제 하나하나가 실패해야 한다 (시작 파일만으로 통과하는 과제가 없도록)
 * Docker 가 필요한 랩(requires: docker)은 SUT 가 꺼져 있거나 개발용 기능(ALLOW_DEV_TOOLS)이 없으면 건너뛴다.
 * Docker 가 필요 없는 랩은 SUT 없이 채점한다(CI 의 lab-ci 는 이런 랩에 앱을 띄우지 않는다).
 */
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { needsSut, selectE2eLabs } from './lib/e2e-labs.mjs'
import { paths } from './lib/paths.mjs'
import { readEnvFile } from './lib/env.mjs'
import { baseUrlFrom, probeSut } from './lib/sut.mjs'

const p = paths()
const sut = await probeSut(baseUrlFrom(readEnvFile(p.env)))
const sutReady = Boolean(sut && sut.profile !== null)
// CI 는 QA_LAB_E2E_ONLY=<모듈>/<랩> (쉼표로 여러 개)로 한 랩만 검증한다. 로컬에서 특정 랩을 건너뛰려면 QA_LAB_E2E_SKIP.
const labs = selectE2eLabs(p.labsDir)
const cli = path.join(p.root, 'scripts', 'cli.mjs')
const check = (slug, args) => spawnSync(process.execPath, [cli, 'check', slug, ...args], { encoding: 'utf8', cwd: p.root })

describe('랩 E2E', () => {
  for (const lab of labs) {
    const slug = `${lab.moduleDir}/${lab.labSlug}`
    describe.skipIf(needsSut(lab) && !sutReady)(slug, () => {
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
