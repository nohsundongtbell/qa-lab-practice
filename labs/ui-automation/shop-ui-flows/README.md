# QA 숍 화면을 Playwright로 안정적으로 자동화하기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **자동화한다**: 로그인부터 주문까지의 화면 흐름을 Playwright 테스트로 자동화한다.
- **견딘다**: 화면 구조(DOM)가 바뀌어도 깨지지 않는 로케이터를 쓴다.
- **안정시킨다**: 응답이 느리고 들쭉날쭉해도 반복 실행에서 늘 통과하도록 조건 기반으로 기다린다.
- **준비한다**: fixture API로 테스트 데이터를 한 번에 만들어, 화면 테스트를 짧고 독립적으로 쓴다.

채점은 내 테스트를 **실제 브라우저에서 실행**해서 합니다. "정답 코드와 같은가"가 아니라 아래 조건에서 통과하는지를 봅니다.

## 선수 모듈
- QA-Lab 모듈 [`dev-knowledge`](https://qa-lab.pages.dev/module/dev-knowledge/), [`automation-strategy`](https://qa-lab.pages.dev/module/automation-strategy/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`ui-automation / getting-started-with-playwright`](https://qa-lab.pages.dev/lesson/ui-automation/getting-started-with-playwright/) — t1
- [`ui-automation / resilient-locators`](https://qa-lab.pages.dev/lesson/ui-automation/resilient-locators/) — t2
- [`ui-automation / page-object-model`](https://qa-lab.pages.dev/lesson/ui-automation/page-object-model/) — t3
- [`ui-automation / wait-strategies`](https://qa-lab.pages.dev/lesson/ui-automation/wait-strategies/) — t3
- [`ui-automation / taming-flaky-ui-tests`](https://qa-lab.pages.dev/lesson/ui-automation/taming-flaky-ui-tests/) — t3
- [`ui-automation / api-fixture-test-data`](https://qa-lab.pages.dev/lesson/ui-automation/api-fixture-test-data/) — t4

## 소요 시간
약 180분 (과제당 30~60분)

## 준비물
- Docker Desktop, Node.js 24 LTS ([준비물 설치 안내](../../../README.md))
- 이 랩이 쓰는 결함 프로필: `none`
- [Playwright](https://playwright.dev/)는 저장소에 설치되어 있습니다. 브라우저만 한 번 받으면 됩니다(약 150MB).

공통

```bash
npm run lab -- ui-automation/shop-ui-flows
npm run up -- --profile none
npx playwright install chromium
```

<!-- TODO: verify-windows — npx playwright install chromium 과 headless 실행 -->

작업 폴더 `labs/ui-automation/shop-ui-flows/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `tests/t1-purchase.spec.mjs` … `t4-fixtures.spec.mjs` | 과제별 테스트 파일. 예시와 TODO가 들어 있습니다. 파일 이름은 `t1-`~`t4-`로 시작해야 해당 과제에서 채점됩니다(`t1-a.spec.mjs`, `t1-b.spec.mjs`처럼 여러 파일도 됩니다) |
| `pages/LoginPage.mjs` | t3 페이지 객체 뼈대. 화면마다 파일을 더하세요 |
| `support/env.mjs` | 공통 값(API 주소, 비밀번호). **읽기만** 하세요(채점기는 원본으로 실행합니다) |
| `playwright.config.mjs` | 내 테스트를 직접 돌려 볼 때 쓰는 설정. 채점은 자기 설정을 씁니다 |

내 테스트 직접 실행(저장소 루트에서):

공통

```bash
npx playwright test --config labs/ui-automation/shop-ui-flows/work/playwright.config.mjs
```

화면 변형(v2)이나 지연 환경(unstable)에서 돌려 보려면:

macOS / Linux (터미널)

```bash
UI_VARIANT=v2 LATENCY=unstable npx playwright test --config labs/ui-automation/shop-ui-flows/work/playwright.config.mjs
```

Windows (PowerShell)

```powershell
$env:UI_VARIANT = "v2"; $env:LATENCY = "unstable"; npx playwright test --config labs/ui-automation/shop-ui-flows/work/playwright.config.mjs
```

## 이 랩의 환경 조건
**결함이 아닙니다.** 앱이 놓인 상황을 바꾸는 장치이고, 채점기가 과제마다 정해서 켭니다.

| 조건 | 값 | 뜻 | 켜는 방법 |
|---|---|---|---|
| 화면 변형 `UI_VARIANT` | `v1`(기본), `v2` | 같은 화면을 다른 DOM 구조(클래스·감싸는 요소·순서·제목 수준)로 그린다. 보이는 글자, 접근 가능한 이름(레이블·`aria-label`), 역할, `data-testid`는 같다 | 주소 `http://127.0.0.1:8080/?ui=v2`, 또는 요청 헤더 `X-QA-Lab-UI-Variant: v2` |
| 응답 지연 `LATENCY_PROFILE` | `none`(기본), `slow`(요청마다 0.7초), `unstable`(대부분 0.1~0.3초, 약 30%는 1.2~2.5초) | API 응답이 느려진다 | 요청 헤더 `X-QA-Lab-Latency: unstable` |

Playwright에서는 `use: { extraHTTPHeaders: { … } }`로 브라우저의 모든 요청에 헤더를 붙일 수 있습니다(`work/playwright.config.mjs` 참고). 화면에는 주소·헤더로 바꾼 변형이 `<html data-ui-variant>`로 표시됩니다.

## fixture API (로컬 전용)
화면을 여러 번 눌러야 만들 수 있는 상태를 한 번의 호출로 만듭니다. API 주소(`http://127.0.0.1:3000`)로 보냅니다.

`POST /__admin/fixtures/orders`

```json
{ "email": "park@example.com", "status": "DELIVERED", "items": [{ "productId": 1, "qty": 2 }], "deliveredHoursAgo": 1 }
```

- `status`: `PENDING` · `PAID` · `SHIPPED` · `DELIVERED` · `CANCELLED` · `REFUNDED`
- `deliveredHoursAgo`(선택, 기본 1): 배송 완료가 몇 시간 전인지. 168(7일)을 넘으면 환불 기간이 지난 주문이 됩니다
- 응답: `201 { "id": 주문번호 }`. 재고와 쿠폰은 건드리지 않습니다. 금액은 사양서 §3대로 계산됩니다

## 과제
모든 채점은 시작할 때 **DB를 초기화**합니다. 시드 계정은 [루트 README](../../../README.md)의 표를 보세요.

### t1. 구매 흐름 자동화
- 할 일: `work/tests/t1-*.spec.mjs`에 테스트 2개 이상을 씁니다.
  1. `kim@example.com`으로 로그인해 상품을 담고, 장바구니의 **결제 금액**을 확인하고, 주문해서 주문 상세의 **상태**를 확인한다.
  2. 비밀번호가 틀리면 오류 메시지가 보이고 로그인되지 않는다.
- 기준: 화면 `v1`에서 모두 통과하고, 검증(`expect`)이 4개 이상
- 채점: `npm run check -- ui-automation/shop-ui-flows --task t1`

### t2. 화면 구조가 바뀌어도 통과하는 로케이터
- 할 일: `work/tests/t2-*.spec.mjs`에 테스트 2개 이상을 씁니다(상품 카드에서 상품 담기, 장바구니에서 수량 변경·삭제). 시작 파일의 예시는 v1에서만 통과합니다. 왜 v2에서 깨지는지 확인하고 로케이터를 고치세요.
- 테스트마다 다른 회원으로 로그인하면 서로의 장바구니에 영향을 주지 않습니다.
- 기준: 화면 `v1`과 `v2` **둘 다** 모두 통과하고, 검증 3개 이상
- 채점: `npm run check -- ui-automation/shop-ui-flows --task t2`

### t3. 페이지 객체와 안정적인 대기
- 할 일: `work/tests/t3-*.spec.mjs`에 테스트 2개 이상을 씁니다(구매 흐름, 새로 고침 뒤에도 이어지는 로그인). `work/pages/`에 화면별 페이지 객체(class)를 만들어 가져다 씁니다. 시작 파일의 예시는 고정 대기에 기대고 있어 지연 환경에서 가끔 실패합니다. 직접 여러 번 돌려 보세요.
- 규칙: `waitForTimeout`·`setTimeout`·`sleep` 같은 **고정 대기를 쓰지 않습니다**. 테스트가 `pages/`의 클래스를 가져와 씁니다. 검증 3개 이상.
- 기준: 지연 환경 `unstable`에서 **10번 반복해 모두 통과**
- 채점: `npm run check -- ui-automation/shop-ui-flows --task t3` (1~2분 걸립니다)

### t4. fixture로 테스트 데이터 준비하기
- 할 일: `work/tests/t4-*.spec.mjs`의 `test.fixme`를 풀고 테스트 2개 이상을 씁니다.
  1. 배송 완료된 주문을 fixture로 만들고, 주문 상세에서 환불을 요청하면 상태가 "환불됨"이 된다.
  2. 배송 완료 후 7일이 지난 주문은 환불이 거절되고 상태가 그대로다.
- 규칙: 테스트 데이터는 fixture API로 만듭니다. 검증 3개 이상.
- 기준: **2번 반복해도 모두 통과**(테스트가 서로, 그리고 실행 순서에 독립). 건너뛴 테스트(`skip`·`fixme`)는 통과로 세지 않습니다.
- 채점: `npm run check -- ui-automation/shop-ui-flows --task t4`

### 채점 결과 읽는 법
| 표시 | 뜻 |
|---|---|
| `[통과]` / `[실패]` + 조건 | 그 조건(화면 변형·지연·반복)에서 내 테스트가 통과했는가 |
| `요소를 기다리다 시간 초과` | 로케이터가 요소를 못 찾았거나 기대한 상태가 되지 않음 |
| `기대와 다른 값` | 검증이 실패함. 실제 값은 정답을 알려 주게 되므로 숨깁니다. 사양서로 기대값을 다시 계산해 보세요 |

## 완료 기준
- [ ] t1: v1에서 테스트 2개 이상 통과, 검증 4개 이상
- [ ] t2: v1·v2 모두 통과
- [ ] t3: unstable 환경에서 10번 반복 모두 통과, 고정 대기 없음, 페이지 객체 사용
- [ ] t4: fixture 사용, 2번 반복 모두 통과

전체 채점:

공통

```bash
npm run check -- ui-automation/shop-ui-flows
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 방향</summary>

- t1·t2: 사용자가 보는 것으로 찾으세요. `getByRole('button', { name: … })`, `getByLabel(…)`, `getByText(…)`, 그리고 `getByTestId(…)`(`data-testid`는 두 변형에서 같습니다). `.card:nth-child(1)` 같은 CSS·순서·XPath는 구조가 바뀌면 깨집니다.
- t3: Playwright의 동작(`click`, `fill`)과 웹 우선 단언(`await expect(locator).toBeVisible()`)은 조건이 맞을 때까지 **알아서 기다립니다**. 시간을 정해 기다리지 말고 "무엇이 보이면 다음으로 간다"를 코드로 쓰세요.
- t4: 주문 상세 화면은 주소(`#/orders/<id>`)로 바로 열 수 있습니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t2: 상품 카드는 `getByTestId('product-card').filter({ hasText: '상품명' })`로 좁힌 뒤 그 안에서 버튼을 찾으세요. 수량 입력은 `getByRole('spinbutton', { name: '… 수량' })`입니다. 장바구니 수량은 입력 후 포커스를 벗어나야(`blur`) 반영됩니다.
- t3: 페이지를 **새로 열면**(`goto`, `reload`) 앱이 회원 정보를 다시 읽어 옵니다. 그 전에 "담기"를 누르면 로그인 화면으로 이동해 버립니다. 새로 열 때마다 "내 이름이 보일 때까지" 기다리는 동작을 페이지 객체의 `open()`에 넣으세요. 로그인이 끝났는지는 상단의 `data-testid="session-name"`으로 알 수 있습니다.
- t4: fixture는 `request.post(`${API_URL}/__admin/fixtures/orders`, { data: { … } })`로 호출하고, 돌려받은 `id`로 화면을 엽니다. 다른 회원으로 로그인해야 하는 주문이면 그 회원의 이메일을 fixture에 주고 같은 회원으로 로그인하세요.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- ui-automation/shop-ui-flows --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`ui-automation-tools`](https://qa-lab.pages.dev/module/ui-automation-tools/) — 실습: [같은 구매 시나리오를 Selenium WebDriver로 자동화하기](../../ui-automation-tools/selenium-shop-flow/README.md), [`ci-cd-continuous-testing`](https://qa-lab.pages.dev/module/ci-cd-continuous-testing/) (실습 랩 준비 중)
- 같은 선수 관계의 다른 모듈: [`test-automation-architecture`](https://qa-lab.pages.dev/module/test-automation-architecture/), [`testops-execution-and-observability`](https://qa-lab.pages.dev/module/testops-execution-and-observability/), [`mobile-testing`](https://qa-lab.pages.dev/module/mobile-testing/), [`mobile-testing-advanced`](https://qa-lab.pages.dev/module/mobile-testing-advanced/), [`ai-for-testing`](https://qa-lab.pages.dev/module/ai-for-testing/) (실습 랩 준비 중)
