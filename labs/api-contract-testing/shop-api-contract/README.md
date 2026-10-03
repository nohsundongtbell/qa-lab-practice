# QA 숍 API의 계약을 컬렉션과 명세로 점검하기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **검증한다**: Postman 컬렉션에 상태 코드뿐 아니라 응답 본문(필드·타입·열거값·오류 형식)을 확인하는 테스트를 써서, 명세와 다르게 동작하는 API 응답을 찾는다.
- **자동화한다**: OpenAPI 명세와 실제 응답을 코드로 대조하는 계약 테스트를 작성한다.
- **측정한다**: 내 테스트가 명세의 오퍼레이션과 상태 코드를 얼마나 덮는지 세고, 빈틈을 메운다.

채점은 "명세와 다른 응답을 **실제로 잡아내는가**"로 합니다. 채점기가 결함 없는 앱에서는 내 테스트가 모두 통과하는지 확인하고, 결함을 하나씩 켠 앱에서는 실패하는지 확인합니다.

## 선수 모듈
- QA-Lab 모듈 [`dev-knowledge`](https://qa-lab.pages.dev/module/dev-knowledge/), [`automation-strategy`](https://qa-lab.pages.dev/module/automation-strategy/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`api-contract-testing / why-api-testing`](https://qa-lab.pages.dev/lesson/api-contract-testing/why-api-testing/) — 전체
- [`api-contract-testing / getting-started-with-postman`](https://qa-lab.pages.dev/lesson/api-contract-testing/getting-started-with-postman/) — t1
- [`api-contract-testing / contract-testing-with-openapi`](https://qa-lab.pages.dev/lesson/api-contract-testing/contract-testing-with-openapi/) — t2
- [`api-contract-testing / api-test-coverage`](https://qa-lab.pages.dev/lesson/api-contract-testing/api-test-coverage/) — t3

## 소요 시간
약 120분 (과제당 40분 안팎)

## 준비물
- Docker Desktop, Node.js 24 LTS ([준비물 설치 안내](../../../README.md))
- 이 랩이 쓰는 결함 프로필: `advanced`
- (선택) [Postman](https://www.postman.com/downloads/) 앱. 컬렉션 JSON 파일을 직접 고쳐도 됩니다.
- 컬렉션 실행 도구 [Newman](https://github.com/postmanlabs/newman)과 계약 검증 라이브러리 [Ajv](https://ajv.js.org/), 테스트 도구 [Vitest](https://vitest.dev/)는 저장소에 이미 설치되어 있습니다(`npm ci`).

시작하기:

공통

```bash
npm run lab -- api-contract-testing/shop-api-contract
npm run up -- --profile advanced
```

<!-- TODO: verify-windows — Newman 실행과 Postman 앱 가져오기 절차를 Windows 에서 확인 -->

작업 폴더 `labs/api-contract-testing/shop-api-contract/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `collection.json` | t1·t3 답안. 예시 요청 하나가 들어 있는 Postman 컬렉션(v2.1) |
| `tests/t2-contract.test.mjs` | t2 답안. 예시 테스트 하나가 들어 있습니다 |
| `support/contract.mjs` | t2 도구: `call`, `login`, `expectMatchesSpec`. **읽기만** 하세요(채점기는 원본으로 실행합니다) |

대상 앱의 API 명세는 [`apps/shop/api/openapi.yaml`](../../../apps/shop/api/openapi.yaml)이고, 실행 중인 앱의 문서(Swagger UI)는 http://127.0.0.1:3000/docs 입니다. 기대 결과의 근거는 [QA 숍 사양서](../../../apps/shop/SPEC.md)입니다. **명세와 앱이 다르면 명세가 맞습니다.**

### 컬렉션 직접 실행해 보기
저장소 루트에서 실행합니다. 컬렉션의 주소는 변수 `{{baseUrl}}`로 쓰고, 아래 명령이 값을 넣어 줍니다.

공통

```bash
npx newman run labs/api-contract-testing/shop-api-contract/work/collection.json --env-var baseUrl=http://127.0.0.1:3000
```

`advanced` 프로필로 띄운 앱에서는 결함에 걸린 검증이 **실패하는 것이 정상**입니다(결함을 찾은 것입니다). 내 검증이 틀리지 않았는지 확인하려면 `npm run up -- --profile none`으로 결함 없는 앱을 띄워 모두 통과하는지 보세요. 채점기는 헤더로 결함을 직접 켜고 끄므로 어느 프로필이어도 상관없습니다.

Postman 앱을 쓴다면 컬렉션을 **Import**해서 만들고, 끝나면 **Export → Collection v2.1**로 `work/collection.json`을 덮어씁니다.

### t2 테스트 직접 실행해 보기

공통

```bash
npx vitest run --root labs/api-contract-testing/shop-api-contract/work
```

## 과제

### t1. 컬렉션에 계약 검증 쓰기
- 할 일: `work/collection.json`에 요청을 추가하고, 요청마다 **Tests** 탭(`pm.test`)에 응답 본문 검증을 씁니다. 로그인 응답의 토큰은 `pm.collectionVariables.set('token', …)`로 저장해 이후 요청의 `Authorization: Bearer {{token}}` 헤더에 씁니다.
- 어떤 응답이 "계약"인지는 명세가 정합니다: 필수 필드, 타입, 열거값, 오류 응답 형식.
- 채점 중 대상 앱의 DB를 **초기화**합니다. 채점기는 모든 요청에 결함 설정 헤더를 붙이므로, 내가 띄운 프로필과 상관없이 같은 결과가 나옵니다.
- 기준: **결함이 없는 앱에서 검증이 모두 통과**하고, 서로 다른 결함 **4개 이상**을 검출
- 채점: `npm run check -- api-contract-testing/shop-api-contract --task t1`

### t2. OpenAPI 명세와 응답을 코드로 대조하기
- 할 일: `work/tests/t2-*.test.mjs`에 테스트를 씁니다. 도구 `support/contract.mjs`의 `expectMatchesSpec(method, path, res)`가 응답을 명세와 대조해 줍니다. 어떤 오퍼레이션을 어떤 입력으로 호출할지가 내 몫입니다.
- 테스트 파일 이름은 `t2-`로 시작해야 채점됩니다.
- 기준: **결함이 없는 앱에서 테스트가 모두 통과**하고, 서로 다른 결함 **4개 이상**을 검출
- 채점: `npm run check -- api-contract-testing/shop-api-contract --task t2`

### t3. 오퍼레이션·상태 코드 커버리지 높이기
- 할 일: t1의 컬렉션을 넓혀 명세의 오퍼레이션과 상태 코드를 덮습니다. 채점기가 컬렉션을 실행하면서 실제로 오간 요청을 세어, 오퍼레이션 커버리지와 **문서에 적힌 상태 코드를 실제로 받아 본 수**를 알려 줍니다. 호출하지 않은 오퍼레이션 목록도 보여 줍니다.
- 명세에 없는 경로나 문서에 없는 상태 코드는 세지 않습니다. 같은 요청을 여러 번 보내도 한 번으로 셉니다.
- 기준: **결함이 없는 앱에서 검증이 모두 통과**하고, 오퍼레이션 **19개 이상**(전체 21개), 상태 코드 **50개 이상**(전체 65개)
- 채점: `npm run check -- api-contract-testing/shop-api-contract --task t3`

## 완료 기준
- [ ] t1: 결함 없는 앱에서 모든 검증 통과, 서로 다른 결함 4개 이상 검출
- [ ] t2: 결함 없는 앱에서 모든 테스트 통과, 서로 다른 결함 4개 이상 검출
- [ ] t3: 오퍼레이션 19개 이상, 상태 코드 50개 이상 커버

전체 채점:

공통

```bash
npm run check -- api-contract-testing/shop-api-contract
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 무엇을 검증하지 않았을까</summary>

- 상태 코드가 `200`인 것만으로는 부족합니다. 응답 본문을 명세의 스키마와 하나씩 견주어 보세요: **필수 필드가 다 있는가, 타입이 맞는가, 값이 허용된 목록 안에 있는가.**
- 정상 응답만 계약이 아닙니다. 명세에는 `401`·`404`·`400` 같은 **오류 응답**의 형식도 정의되어 있습니다. 일부러 잘못된 요청을 보내 보세요.
- 같은 데이터를 돌려주는 API가 여러 개일 때(목록과 상세, 생성과 조회) 응답 형식이 서로 같은지도 확인해 보세요.
- 입력이 잘못되었을 때 서버가 "잘못된 요청"(`4xx`)이 아니라 "서버 오류"(`5xx`)로 답하는 것도 계약 위반입니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t1: 주문 응답을 검증하려면 먼저 로그인 → 장바구니 담기 → 주문 생성 순서가 필요합니다. 앞 요청의 응답에서 값을 꺼내 컬렉션 변수에 저장하세요.
- t2: `call('GET', '/api/orders/99999', { token })`처럼 없는 자원도 호출해 `expectMatchesSpec`에 넘겨 보세요. 호출 전에 `expect(res.status)`로 기대한 상태 코드인지 먼저 확인하면 실패 원인이 분명해집니다. 명세에 없는 상태 코드는 `expectMatchesSpec`이 알려 줍니다.
- t3: 관리자 API는 `admin@example.com`으로 로그인한 토큰이 필요하고, 일반 회원이 호출하면 `403`입니다. `409`는 "지금 상태에서는 할 수 없는 동작"입니다(예: 이미 결제한 주문을 다시 결제). 마지막 한 개 남은 한정판 상품(재고 1개)으로 재고 부족 상황을 만들 수 있습니다. 로그인 응답의 토큰은 사용자마다 변수 이름을 다르게 저장하세요.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- api-contract-testing/shop-api-contract --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`api-testing-tools`](https://qa-lab.pages.dev/module/api-testing-tools/) — 실습: [Swagger UI·mitmproxy·패킷 캡처로 API 트래픽 들여다보기](../../api-testing-tools/swagger-and-traffic/README.md)
- 같은 선수 관계의 다른 모듈: [`data-checking-sql-logs-analytics`](https://qa-lab.pages.dev/module/data-checking-sql-logs-analytics/) — 실습: [SQL 정합성 쿼리와 로그 분석](../../data-checking-sql-logs-analytics/sql-and-logs/README.md), [`ci-cd-continuous-testing`](https://qa-lab.pages.dev/module/ci-cd-continuous-testing/) (실습 랩 준비 중)
