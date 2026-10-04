# QA 숍 화면의 접근성을 자동 스캔과 키보드 점검으로 확인하고 KWCAG 2.2로 보고하기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **스캔한다**: Playwright와 axe-core로 주요 화면을 자동 스캔하고, 사양서가 허용하지 않는 위반이 있으면 실패하는 테스트를 만든다.
- **분류한다**: 도구가 낸 결과를 진짜 위반·오탐·수동 확인 필요로 나누고 근거를 적는다.
- **직접 확인한다**: 키보드만으로 화면을 써 보며 자동 스캔이 놓친 문제를 찾는다.
- **보고한다**: 확인된 문제를 KWCAG 2.2 검사항목과 심각도에 매핑한 보고서를 쓴다.

채점은 "정답 파일과 같은가"가 아니라 **관찰 가능한 결과**로 합니다. t1은 내 스캔 테스트를 실제 브라우저에서 실행해 판정하고, t2~t4는 내가 쓴 표를 사양서 기준으로 채점합니다.

## 선수 모듈
- QA-Lab 모듈 [`nonfunctional-testing`](https://qa-lab.pages.dev/module/nonfunctional-testing/), [`exploratory-testing`](https://qa-lab.pages.dev/module/exploratory-testing/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`usability-accessibility-testing / wcag-2-2-verification`](https://qa-lab.pages.dev/lesson/usability-accessibility-testing/wcag-2-2-verification/) — t1~t4
- [`usability-accessibility-testing / screen-reader-testing`](https://qa-lab.pages.dev/lesson/usability-accessibility-testing/screen-reader-testing/) — t2·t4 (접근 가능한 이름과 레이블)
- [`nonfunctional-testing / wcag-accessibility`](https://qa-lab.pages.dev/lesson/nonfunctional-testing/wcag-accessibility/) — 이 랩을 먼저 해 볼 수도 있습니다

## 소요 시간
약 120분 (t1 40분, t2 20분, t3 30분, t4 30분)

## 준비물
- Docker Desktop, Node.js 24 LTS ([준비물 설치 안내](../../../README.md))
- 이 랩이 쓰는 결함 프로필: `advanced`
- [Playwright](https://playwright.dev/)와 [axe-core](https://github.com/dequelabs/axe-core)용 `@axe-core/playwright`는 저장소에 설치되어 있습니다. 브라우저만 한 번 받으면 됩니다.

공통

```bash
npm run lab -- usability-accessibility-testing/shop-a11y-audit
npm run up -- --profile advanced
npx playwright install chromium
```

<!-- TODO: verify-windows — 브라우저가 없는 새 PC 에서 npx playwright install chromium 다운로드 (axe 스캔 실행은 확인함) -->

작업 폴더 `labs/usability-accessibility-testing/shop-a11y-audit/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `tests/t1-axe-scan.spec.mjs` | t1 스캔 테스트 뼈대. `TODO`를 채웁니다. 파일 이름이 `t1-`로 시작하고 `.spec.mjs`로 끝나면 여러 파일도 됩니다 |
| `support/shop.mjs`, `support/env.mjs` | 로그인, 결제 전 주문 만들기, 결과 저장 도우미. **읽기만** 하세요(채점기는 원본으로 실행합니다) |
| `playwright.config.mjs` | 내 테스트를 직접 돌려 볼 때 쓰는 설정 |
| `triage.csv` | t2 분류표 (머리글만 있음) |
| `keyboard-checklist.csv` | t3 키보드 점검표 (화면×항목 칸이 비어 있음) |
| `report.csv` | t4 보고서 (머리글만 있음) |

KWCAG 2.2 검사항목 참조표는 랩 폴더의 [`reference/kwcag-2.2.md`](reference/kwcag-2.2.md)에 있습니다.

내 스캔 테스트 직접 실행(저장소 루트에서). 결과는 `work/results/<화면>.json`에 저장됩니다.

공통

```bash
npx playwright test --config labs/usability-accessibility-testing/shop-a11y-audit/work/playwright.config.mjs
```

결과 파일 보기:

macOS / Linux (터미널)

```bash
cat labs/usability-accessibility-testing/shop-a11y-audit/work/results/products.json
```

Windows (PowerShell)

```powershell
Get-Content labs/usability-accessibility-testing/shop-a11y-audit/work/results/products.json
```

## 점검 대상 화면
표의 `page` 열에는 아래 이름을 씁니다. 모든 점검은 기본 화면(`v1`) 기준입니다(사양서 §10).

| `page` | 화면 | 주소 | 상태 |
|---|---|---|---|
| `signup` | 회원 가입 | `http://127.0.0.1:8080/#/signup` | 로그아웃 |
| `login` | 로그인 | `#/login` | 로그아웃 |
| `products` | 상품 목록 | `#/products` | 로그인 (`kim@example.com`) |
| `cart` | 장바구니 | `#/cart` | 로그인, 상품을 담은 상태 |
| `orders` | 주문 내역 | `#/orders` | 로그인, 주문이 있는 상태 |
| `order-detail` | 주문 상세 | `#/orders/<번호>` | 로그인, **결제 전**(`PENDING`) 주문 |

결제 전 주문은 화면에서 주문하거나, fixture API로 만듭니다(`support/shop.mjs`의 `createPendingOrder`). 시드 계정은 [루트 README](../../../README.md)의 표를 보세요(비밀번호는 모두 `qa-lab-1234`).

## 과제
제품 사양서 [`apps/shop/SPEC.md`](../../../apps/shop/SPEC.md)의 **§10 화면 접근성**이 판단 기준(오라클)입니다.

### t1. axe-core로 주요 화면 자동 스캔
- 할 일: `work/tests/t1-axe-scan.spec.mjs`의 `TODO 1~4`를 채웁니다.
  1. `@axe-core/playwright`의 `AxeBuilder`로 화면을 분석한다.
  2. 결과를 `saveResults(화면 이름, 결과)`로 저장한다(t2의 재료).
  3. 결함이 없는 화면에서도 나오는 항목 가운데 **사양서가 허용하는 것만** 걸러 내고, 나머지 위반이 하나라도 있으면 실패하게 한다.
  4. 위 표의 6개 화면을 모두 스캔한다.
- 규칙: 테스트는 화면을 분석한 결과로만 판정합니다. 앱의 결함 설정을 읽거나 바꾸는 코드(`/__qa/…`, `X-QA-Lab-Defects`)는 쓰지 않습니다.
- 채점 방법: 채점기가 결함이 없는 앱에서 먼저 실행해 **모두 통과해야 유효**로 봅니다. 그다음 이 랩의 결함을 하나씩 켜서 내 테스트가 실패하면 그 결함을 검출한 것으로 셉니다.
- 기준: 결함이 없는 앱에서 통과하고, 자동 스캔으로 **서로 다른 결함 5개 이상** 검출
- 채점: `npm run check -- usability-accessibility-testing/shop-a11y-audit --task t1` (2~3분 걸립니다)

### t2. 스캔 결과 분류
- 할 일: 결함 프로필 `advanced`인 앱에서 t1 스캔을 돌리고, `work/results/*.json`의 `violations`와 `incomplete` 항목을 `work/triage.csv`에 한 줄씩 옮겨 분류합니다.

| 열 | 값 |
|---|---|
| `page` | 위 표의 화면 이름 |
| `rule` | axe 규칙 id (예: `image-alt`) |
| `target` | axe가 알려 준 요소 선택자 (결과 파일의 `targets` 중 하나) |
| `category` | `violation`(사양서를 어긴 것이 확실함) · `false-positive`(도구가 잡았지만 사양상 문제가 아님) · `needs-review`(도구가 판정을 미뤄 사람이 확인해야 함) |
| `reason` | 그렇게 분류한 근거 (사양서 절, 직접 확인한 내용) |

- 같은 문제가 여러 화면에 나오면 화면마다 한 줄씩 쓰고, 분류는 같아야 합니다. 값에 쉼표나 큰따옴표가 있으면 칸 전체를 큰따옴표로 감싸고, 안의 큰따옴표는 `""`로 씁니다.
- 기준: 맞게 분류한 항목 수에서 **오탐을 `violation`으로 분류한 항목 수를 뺀 점수**가 6 이상
- 채점: `npm run check -- usability-accessibility-testing/shop-a11y-audit --task t2`

### t3. 키보드 수동 점검
- 할 일: 마우스를 쓰지 않고 `Tab`·`Shift+Tab`·`Enter`·`Space`만으로 6개 화면을 써 보며 `work/keyboard-checklist.csv`의 칸마다 `result`를 적습니다.

| 항목 | 확인할 것 |
|---|---|
| `K1` | `Tab`·`Shift+Tab`만으로 화면의 모든 링크·버튼·입력 칸에 도달한다 |
| `K2` | 초점이 간 요소가 눈에 보이게 표시된다 |
| `K3` | 초점이 간 버튼·링크를 `Enter`(버튼은 `Space`도)로 실행할 수 있다 |
| `K4` | 초점이 한곳에 갇히지 않고, 화면 끝까지 갔다가 `Shift+Tab`으로 되돌아올 수 있다 |

- `result`: `pass` · `fail` · `na`(그 화면에 해당 요소가 없음). `fail`이면 `note`에 무엇을 눌렀고 어떻게 됐는지 적습니다.
- 직접 눌러 보고 확인한 것만 `fail`로 적습니다. 문제가 없는 칸을 `fail`로 적으면 **거짓 보고**로 셉니다.
- 기준: 자동 스캔이 놓친 결함 **2개 이상** 검출, 거짓 보고 1칸 이하
- 채점: `npm run check -- usability-accessibility-testing/shop-a11y-audit --task t3`

### t4. KWCAG 2.2 매핑 보고서
- 할 일: t2의 `violation`과 t3의 `fail`을 **문제 하나당 한 줄**로 `work/report.csv`에 정리합니다. 같은 문제가 여러 화면에 있으면 한 줄로 쓰고 `page`는 비워 둡니다.

| 열 | 값 |
|---|---|
| `source` | `axe`(자동 스캔) 또는 `keyboard`(t3 수동 점검) |
| `ref` | axe 규칙 id, 또는 키보드 점검 항목(`K1`~`K4`) |
| `page` | 화면 이름 (여러 화면이면 비움) |
| `kwcag` | KWCAG 2.2 검사항목 번호 (예: `0.0.0` 형식, 명칭을 함께 써도 됨) — [참조표](reference/kwcag-2.2.md) |
| `severity` | `상` · `중` · `하` (참조표의 심각도 기준) |
| `summary` | 사용자가 겪는 문제를 한 문장으로 |

- 오탐이나 문제가 없는 항목을 보고서에 넣으면 거짓 보고로 셉니다.
- 기준: 확인된 문제가 모두 있고, 검사항목과 심각도가 모두 맞은 문제 6개 이상, 거짓 보고 0줄
- 채점: `npm run check -- usability-accessibility-testing/shop-a11y-audit --task t4`

### 채점 결과 읽는 법
| 표시 | 뜻 |
|---|---|
| `[유효]` | 결함이 없는 앱에서 내 스캔 테스트가 모두 통과함 (t1) |
| `[검출]` / `[미검출]` + 결함 ID | 그 결함 하나만 켰을 때 내 테스트가 실패했는가 (t1). 결함의 내용은 알려 주지 않습니다 |
| 집계 | 어느 항목이 틀렸는지 대신 종류별 개수만 보여 줍니다(하나씩 바꿔 맞히기를 막기 위해) (t2·t3) |
| `[맞음]` / `[다시]` | 보고서의 문제별 검사항목·심각도 판정 (t4) |

## 완료 기준
- [ ] t1: 결함 없는 앱에서 통과, 자동 스캔으로 서로 다른 결함 5개 이상 검출
- [ ] t2: 분류 점수(맞은 항목 − 오탐을 위반으로 분류한 항목) 6 이상
- [ ] t3: 키보드 점검으로 결함 2개 이상 검출, 거짓 보고 1칸 이하
- [ ] t4: 확인된 문제를 모두 보고, 검사항목·심각도가 맞은 문제 6개 이상, 거짓 보고 0줄

전체 채점:

공통

```bash
npm run check -- usability-accessibility-testing/shop-a11y-audit
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 방향</summary>

- t1: 아무 결함이 없는 앱(`npm run up -- --profile none`)에서 먼저 스캔해 보세요. 그때도 나오는 항목이 "사양서가 허용하는 것"인지 사양서 §10에서 찾아보세요. 걸러 낼 때는 규칙 id와 요소(`nodes[].target`)를 함께 봅니다.
- t2: axe 결과의 `violations`는 도구가 "위반"이라고 본 것, `incomplete`는 도구가 판정하지 못한 것입니다. 도구의 판정과 사양서의 판정은 다를 수 있습니다.
- t3: 결제처럼 돈이 오가는 동작을 키보드만으로 **끝까지** 해 보세요. 그리고 초점이 지금 어디 있는지 눈으로 따라갈 수 있는지 보세요.
- t4: 검사항목은 "사용자가 무엇을 못 하게 되나"로 고릅니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t1: 로그인해야만 보이는 요소가 있습니다(상단 오른쪽). 주문 상세는 결제 전 주문이어야 버튼이 보입니다. 한 테스트에서 여러 화면을 스캔한다면 `expect.soft`로 앞 화면의 실패가 뒤 화면 스캔을 막지 않게 하세요.
- t2: 같은 규칙(`color-contrast` 등)이라도 요소가 다르면 다른 항목입니다. 판정이 미뤄진 항목은 색 추출 도구(브라우저 개발자 도구의 색 선택기 등)로 직접 확인한 뒤에도 표에는 `needs-review`로 남깁니다. 도구가 혼자 결론 내지 못한 항목이라는 기록이 중요합니다.
- t3: 클릭하면 동작하는데 `Tab`으로 갈 수 없는 요소가 있는지 보세요. 초점 테두리는 `Tab`을 누를 때만 나타나는 것이 정상입니다.
- t4: 참조표의 "이 랩에서 보는 것" 열과 "대응 WCAG 2.2" 열을 axe 결과의 `tags`(예: `wcag143`)와 대조해 보세요.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- usability-accessibility-testing/shop-a11y-audit --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈을 선수로 하는 모듈은 아직 없습니다. 같은 브라우저 자동화 도구로 화면 흐름을 다루는 [QA 숍 화면을 Playwright로 안정적으로 자동화하기](../../ui-automation/shop-ui-flows/README.md)를 해 볼 수 있습니다.
- 모듈 페이지: [`usability-accessibility-testing`](https://qa-lab.pages.dev/module/usability-accessibility-testing/)
