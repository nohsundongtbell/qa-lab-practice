// 배송 계획 (t3 분석용). 변수 fee 와 days 의 "정의(D)"와 "사용(U)"에 번호를 붙였습니다.
// 매개변수(weightKg, express, remote)는 분석 대상이 아닙니다.
export function packagePlan(weightKg, express, remote) {
  let fee = 3_000 // D1: fee 정의
  let days = 3 // D2: days 정의

  if (weightKg > 10) {
    fee = fee + 2_000 // U1: fee 사용  →  D3: fee 정의
  }
  if (express) {
    fee = fee * 2 // U2: fee 사용  →  D4: fee 정의
    days = 1 // D5: days 정의
  } else if (remote) {
    days = days + 2 // U3: days 사용  →  D6: days 정의
  }
  return { fee, days } // U4: fee 사용, U5: days 사용
}
