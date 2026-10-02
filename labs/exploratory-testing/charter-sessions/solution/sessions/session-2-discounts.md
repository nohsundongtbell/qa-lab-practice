# 탐색 세션 노트

- 차터: 차터 2
- 테스터: 모범 답안
- 시작: 2026-10-03 15:00
- 시간 상자(분): 60
- 시간 배분(%): 준비 10 / 테스트 65 / 버그 조사 25

## 테스트 노트
- 15:00 회원 5명의 등급을 /api/members/me 로 확인. 쿠폰 6종의 조건을 표로 정리.
- 15:10 미리보기 금액과 주문 응답 금액을 같은 장바구니로 비교 → 같음. 그런데 주문 **상세**를 다시 조회하니 쿠폰 쓴 주문의 total 이 3,000원 많음 (버그 1). 쿠폰을 안 쓴 주문은 같음.
- 15:25 WELCOME3000 으로 주문한 뒤 다른 상품으로 다시 주문 → 또 적용됨 (버그 2). SALE10(정률)은 두 번째에 ALREADY_USED 로 막힘 → 정액 쿠폰만 문제.
- 15:38 이실버(1%)로 4,990원 상품 → 등급 할인 50원. 사양은 원 미만 내림 → 49원 (버그 3).
- 15:45 89,000원에 SALE10 → 8,900원 할인. 최대 5,000원이어야 함 (버그 4).
- 15:55 FIXED10000, EXPIRED5000, SOON5000 의 거절 사유는 모두 사양대로.

## 발견한 버그

### 버그 1: 쿠폰을 쓴 주문의 저장된 결제 금액에 쿠폰 할인이 빠져 있다
주문 상세의 total 이 subtotal − 할인 + 배송비와 맞지 않는다 (SPEC §3, §7.2). 정산·누적 구매액에 그대로 쓰이는 값이다.
- 증거: 주문 상세 응답 X-Request-Id `c0d4e8f2-1a3b-4c5d-8e9f-0a1b2c3d4e5f`, `"couponDiscount":3000,"shippingFee":3000,"total":53000`

```repro
steps:
  - login: kim@example.com
  - add_to_cart: { product: 1, qty: 1 }
  - order: { coupon: WELCOME3000 }
    expect: { status: 201, json: { couponDiscount: 3000, shippingFee: 3000, total: 50000 } }
  - get_order: {}
    expect: { status: 200, json: { total: 50000 } }
```

### 버그 2: 정액 쿠폰을 같은 회원이 여러 번 쓸 수 있다
SPEC §4 "발급된 쿠폰 1장은 한 번만 쓸 수 있다". 정률 쿠폰은 막히지만 정액 쿠폰은 두 번째 주문에도 적용된다.

```repro
steps:
  - login: kim@example.com
  - add_to_cart: { product: 1, qty: 1 }
  - order: { coupon: WELCOME3000 }
    expect: { status: 201 }
  - add_to_cart: { product: 2, qty: 1 }
  - order: { coupon: WELCOME3000 }
    expect: { status: 422, json: { code: COUPON_NOT_APPLICABLE, details.reason: ALREADY_USED } }
```

### 버그 3: 등급 할인이 반올림되어 1원 더 할인된다
SPEC §3 "모든 할인은 원 단위 미만을 버린다". 4,990원 × 1% = 49.9원 → 49원이어야 하는데 50원.

```repro
steps:
  - login: lee@example.com
  - quote: { items: [{ product: 3, qty: 1 }] }
    expect: { status: 200, json: { gradeDiscount: 49 } }
```

### 버그 4: 정률 쿠폰의 최대 할인액이 적용되지 않는다
SPEC §4 정률 쿠폰은 maxDiscount 를 넘지 않는다. SALE10(최대 5,000원)이 89,000원 주문에 8,900원 할인.

```repro
steps:
  - login: kim@example.com
  - quote: { items: [{ product: 6, qty: 1 }], coupon: SALE10 }
    expect: { status: 200, json: { couponDiscount: 5000 } }
```

## 이슈·질문
- 저장 금액 오류(버그 1)로 이미 배송 완료된 주문이 있다면 누적 구매액·등급도 틀렸을 것이다. 데이터 정정 범위를 데이터 점검 랩에서 SQL 로 확인할 수 있다.
- 등급 할인과 쿠폰을 함께 쓸 때 할인 합계가 상품 금액을 넘는 경우를 아직 못 봤다.
