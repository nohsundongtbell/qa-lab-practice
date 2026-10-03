# SQL과 로그로 데이터 정합성 결함 찾기

> 대상 앱의 DB는 내 컴퓨터(`127.0.0.1`)에서만 열립니다. 이 랩은 DB에 **읽기 전용 계정**으로 접속하고, 앱의 실제 데이터와 분리된 랩 전용 스키마(`qa_lab_data`)만 읽습니다.

## 목표
- **조회한다**: SQL로 결과를 직접 확인한다 (집계, 조건, 정렬).
- **찾아낸다**: 화면(UI)으로는 보이지 않는 데이터 결함 — 고아 레코드, 중복, 합계 불일치 — 을 정합성 쿼리로 찾는다.
- **읽는다**: 웹 서버 로그와 애플리케이션 로그에서 오류의 규모와 시점을 파악하고, **상관 ID**로 두 로그를 연결해 실패한 요청의 증거를 찾는다.

## 선수 모듈
- QA-Lab 모듈 [`dev-knowledge`](https://qa-lab.pages.dev/module/dev-knowledge/), [`api-contract-testing`](https://qa-lab.pages.dev/module/api-contract-testing/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`data-checking-sql-logs-analytics / sql-for-verification`](https://qa-lab.pages.dev/lesson/data-checking-sql-logs-analytics/sql-for-verification/) — t1
- [`data-checking-sql-logs-analytics / data-integrity-queries`](https://qa-lab.pages.dev/lesson/data-checking-sql-logs-analytics/data-integrity-queries/) — t2
- [`data-checking-sql-logs-analytics / reading-logs`](https://qa-lab.pages.dev/lesson/data-checking-sql-logs-analytics/reading-logs/) — t3
- [`data-checking-sql-logs-analytics / logs-as-defect-evidence`](https://qa-lab.pages.dev/lesson/data-checking-sql-logs-analytics/logs-as-defect-evidence/) — t4

## 소요 시간
약 120분 (SQL 60분, 로그 60분)

## 준비물
- Docker Desktop, Node.js 24 LTS ([설치 안내](../../../README.md))
- 대상 앱 (이 랩은 앱의 결함 프로필과 무관합니다): `npm run up`
- SQL을 실행할 도구: 아래 `psql` 또는 아무 DB 도구(DBeaver, DataGrip 등)
- 로그를 볼 도구: 터미널 (`grep`·`jq` 또는 PowerShell), 또는 텍스트 편집기

시작하기:

공통

```bash
npm run up
npm run lab -- data-checking-sql-logs-analytics/sql-and-logs
```

`npm run lab`이 랩 데이터를 DB에 만들고(이미 있으면 건너뜁니다), 작업 폴더 `labs/data-checking-sql-logs-analytics/sql-and-logs/work/`에 다음을 복사합니다.

| 경로 | 용도 |
|---|---|
| `q1-…sql` ~ `q7-…sql` | t1·t2 답안: 쿼리를 이 파일에 씁니다 |
| `data/access.log`, `data/app.log` | t3·t4 분석 대상 로그 |
| `t3-logs.yaml`, `t4-evidence.yaml` | t3·t4 답안 |

### DB에 접속하기
읽기 전용 계정 `qa_reader`로 접속합니다 (비밀번호 `qa-reader`, 호스트 `127.0.0.1`, 포트 `55432`, DB `shop`). 이 계정은 `SELECT`만 할 수 있고, 데이터를 바꾸는 문장은 거부됩니다. 가장 간단한 방법은 컨테이너 안의 `psql`입니다.

공통

```bash
docker compose exec db psql -U qa_reader -d shop
```

`psql` 안에서 `\dt`로 테이블을, `\d orders`로 컬럼을 봅니다. 끝내려면 `\q`. DB 도구를 쓸 때는 접속 정보를 위 값으로 넣으세요.

### 테이블 (랩 전용 데이터)
> 테이블 이름은 QA-Lab 레슨의 스키마를 따랐고, 컬럼은 이 랩에 맞게 단순화했습니다. 제약(외래 키 등)이 없는 오래된 테이블이라 **데이터가 어긋날 수 있습니다.**

| 테이블 | 열 |
|---|---|
| `members` | `id`, `email`, `name`, `grade`, `created_at` |
| `products` | `id`, `name`, `price` |
| `orders` | `id`, `member_id`, `status`, `subtotal`, `grade_discount`, `coupon_discount`, `shipping_fee`, `total_amount`, `created_at` |
| `order_items` | `id`, `order_id`, `product_id`, `unit_price`, `qty`, `line_total` |

`orders.status`는 `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` 중 하나입니다. `created_at`은 한국 시각입니다(시간대 정보 없음).

### 채점 방식
`npm run check`는 `work/`의 `.sql` 파일을 **그대로 실행**해 결과를 정답과 비교합니다. 한 파일에 `SELECT`(또는 `WITH … SELECT`) 문 **하나**만 쓰세요. 주석(`--`)은 괜찮습니다. 행의 순서는 상관없습니다.

## 과제

### t1. SQL로 직접 확인하기
`work/q1-…`, `q2-…`, `q3-…` 세 파일에 쿼리를 씁니다. **열의 개수와 순서**를 지켜야 합니다 (열 이름은 자유).

| 파일 | 조회할 것 | 열 |
|---|---|---|
| `q1-status-count.sql` | 상태별 주문 수 (전체 주문) | `status`, 주문 수 |
| `q2-monthly-revenue.sql` | 월별 매출 | 월(`'YYYY-MM'` 문자열), 합계 |
| `q3-top-members.sql` | 구매액이 가장 큰 회원 3명 | `member_id`, 구매액 합계 |

**이 랩의 규칙**: 매출·구매액은 `orders.total_amount`의 합계이고, **취소(`CANCELLED`)·환불(`REFUNDED`) 주문은 뺍니다.** 월은 `created_at`의 연-월입니다.

채점: `npm run check -- data-checking-sql-logs-analytics/sql-and-logs --task t1`

### t2. 정합성 쿼리 — UI로는 보이지 않는 결함
이 데이터에는 의도적으로 이상치가 들어 있습니다. 네 가지를 찾는 쿼리를 `q4-…` ~ `q7-…`에 씁니다. 각 쿼리의 **첫 번째 열은 그 테이블의 `id`**여야 합니다 (다른 열을 덧붙여도 됩니다).

| 파일 | 찾을 것 | 반환 |
|---|---|---|
| `q4-orphan-items.sql` | **고아 레코드**: 가리키는 주문이 없는 `order_items` | 그 `order_items.id` |
| `q5-duplicate-orders.sql` | **중복 주문**: 같은 회원이 **같은 금액**으로 **10초 안에** 먼저 낸 주문이 있는 주문 | **나중** 주문의 `orders.id` |
| `q6-total-mismatch.sql` | **합계 불일치**: 저장된 `total_amount`가 `품목 합계(order_items.line_total의 합) − grade_discount − coupon_discount + shipping_fee`와 다른 주문 | `orders.id` |
| `q7-duplicate-members.sql` | **중복 회원**: 이메일이 **대소문자·앞뒤 공백을 무시하면** 같은 회원 중 나중에 가입한 계정 | `members.id` |

채점: `npm run check -- data-checking-sql-logs-analytics/sql-and-logs --task t2`

### t3. 로그 읽기 — 오류의 규모와 시점
`work/data/access.log`는 웹 서버(nginx)의 접속 로그입니다. 한 줄이 요청 한 건이고, 형식은 다음과 같습니다.

```text
127.0.0.1 - - [01/Oct/2026:14:11:03 +0900] "POST /api/orders/812/pay HTTP/1.1" 502 157 "-" "Mozilla/5.0" rt=3.020 rid=649bb766-…
```

`"…"` 바로 뒤의 숫자가 **상태 코드**, `rt=`는 처리 시간(초), `rid=`는 **요청 ID(상관 ID)**입니다. `work/t3-logs.yaml`을 채우세요.

| 키 | 값 |
|---|---|
| `total_requests` | 전체 요청 수 (로그 줄 수) |
| `count_5xx` | 상태 코드가 5xx인 응답 수 |
| `most_5xx_endpoint` | 5xx가 가장 많은 엔드포인트. 경로의 숫자 id는 `:id`로 바꿔서 같은 것끼리 묶습니다. 예: `GET /api/products/:id` |
| `first_5xx_at`, `last_5xx_at` | 첫·마지막 5xx가 기록된 시각 (한국 시각 `"HH:MM:SS"`, 따옴표로 감싸세요) |

로그를 보는 명령 예시입니다 (경로는 저장소 루트 기준).

macOS / Linux (터미널)

```bash
grep -c '' labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/access.log
grep -E '" 5[0-9]{2} ' labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/access.log | head
```

Windows (PowerShell)

```powershell
(Get-Content labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/access.log | Measure-Object -Line).Lines
Select-String -Path labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/access.log -Pattern '" 5\d\d ' | Select-Object -First 10
```

채점: `npm run check -- data-checking-sql-logs-analytics/sql-and-logs --task t3`

### t4. 상관 ID로 증거 찾기
고객 문의가 들어왔습니다: **"주문 842 결제가 안 됩니다."** 로그에서 증거를 찾아 `work/t4-evidence.yaml`을 채우세요.

| 키 | 값 |
|---|---|
| `request_id` | 주문 842의 **실패한(5xx)** 결제 요청의 요청 ID |
| `gateway_tx_id` | 그 요청이 결제 게이트웨이에 보낸 거래 ID (`GW-…`) |
| `attempts` | 그 요청에서 게이트웨이를 호출한 시도 횟수 |
| `error_code` | 실패 원인 오류 코드 |

방법: `access.log`에서 주문 842의 결제 요청(`POST /api/orders/842/pay`)을 찾고, 그 줄의 `rid=` 값을 `app.log`의 `reqId`로 검색해 그 요청이 남긴 모든 로그를 시간 순으로 읽습니다. `app.log`는 한 줄에 JSON 하나입니다. 주문 842에는 결제 요청이 **여러 번** 있을 수 있습니다.

macOS / Linux (터미널) — `jq`가 필요합니다 (`brew install jq`).

```bash
grep '/api/orders/842/pay' labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/access.log
jq -c 'select(.reqId == "여기에-요청-ID")' labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/app.log
```

Windows (PowerShell) — 추가 설치 없이 `ConvertFrom-Json`을 씁니다.

```powershell
Select-String -Path labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/access.log -Pattern '/api/orders/842/pay'
Get-Content labs/data-checking-sql-logs-analytics/sql-and-logs/work/data/app.log | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.reqId -eq '여기에-요청-ID' }
```

채점: `npm run check -- data-checking-sql-logs-analytics/sql-and-logs --task t4`

> 이 랩의 로그는 미리 만들어 둔 파일입니다. 대상 앱을 직접 사용하면 `npm run logs`로 같은 형식의 실제 로그(`app.log`)를 볼 수 있습니다.

### 채점 결과 읽는 법
| 표시 | 뜻 |
|---|---|
| `[맞음]` | 정답과 일치 |
| `[다름]` | 정답과 다름. SQL은 "정답 N행 중 M행 일치, 정답에 없는 행 K개"를 알려 줍니다. 정답 값은 알려 주지 않습니다 |
| `[형식]` | `SELECT` 문 하나가 아니거나 비어 있음 (데이터를 바꾸는 문장은 실행되지 않습니다) |
| `[오류]` | SQL 문법·테이블·열 오류 (DB가 알려 준 메시지를 보여 줍니다) |
| `[빈칸]` | 값을 채우지 않음 |

## 완료 기준
- [ ] t1: 쿼리 3개 모두 정답
- [ ] t2: 쿼리 4개 모두 정답
- [ ] t3: 항목 5개 모두 일치
- [ ] t4: 항목 4개 모두 일치

전체 채점:

공통

```bash
npm run check -- data-checking-sql-logs-analytics/sql-and-logs
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 어떤 쿼리를 써야 할까</summary>

- **고아 레코드**는 "짝이 없는 행"입니다. 두 테이블을 `LEFT JOIN`했을 때 오른쪽이 비어 있는 행을 찾는 방법이 있고, `NOT EXISTS`로 쓰는 방법도 있습니다.
- **중복**은 `GROUP BY … HAVING COUNT(*) > 1`이 떠오르지만, 이 랩의 중복은 **"거의 같은" 행**(시각이 몇 초 다름, 대소문자가 다름)이라 그대로는 찾지 못합니다. 같은 테이블을 자기 자신과 비교(self join, `EXISTS`)하거나, 비교할 값을 먼저 가공(`lower`, `trim`)하세요.
- **합계 불일치**는 품목을 주문별로 먼저 합산한 뒤(`GROUP BY order_id`) 주문과 비교하세요.
- 로그: `5xx`는 상태 코드의 첫 자리가 5인 것입니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t1 월별 매출: `to_char(created_at, 'YYYY-MM')`으로 월을 만들고 그걸로 `GROUP BY`하세요. 취소·환불을 뺄 때는 `WHERE status IN (…)` 또는 `NOT IN (…)`.
- t2 중복 주문: "같은 `member_id`, 같은 `total_amount`이고 `id`가 더 작은 주문이 있으면서 시각 차이가 10초 이하"인 주문을 찾습니다. 시각 차이는 `extract(epoch FROM (a.created_at - b.created_at))`의 절댓값으로 잴 수 있습니다. 반환하는 것은 **나중** 주문(`id`가 큰 쪽)입니다.
- t2 중복 회원: `lower(trim(email))`이 같고 `id`가 더 작은 회원이 있는 회원입니다.
- t3: 5xx 중에는 **결제와 관계없는** 것도 섞여 있을 수 있습니다. "첫 5xx 시각"은 5xx 전체의 첫 시각입니다.
- t4: 주문 842의 결제 요청은 두 줄입니다. 상태 코드가 5xx인 쪽의 `rid=`를 쓰세요. 거래 ID는 `payment failed` 줄에, 시도 횟수는 `gateway call` 줄의 수에 있습니다.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- data-checking-sql-logs-analytics/sql-and-logs --yes`

## 다음 랩
- QA-Lab 선수 관계상 `data-checking-sql-logs-analytics`를 선수로 갖는 모듈은 아직 없습니다.
- 이 랩에서 찾은 결함을 정식 리포트로 정리해 보려면: [재현되는 결함 리포트 쓰기와 결함 지표 계산](../../defect-management/defect-reports/README.md) — 로그의 상관 ID와 SQL 결과를 리포트의 증거로 쓸 수 있습니다.
