# 탐색 세션 노트

- 차터: 차터 1
- 테스터: 모범 답안
- 시작: 2026-10-03 14:00
- 시간 상자(분): 45
- 시간 배분(%): 준비 15 / 테스트 60 / 버그 조사 25

## 테스트 노트
- 14:00 SPEC §7.1 표를 상태(6) × 동작(5) 표로 옮겨 그림. 허용 7칸, 나머지는 409여야 함.
- 14:08 PENDING → pay → PAID, PAID → cancel → CANCELLED 정상. PENDING → ship → 409 정상.
- 14:15 PAID → ship → SHIPPED 뒤 cancel → **200 CANCELLED** (버그 1). 같은 주문의 재고도 확인하기로 함.
- 14:24 한정판 머그컵(재고 1)을 주문 → 재고 0. 취소 → 상품 재고가 **0 그대로** (버그 2). 환불(배송 완료 후)은 재고가 돌아옴 → 취소 경로만 문제로 보임.
- 14:35 환불 기한: 배송 완료 후 7일 정확히(X-QA-Lab-Now 사용)는 환불됨, 8일은 409 → 정상.
- 14:40 쿠폰을 쓴 주문을 취소하면 쿠폰이 다시 쓸 수 있게 됨 → 정상.

## 발견한 버그

### 버그 1: 출고된(SHIPPED) 주문이 취소된다
SPEC §7.1 에 따르면 취소는 PENDING·PAID 에서만 가능하고 나머지는 409 여야 한다. SHIPPED 에서 취소가 200 으로 성공한다.
- 증거: 취소 응답 X-Request-Id `3f2b6c1e-8a4d-4c2f-9b1e-6d7a2e5f4c10`, 로그 `"url":"/api/orders/1/cancel"` → `"statusCode":200`

```repro
steps:
  - login: kim@example.com
  - add_to_cart: { product: 2, qty: 1 }
  - order: {}
    expect: { status: 201 }
  - pay: {}
    expect: { status: 200 }
  - ship: {}
    expect: { status: 200, json: { status: SHIPPED } }
  - cancel: {}
    expect: { status: 409, json: { code: INVALID_STATE_TRANSITION } }
```

### 버그 2: 주문을 취소해도 재고가 돌아오지 않는다
SPEC §7.4 "취소하면 주문 수량만큼 재고를 되돌린다". 재고 1인 상품을 주문 후 취소하면 재고가 0으로 남아 다시 살 수 없다.
- 증거: 상품 조회 응답 X-Request-Id `a71c9e02-4b5d-4e8f-8c3a-2f6b1d9e7a44`, `{"id":10,"stock":0}`

```repro
steps:
  - login: kim@example.com
  - add_to_cart: { product: 10, qty: 1 }
  - order: {}
    expect: { status: 201 }
  - cancel: {}
    expect: { status: 200, json: { status: CANCELLED } }
  - product: { id: 10 }
    expect: { status: 200, json: { stock: 1 } }
```

## 이슈·질문
- 출고 후 취소가 막혀야 한다면, 고객이 출고 후 취소를 원할 때의 절차(반품)는 사양에 없다. 기획 확인 필요.
- 취소 시 재고 문제가 동시 주문에서도 생기는지는 다음 세션(동시성)에서 본다.
