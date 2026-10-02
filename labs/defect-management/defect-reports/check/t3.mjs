import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { compareMetrics, computeMetrics } from './metrics.mjs'

// t3: 결함 지표 — 기준값은 랩의 data/ 원본으로 계산한다 (학습자가 작업 폴더의 사본을 고쳐도 영향 없음)
const ctx = loadLabContext()
const expected = computeMetrics(path.join(ctx.labDir, 'data', 'defect-history.csv'), path.join(ctx.labDir, 'data', 'module-size.csv'))
const file = path.join(ctx.workDir, 'metrics.yaml')
let answer
try {
  answer = loadYaml(fs.readFileSync(file, 'utf8'))
} catch (e) {
  finish({ passed: false, message: 'work/metrics.yaml 을 읽을 수 없습니다', details: [e.message.split('\n')[0]] })
  process.exit()
}
const results = compareMetrics(answer, expected)
for (const r of results) console.log(`  ${r.ok ? '[맞음]' : r.missing ? '[빈칸]' : '[다름]'} ${r.label}`)
const wrong = results.filter((r) => !r.ok)
finish({
  passed: wrong.length === 0,
  message: `지표 ${results.length - wrong.length}/${results.length}개 일치`,
  details: wrong.map((r) => `${r.label}: ${r.missing ? '값이 비어 있습니다' : '다시 계산해 보세요'}`),
  hints: ['README 의 "이 랩의 계산 규칙"을 확인하세요. 특히 어떤 행을 "유효 결함"에서 빼는지, 분모가 무엇인지가 지표마다 다릅니다.'],
})
