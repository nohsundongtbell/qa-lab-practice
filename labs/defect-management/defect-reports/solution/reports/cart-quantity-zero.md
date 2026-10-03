# 장바구니 수량 0이 오류 없이 저장된다

- 심각도: S3
- 우선순위: P3
- 발견 환경: QA 숍 로컬, 결함 프로필 beginner, 2026-10-03, macOS 15 / Safari 19
- 관련 사양: SPEC §2 장바구니 — 수량 1개 이상 99개 이하

## 재현 절차
1. `kim@example.com` 으로 로그인한다.
2. 상품 1번의 수량을 0으로 장바구니에 담는다 (API `PUT /api/cart/items/1`, 본문 `{"qty":0}`).

```repro
steps:
  - login: kim@example.com
  - add_to_cart: { product: 1, qty: 0 }
    expect: { status: 400, json: { code: VALIDATION_ERROR } }
```

## 기대 결과
SPEC §2 "수량은 1개 이상 99개 이하. 범위를 벗어나면 400 VALIDATION_ERROR" → 400.

## 실제 결과
`200 {"productId":1,"qty":0}` — 장바구니에 수량 0인 줄이 생긴다. 수량 100은 400으로 거절된다(하한만 틀림).

## 심각도·우선순위 근거
- 심각도 S3: 0개 줄은 금액이 0원이라 바로 금전 피해는 없고, 사용자가 줄을 지우면 된다(우회 가능). 다만 0개 주문 데이터가 생길 수 있다.
- 우선순위 P3: 다음 정기 배포에 고친다.

## 증거
- 응답: `{"productId":1,"qty":0}`
- 이어서 `GET /api/cart` 에 `"qty":0` 인 줄이 보인다.
