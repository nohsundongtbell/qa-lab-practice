import fs from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { checkWorkflow } from './workflow-rules.mjs'

const ctx = loadLabContext()
const file = path.join(ctx.workDir, 'quality.yml')
if (!fs.existsSync(file)) finish({ passed: false, message: 'quality.yml 이 없습니다. npm run lab 으로 작업 폴더를 만드세요' })
else {
  let doc
  try {
    doc = load(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    doc = undefined
    finish({ passed: false, message: `quality.yml 의 YAML 문법 오류: ${e.message.split('\n')[0]}`, hints: ['들여쓰기는 공백만 쓰고(탭 금지), 목록은 "- " 로 시작합니다.'] })
  }
  if (doc !== undefined) {
    const results = checkWorkflow(doc)
    for (const r of results) console.log(`  ${r.problem ? '[실패]' : '[통과]'} ${r.id} ${r.title}${r.problem ? `\n         → ${r.problem}` : ''}`)
    const failed = results.filter((r) => r.problem)
    finish({
      passed: failed.length === 0,
      message: failed.length === 0 ? `워크플로 규칙 ${results.length}개를 모두 지킵니다` : `워크플로 규칙 ${results.length}개 중 ${failed.length}개를 지키지 않습니다`,
      hints: ['규칙의 뜻은 README 의 표를 보세요. 실패한 규칙 하나씩 고치고 다시 채점하면 됩니다.', 'on: 키는 YAML 에서 그대로 on: 으로 씁니다. 목록 형식([push, pull_request])으로는 push 의 branches 를 정할 수 없으니 맵 형식으로 쓰세요.'],
    })
  }
}
