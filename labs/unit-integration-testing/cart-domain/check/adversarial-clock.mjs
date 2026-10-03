/**
 * 채점용 "변덕스러운 환경": 실제 시계와 난수에 기대는 테스트를 잡아내기 위한 설정 파일이다.
 * - Date.now() / new Date() 는 부를 때마다 시각이 1~5ms 씩 더 흐른다 (실행마다 흐르는 폭이 다름)
 * - Math.random() 은 실행마다 다른 값을 낸다
 * vi.useFakeTimers() 나 vi.spyOn(Math, 'random') 으로 직접 통제한 테스트는 영향을 받지 않는다.
 */
const RealDate = Date
const seed = Number(process.env.QA_LAB_SEED ?? 1)
let offset = 0
const jitter = () => {
  offset += 1 + ((seed * 7 + offset * 13) % 5)
  return offset
}

class JitterDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(RealDate.now() + jitter())
    else super(...args)
  }

  static now() {
    return RealDate.now() + jitter()
  }
}
globalThis.Date = JitterDate

let state = (seed * 2654435761) % 4294967296 || 1
Math.random = () => {
  state = (state * 1664525 + 1013904223) % 4294967296 // 선형 합동 생성기
  return state / 4294967296
}
