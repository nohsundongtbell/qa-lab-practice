import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { detectWithCollection, validateCollection } from './collection-grade.mjs'

const ctx = loadLabContext()
const valid = await validateCollection(ctx)
if (!valid.ok) finish(valid.result)
else {
  const { none } = valid
  console.log(`  [통과] 결함 없는 버전: 요청 ${none.requests}개, 검증 ${none.assertions}개 모두 통과`)
  const detected = await detectWithCollection(ctx, valid.collection, (id) => console.log(`  [검출] ${id}`))
  const min = ctx.pass.min_defects ?? 0
  finish({
    passed: detected.length >= min,
    message: `서로 다른 결함 ${detected.length}개 검출 (기준 ${min}개 이상), 요청 ${none.requests}개 · 검증 ${none.assertions}개`,
    hints: [
      '컬렉션은 "상태 코드가 200이다"만으로는 계약 위반을 못 잡습니다. 응답 본문의 필드가 있는지, 타입이 맞는지, 값이 열거형 안에 있는지까지 검증하세요.',
      '정상 응답뿐 아니라 오류 응답(404, 400)의 본문 형식도 계약입니다.',
      'README 의 "막혔을 때" 힌트를 차례로 열어 보세요.',
    ],
  })
}
