# 쇼핑몰 규칙으로 테스트 케이스 설계하기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **설계한다**: 경계값 분석, 동등분할, 결정 테이블, 상태 전이 기법으로 QA 숍의 업무 규칙에 대한 테스트 케이스를 만든다.
- **찾아낸다**: 그 케이스로 앱에 숨어 있는 결함을 찾는다. 기법을 제대로 적용하면 **적은 케이스로** 결함이 드러난다.

채점은 "정답 케이스와 같은가"가 아니라 **내 케이스가 실제로 결함을 잡았는가**로 합니다.

## 선수 모듈
- QA-Lab 모듈 [`testing-essence`](https://qa-lab.pages.dev/module/testing-essence/)
- QA-Lab 모듈 [`requirements`](https://qa-lab.pages.dev/module/requirements/)

이 랩과 연결된 레슨입니다. 기법의 개념은 여기서 배웁니다.

- [`test-design / boundary-value-analysis`](https://qa-lab.pages.dev/lesson/test-design/boundary-value-analysis/) — t1, t2
- [`test-design / state-transition-decision-table`](https://qa-lab.pages.dev/lesson/test-design/state-transition-decision-table/) — t3, t4
- [`test-design / test-case-design-synthesis`](https://qa-lab.pages.dev/lesson/test-design/test-case-design-synthesis/) — 케이스 수 줄이기

## 소요 시간
약 120분 (과제당 20~40분)

## 준비물
- Docker Desktop, Node.js 24 LTS ([설치 안내](../../../README.md))
- 결함 프로필: `intermediate`
- **사양서**: [QA 숍 제품 사양서(SPEC)](../../../apps/shop/SPEC.md) — 기대 결과의 근거입니다. 앱이 사양과 다르면 사양이 맞습니다.
- CSV를 편집할 도구: 텍스트 편집기, Excel, Numbers, Google 스프레드시트 중 아무것이나

시작하기:

공통

```bash
npm run lab -- test-design/shop-rules
npm run up -- --profile intermediate
```

`labs/test-design/shop-rules/work/` 폴더에 케이스 표 4개가 복사됩니다. 이 폴더의 파일을 고칩니다. 폴더를 여는 방법은 다음과 같습니다.

macOS / Linux (터미널)

```bash
open labs/test-design/shop-rules/work
```

Windows (PowerShell)

```powershell
Start-Process labs/test-design/shop-rules/work
```

> **Excel로 저장할 때**: "CSV UTF-8(쉼표로 분리)"를 고르세요. 일반 "CSV"로 저장해도(Windows는 CP949) 채점기가 읽을 수 있습니다. 첫 줄(머리글)은 바꾸지 마세요.

상품 번호와 가격은 웹(http://127.0.0.1:8080)이나 http://127.0.0.1:3000/api/products 에서 확인합니다. 테스트에 쓸 수 있는 회원(`member` 열)은 다음과 같습니다(비밀번호는 모두 `qa-lab-1234`).

| member | 등급 | 우편번호 |
|---|---|---|
| `kim` | NORMAL | 06236 |
| `lee` | SILVER | 48058 |
| `park` | GOLD | 34126 |
| `choi` | VIP | 13529 |
| `jeju` | NORMAL | 63309 (도서산간) |

## 과제
과제마다 CSV 파일 하나에 케이스를 적습니다. **한 행이 테스트 케이스 하나**입니다. 모든 표에 공통인 열은 다음과 같습니다.
- `name`: 케이스 이름 (무엇을 확인하는지)
- `technique`: 사용한 기법 (예: `경계값`, `동등분할`, `결정표`, `상태전이`)

### t1. 경계값 분석 — 회원 등급 판정
- 파일: `work/t1-grade.csv`
- 대상: `GET /api/grades/evaluate?totalSpent=…` (SPEC §1.3)
- 열: `total_spent`(누적 구매액, 원) · `expected_grade`(`NORMAL`·`SILVER`·`GOLD`·`VIP`, 유효하지 않은 입력이면 `오류`)
- 기준: 서로 다른 결함 **1개 이상**, 케이스 **8개 이하**
- 채점: `npm run check -- test-design/shop-rules --task t1`

### t2. 동등분할·경계값 — 배송비와 수량
- 파일: `work/t2-shipping.csv`
- 대상: 금액 미리보기 `POST /api/quote` (SPEC §2, §3, §5)
- 열: `member` · `items`(`상품번호x수량`, 여러 개면 `;`로 구분. 예: `1x2;9x20`) · `zipcode`(비우면 회원 주소) · `expected_shipping_fee`(원, 수량이 유효하지 않아 요청이 거부되어야 하면 `오류`)
- 기준: 서로 다른 결함 **2개 이상**, 케이스 **12개 이하**
- 채점: `npm run check -- test-design/shop-rules --task t2`

### t3. 결정 테이블 — 쿠폰 적용
- 파일: `work/t3-coupon.csv`
- 대상: 쿠폰을 넣은 금액 미리보기 (SPEC §3, §4)
- 쿠폰 코드: 로그인 후 http://127.0.0.1:3000/api/members/me/coupons, 또는 웹의 장바구니 쿠폰 목록에서 확인합니다.
- 열: `member` · `items` · `coupon`(쿠폰 코드) · `expected_discount`(쿠폰 할인액(원), 쿠폰을 쓸 수 없어야 하면 사유 코드: `MIN_ORDER_NOT_MET`, `EXPIRED`, `NOT_STARTED`, `NOT_FOUND`, `NOT_OWNED`)
- 기준: 서로 다른 결함 **2개 이상**, 케이스 **12개 이하**
- 채점: `npm run check -- test-design/shop-rules --task t3`

### t4. 상태 전이 — 주문
- 파일: `work/t4-order-states.csv`
- 대상: 주문 상태 전이 (SPEC §7). 케이스마다 김일반(`kim`)이 상품 2번 1개로 **새 주문(PENDING)** 을 만든 상태에서 시작합니다.
- 열:
  - `steps`: 주문에 할 동작을 `>`로 이은 것
    - 동작: `pay`(결제), `pay_declined`(승인 거절 카드로 결제), `cancel`, `ship`(관리자 출고), `deliver`(관리자 배송 완료), `refund`
    - 시간 경과: `wait:일수` (예: `pay>ship>deliver>wait:3>refund`)
  - `expected`: **마지막 동작**의 결과. 그 앞의 동작은 모두 성공해야 합니다.
    - 주문 상태(`PENDING`·`PAID`·`SHIPPED`·`DELIVERED`·`CANCELLED`·`REFUNDED`)를 쓰면 마지막 동작 뒤의 상태를 확인합니다.
    - HTTP 상태 코드(예: `409`)를 쓰면 마지막 동작의 응답 코드를 확인합니다.
- 기준: 서로 다른 결함 **1개 이상**, 케이스 **12개 이하**
- 채점: `npm run check -- test-design/shop-rules --task t4`

> t2~t4는 채점하면서 DB를 여러 번 초기화합니다. 웹에서 직접 만든 주문 등은 지워집니다.

### 채점 결과 읽는 법
| 표시 | 뜻 |
|---|---|
| `[검출]` | 결함이 없는 버전에서는 통과하고, 결함이 있는 앱에서는 실패한 케이스. 잡은 결함 ID가 함께 나옵니다 |
| `[미검출]` | 올바른 케이스지만 결함을 드러내지 못함 (나쁜 것이 아닙니다. 회귀 테스트로 쓸모가 있습니다) |
| `[무효]` | **결함이 없는 버전에서도 기대와 다름** → 기대값이 사양과 다릅니다. 사양서를 다시 읽으세요 |
| `[오류]` | 행 형식이 잘못됨 |

## 완료 기준
- [ ] t1: 서로 다른 결함 1개 이상 검출, 케이스 8개 이하, 무효 케이스 0개
- [ ] t2: 서로 다른 결함 2개 이상 검출, 케이스 12개 이하, 무효 케이스 0개
- [ ] t3: 서로 다른 결함 2개 이상 검출, 케이스 12개 이하, 무효 케이스 0개
- [ ] t4: 서로 다른 결함 1개 이상 검출, 케이스 12개 이하, 무효 케이스 0개

전체 채점:

공통

```bash
npm run check -- test-design/shop-rules
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 어디를 볼까</summary>

- 사양서에서 **"이상", "미만", "이하", "~까지"** 같은 말에 밑줄을 그어 보세요. 거기가 경계입니다. (§1.3 등급, §2 수량, §4 최소 주문 금액·최대 할인액, §5 배송비, §7.1 환불 기한)
- §3의 계산 **순서**를 확인하세요. 무료 배송은 어떤 금액으로 판단하나요? 최소 주문 금액은 어떤 금액으로 판단하나요?
- 상태 전이는 표의 "허용되는 현재 상태" **바깥**도 시험해야 합니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- 경계값은 **경계 바로 아래 · 정확히 경계 · 바로 위**, 세 점을 시험합니다. 금액은 상품을 조합해 맞추세요. 상품 9번(1,000원)이 금액을 맞추기 좋고, 49,999원짜리 상품도 있습니다.
- 쿠폰은 조건을 나열해 결정 테이블을 만드세요: 쿠폰 종류(정액·정률), 최소 주문 금액 충족 여부, **등급 할인이 있는 회원인지**, 정률 할인액이 최대 할인액을 넘는지, 유효 기간.
- 주문은 상태마다 5가지 동작(pay, cancel, ship, deliver, refund)을 모두 생각해 보세요. 특히 "출고된 뒤"에는 무엇이 거부되어야 하나요?

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- test-design/shop-rules --yes`

## 다음 랩
- [탐색적 테스팅 — 차터 기반 세션](../../exploratory-testing/charter-sessions/README.md) (QA-Lab 선수 관계: `test-design` → [`exploratory-testing`](https://qa-lab.pages.dev/module/exploratory-testing/))
