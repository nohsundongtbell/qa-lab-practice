// t2. 품질 게이트를 작성하세요. 사용법: node gate.mjs <metrics.json>
// 종료 코드 0 = 통과, 1 = 차단. 정책(G1~G7)은 README 의 표를 따릅니다.
// 아래는 아무것도 막지 않는 뼈대입니다.
import fs from 'node:fs'

const metrics = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
console.log(`테스트 ${metrics.tests?.total}개`)

// TODO: 정책에 맞게 판정하고, 막을 때는 이유를 출력한 뒤 process.exit(1)
console.log('게이트 통과')
