# 같은 구매 시나리오를 Selenium WebDriver로 자동화하기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **옮긴다**: Playwright로 자동화했던 구매 흐름을 Selenium WebDriver(JavaScript)로 다시 작성한다.
- **기다린다**: Selenium은 자동으로 기다려 주지 않는다는 점을 직접 겪고, 명시적 대기(`driver.wait`)로 느린 응답과 화면 변형에서도 통과시킨다.
- **비교한다**: 두 도구에서 같은 시나리오를 짠 경험으로, 로케이터·대기·준비 코드가 어떻게 다른지 말할 수 있게 된다.

## 선수 모듈
- QA-Lab 모듈 [`ui-automation`](https://qa-lab.pages.dev/module/ui-automation/) — 실습: [QA 숍 화면을 Playwright로 안정적으로 자동화하기](../../ui-automation/shop-ui-flows/README.md)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`ui-automation-tools / selenium-webdriver-quickstart`](https://qa-lab.pages.dev/lesson/ui-automation-tools/selenium-webdriver-quickstart/) — t1

## 소요 시간
약 90분

## 준비물
- Docker Desktop, Node.js 24 LTS ([준비물 설치 안내](../../../README.md))
- **Google Chrome**(설치되어 있어야 합니다). 드라이버(chromedriver)는 Selenium Manager가 처음 실행할 때 자동으로 받으므로 인터넷 연결이 필요합니다.
- 이 랩이 쓰는 결함 프로필: `none`
- [selenium-webdriver](https://www.selenium.dev/documentation/webdriver/)는 저장소에 설치되어 있습니다. 테스트 실행기는 Vitest입니다.

공통

```bash
npm run lab -- ui-automation-tools/selenium-shop-flow
npm run up -- --profile none
```

<!-- TODO: verify — macOS(Apple Silicon)에서 Selenium Manager 가 받는 chromedriver -->

작업 폴더 `labs/ui-automation-tools/selenium-shop-flow/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `tests/t1-purchase.test.mjs` | 답안. 로그인 예시 하나와 TODO가 들어 있습니다. 파일 이름은 `t1-`로 시작하고 `.test.mjs`로 끝나야 채점됩니다 |
| `support/driver.mjs` | `createDriver()`(헤드리스 Chrome), `appUrl(hash)`, `PASSWORD`. **읽기만** 하세요(채점기는 원본으로 실행합니다) |

내 테스트 직접 실행(저장소 루트에서):

공통

```bash
npx vitest run --root labs/ui-automation-tools/selenium-shop-flow/work
```

화면 변형이나 지연 환경에서 돌려 보려면 환경 변수 `QA_LAB_UI_VARIANT`(`v1`·`v2`)와 `QA_LAB_LATENCY`(`none`·`slow`·`unstable`)를 지정합니다. `createDriver()`가 Chrome DevTools Protocol로 요청 헤더에 넣어 줍니다.

macOS / Linux (터미널)

```bash
QA_LAB_UI_VARIANT=v2 QA_LAB_LATENCY=unstable npx vitest run --root labs/ui-automation-tools/selenium-shop-flow/work
```

Windows (PowerShell)

```powershell
$env:QA_LAB_UI_VARIANT = "v2"; $env:QA_LAB_LATENCY = "unstable"; npx vitest run --root labs/ui-automation-tools/selenium-shop-flow/work
```

환경 조건(화면 변형 `v1`·`v2`, 응답 지연 `none`·`slow`·`unstable`)의 뜻은 [Playwright 랩의 설명](../../ui-automation/shop-ui-flows/README.md)을 보세요. 결함이 아니라 앱이 놓인 상황입니다.

## 과제

### t1. Selenium으로 구매 시나리오 자동화
- 할 일: `work/tests/t1-*.test.mjs`에 테스트 2개 이상을 씁니다.
  1. `kim@example.com`으로 로그인해 상품을 담고, 장바구니의 **결제 금액**을 확인하고, 주문해서 주문 상세의 **상태**를 확인한다.
  2. 비밀번호가 틀리면 오류 메시지가 보이고 로그인되지 않는다.
- 규칙: 고정 대기(`driver.sleep` 등)를 쓰지 않습니다. 검증(`expect`)은 4개 이상입니다.
- 기준: 화면 `v1`과 `v2`, 지연 `unstable`에서 **각각 3번** 실행해 모두 통과. 채점 시작 때 DB를 초기화합니다.
- 채점: `npm run check -- ui-automation-tools/selenium-shop-flow` (2~3분 걸립니다)

## 완료 기준
- [ ] t1: 두 화면 변형 × 불안정한 응답에서 3번씩, 총 6번 실행에 모두 통과

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 방향</summary>

- Selenium의 `findElement`는 **지금 있는 요소**만 찾습니다. 클릭 직후나 페이지 이동 직후에는 아직 없을 수 있습니다. `await driver.wait(until.elementLocated(By…), 5000)`로 나타나기를 기다리세요.
- 찾는 방법은 화면 구조가 아니라 사용자에게 보이는 이름으로: 버튼의 `aria-label`(`button[aria-label="…"]`), 버튼 글자·label 글자(XPath `//button[normalize-space()="…"]`, `//label[contains(., "…")]//input`), `data-testid`(`[data-testid="…"]`).
- 지금 값을 한 번 읽고 비교하면(`getText()` 후 `expect`) 화면이 아직 바뀌기 전의 값을 읽을 수 있습니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- 값이 기대대로 바뀔 때까지 기다리려면 `driver.wait(async () => (await el.getText()) === '기대값', 5000)`처럼 **조건 함수**를 넘기세요. 화면이 다시 그려져 요소가 사라졌다면(`StaleElementReferenceError`) 조건 안에서 요소를 **다시 찾으세요**.
- 테스트마다 새 브라우저를 띄우면(`beforeEach`/`afterEach`) 앞 테스트의 로그인 상태가 남지 않습니다.
- 기대 금액은 사양서로 계산하세요: 상품 금액 합 − 등급 할인 + 배송비([QA 숍 사양서 §3·§5](../../../apps/shop/SPEC.md)). 앱이 보여 주는 값을 복사하지 마세요.
- 수량 입력은 먼저 `clear()`한 뒤 `sendKeys`로 넣습니다.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- ui-automation-tools/selenium-shop-flow --yes`

## 다음 랩
- QA-Lab 선수 관계상 `ui-automation-tools`를 선수로 갖는 모듈은 아직 없습니다.
- 복습: Playwright 랩([QA 숍 화면을 Playwright로 안정적으로 자동화하기](../../ui-automation/shop-ui-flows/README.md))의 같은 시나리오와 비교해, 로케이터·대기·준비 코드가 어떻게 다른지 정리해 보세요.
