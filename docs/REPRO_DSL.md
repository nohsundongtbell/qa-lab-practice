# 재현 절차 쓰는 법 (repro 블록)

결함 리포트와 세션 노트의 **재현 절차**는 사람이 읽는 글과 함께, 채점기가 그대로 실행할 수 있는 `repro` 블록으로도 씁니다.
채점기는 이 블록을 실행해서 다음을 확인합니다.
- 결함이 없는 앱에서는 **기대대로** 동작한다.
- 결함이 있는 앱에서는 **기대와 다르게** 동작한다. 이렇게 되면 결함이 재현된 것입니다.

그래서 `expect`에는 **실제로 본 잘못된 값이 아니라, 사양(SPEC)대로라면 나와야 하는 값**을 적습니다.

````markdown
```repro
steps:
  - login: kim@example.com
  - quote: { items: [{ product: 1, qty: 1 }] }
    expect: { status: 200, json: { shippingFee: 0 } }
```
````

위 블록은 "김일반으로 로그인해 5만 원짜리 상품 1개의 금액을 미리 보면, 배송비가 0원이어야 한다"는 뜻입니다.

## 단계
한 단계에는 **동작 하나**와, 필요하면 `expect`·`save`·`now`를 붙입니다.

| 동작 | 예 | 하는 일 |
|---|---|---|
| `login` | `login: kim@example.com` | 로그인 (비밀번호 `qa-lab-1234`). 이후 요청에 토큰이 붙는다 |
| `logout` | `logout: true` | 로그아웃 |
| `signup` | `signup: { name: 홍길동, email: a@example.com, zipcode: '06236' }` | 회원 가입 (비밀번호 생략 시 `password123`) |
| `me` | `me: {}` | 내 정보 |
| `my_coupons` | `my_coupons: {}` | 내 쿠폰 목록 |
| `products` / `product` | `product: { id: 3 }` | 상품 목록 / 상품 하나 |
| `cart` | `cart: {}` | 장바구니 |
| `add_to_cart` | `add_to_cart: { product: 1, qty: 2 }` | 장바구니 수량 설정 |
| `remove_from_cart` | `remove_from_cart: { product: 1 }` | 장바구니에서 빼기 |
| `quote` | `quote: { items: [{ product: 1, qty: 2 }], coupon: SALE10, zipcode: '63000' }` | 금액 미리보기 (coupon·zipcode 선택) |
| `order` | `order: { coupon: SALE10 }` | 장바구니로 주문. 성공하면 주문 번호를 기억한다 |
| `pay` | `pay: {}` 또는 `pay: { card: 4000-0000-0000-0002 }` | 방금 만든 주문 결제 (카드 생략 시 승인되는 카드) |
| `cancel` / `refund` | `cancel: {}` | 방금 만든 주문 취소 / 환불 |
| `ship` / `deliver` | `ship: {}` | 방금 만든 주문 출고 / 배송 완료 (관리자 권한으로 자동 처리, 로그인은 그대로) |
| `get_order` / `orders` | `get_order: {}` | 방금 만든 주문 조회 / 내 주문 목록 |
| `grade` | `grade: { total_spent: 1000000 }` | 누적 구매액으로 등급 판정 |
| `delivery_estimate` | `delivery_estimate: { paid_at: '2026-10-07T15:00:00+09:00', zipcode: '06236' }` | 배송 예정일 계산 |
| `http` | `http: { method: POST, path: /api/quote, json: { … } }` | 원시 HTTP 요청 (위 동작으로 안 되는 경우) |

다른 주문을 대상으로 하려면 `pay: { order: 3 }`처럼 주문 번호를 줍니다.

## 기대 (`expect`)
- `status`: HTTP 상태 코드 (예: `200`, `400`, `409`)
- `json`: 응답 JSON의 **점(.) 경로**별 기대값. 적은 필드만 비교합니다.

```yaml
expect: { status: 422, json: { code: COUPON_NOT_APPLICABLE, details.reason: MIN_ORDER_NOT_MET } }
```

어떤 필드가 있는지는 API 문서(http://127.0.0.1:3000/docs)에서 확인합니다.

- `max_ms`: 응답 시간 상한(밀리초). 요청을 보낸 뒤 응답 본문을 다 받을 때까지 걸린 시간이 이 값을 넘으면 실패입니다. 기준값은 사양서의 성능 목표(§9)에서 가져옵니다.

```yaml
- products: {}
  expect: { status: 200, max_ms: 100 }
```

> 응답 시간은 내 컴퓨터의 부하에 따라 흔들립니다. 한 번의 요청으로 판정하는 `max_ms`는 "명백히 느린가"를 보는 용도이고, 분포(p95 등)는 성능 테스트 도구로 봅니다.

## 값 저장 (`save`)과 현재 시각 (`now`)
```yaml
- http: { method: POST, path: /api/orders, json: {} }
  save: { myOrder: id }              # 응답의 id 를 myOrder 로 저장
- http: { method: GET, path: '/api/orders/{{myOrder}}' }
  now: '2026-10-20T10:00:00+09:00'   # 이 요청만 "지금"을 이 시각으로 (시간대 필수)
```

## 자주 하는 실수
- **기대값에 실제로 본 잘못된 값을 적는다** → 결함이 없는 앱에서 실패하므로 채점에서 `[무효]`가 됩니다. 기대값은 사양대로 적습니다.
- **오타**(`expected:`, `qoute:`) → 채점기가 "알 수 없는 키"로 알려 줍니다. 조용히 넘어가지 않습니다.
- **우편번호를 따옴표 없이** `zipcode: 06236` → YAML이 숫자로 읽어 앞의 0이 사라집니다. `'06236'`처럼 따옴표로 감싸세요.
- 채점할 때마다 DB가 초기화된 상태에서 실행됩니다. 앞에서 내가 만든 주문·회원에 기대지 말고, 필요한 상태는 절차 안에서 만드세요.
