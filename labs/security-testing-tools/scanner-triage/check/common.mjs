import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { scopeProblems } from './scope.mjs'

/** 작업 폴더의 scope.yaml 을 검사한다. @returns {string[]} 문제 목록 */
export function checkScopeFile(workDir) {
  const file = path.join(workDir, 'scope.yaml')
  if (!fs.existsSync(file)) return ['scope.yaml 이 없습니다. npm run lab 으로 작업 폴더를 만드세요']
  let data
  try {
    data = loadYaml(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    return [`scope.yaml 의 YAML 문법 오류: ${e.message.split('\n')[0]}`]
  }
  return scopeProblems(data)
}
