import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { toPosix } from './paths.mjs'

/**
 * labs/<module>/<lab>/ 폴더를 모두 찾는다 (lab.yaml 이 없어도 폴더면 포함 — validate 가 알려 준다).
 * @returns {Array<{ moduleDir: string, labSlug: string, dir: string, rel: string, yamlPath: string, hasYaml: boolean, data: any, parseError: string|null }>}
 */
export function discoverLabs(labsDir) {
  if (!fs.existsSync(labsDir)) return []
  const out = []
  const subdirs = (d) => fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  for (const moduleDir of subdirs(labsDir)) {
    for (const labSlug of subdirs(path.join(labsDir, moduleDir))) {
      const dir = path.join(labsDir, moduleDir, labSlug)
      const yamlPath = path.join(dir, 'lab.yaml')
      const hasYaml = fs.existsSync(yamlPath)
      let data = null
      let parseError = null
      if (hasYaml) {
        try {
          data = loadYaml(fs.readFileSync(yamlPath, 'utf8'))
        } catch (e) {
          parseError = e.message.split('\n')[0]
        }
      }
      out.push({ moduleDir, labSlug, dir, rel: toPosix(path.join('labs', moduleDir, labSlug)), yamlPath, hasYaml, data, parseError })
    }
  }
  return out
}

/** "module" 또는 "module/lab" 으로 랩을 찾는다. */
export function resolveLabs(labs, key) {
  if (!key) return labs
  const exact = labs.filter((l) => `${l.moduleDir}/${l.labSlug}` === key)
  if (exact.length) return exact
  return labs.filter((l) => l.moduleDir === key || l.labSlug === key)
}

/** 학습자가 푸는 작업 폴더. `npm run lab` 이 starter 를 여기로 복사한다 (git 무시). */
export const workDir = (lab) => path.join(lab.dir, 'work')
