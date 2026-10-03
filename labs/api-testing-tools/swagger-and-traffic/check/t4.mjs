import fs from 'node:fs'
import path from 'node:path'
import { finish } from '../../../../scripts/lib/check-kit.mjs'
import { loadLabContext } from '../../../../scripts/lib/lab-kit.mjs'
import { SheetError, formatSheet, gradeSheet, readSheet } from '../../../../scripts/lib/answer-sheet.mjs'
import { SPEC, answersFrom } from './pcap-analysis.mjs'

const ctx = loadLabContext()
try {
  const data = readSheet(path.join(ctx.workDir, 't4-answers.yaml'), 't4-answers.yaml')
  // 정답은 항상 원본 캡처(starter)에서 계산한다. 작업 폴더의 사본을 바꿔도 소용없다.
  const expected = answersFrom(fs.readFileSync(path.join(ctx.labDir, 'starter', 'capture.pcap')))
  const graded = gradeSheet(data, SPEC, expected)
  for (const line of formatSheet(graded)) console.log(line)
  const min = ctx.pass.min_correct ?? SPEC.length
  finish({
    passed: graded.correct >= min,
    message: `${SPEC.length}문제 중 ${graded.correct}개 정답 (기준 ${min}개 이상)`,
    hints: [
      'Wireshark 의 표시 필터(Display filter)를 쓰세요. HTTP 응답 상태는 http.response.code, 재전송은 tcp.analysis.retransmission, 응답 시간은 http.time 입니다.',
      'tshark 로도 같은 필터를 쓸 수 있습니다: tshark -r capture.pcap -Y "<필터>". tcpdump -A 는 패킷 내용을 글자로 보여 줍니다.',
      '재전송된 패킷은 같은 요청이 또 보인 것입니다. "처음 보낸 때"를 기준으로 시간을 재야 합니다.',
    ],
  })
} catch (err) {
  if (!(err instanceof SheetError)) throw err
  finish({ passed: false, message: err.message, hints: ['work/t4-answers.yaml 의 항목에 답을 적으세요.'] })
}
