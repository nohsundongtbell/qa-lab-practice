import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { resetSut } from '../../../../scripts/lib/sut.mjs'
import { BEHAVIORS, makeClient, runBehaviors, withProxy } from './mitm-lab.mjs'

const ctx = loadLabContext()
await resetSut(ctx.baseUrl)
const r = await withProxy({ repoRoot: ctx.repoRoot, labDir: ctx.labDir, addonFile: path.join(ctx.workDir, 'addon.py') }, (proxyUrl) =>
  runBehaviors({ proxy: makeClient(proxyUrl), direct: makeClient(ctx.baseUrl) }),
)
if (!r.ok) {
  finish({ passed: false, message: r.message, details: r.logs ? r.logs.split('\n').slice(-8) : [], hints: ['work/addon.py 의 문법과 mitmproxy 애드온 형식(addons = [...])을 확인하세요.'] })
} else {
  for (const b of r.value) console.log(`  ${b.ok ? '[통과]' : '[실패]'} ${b.title}${b.ok ? '' : `\n         → ${b.reason}`}`)
  const ok = r.value.filter((b) => b.ok).length
  const min = ctx.pass.min_correct ?? BEHAVIORS.length
  finish({
    passed: ok >= min,
    message: `동작 ${BEHAVIORS.length}개 중 ${ok}개 구현 (기준 ${min}개 이상)`,
    hints: [
      '요청을 바꾸려면 request(self, flow) 에서 flow.request.headers[...] 를 고치고, 응답을 바꾸거나 직접 만들려면 response / request 에서 flow.response 를 다룹니다.',
      'request 훅에서 flow.response 를 채우면 요청은 앱에 전달되지 않고 그 응답이 바로 돌아갑니다 (http.Response.make(상태코드, 본문, 헤더)).',
      '요청 수를 세려면 애드온 객체(self)에 카운터를 두세요. 경로는 flow.request.path 로 비교합니다.',
    ],
  })
}
