import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { checkScopeFile } from './common.mjs'

const ctx = loadLabContext()
const problems = checkScopeFile(ctx.workDir)
finish({
  passed: problems.length === 0,
  message: problems.length === 0 ? '허가·범위 체크리스트를 확인했습니다. 대상은 내 컴퓨터와 이 저장소의 실습 코드뿐입니다' : '허가·범위 체크리스트가 완성되지 않았습니다',
  details: problems,
  hints: ['work/scope.yaml 의 주석을 모두 읽고 채우세요. 대상에는 127.0.0.1·localhost 주소나 labs/security-testing-tools/ 아래 경로만 쓸 수 있습니다.'],
})
