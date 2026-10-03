# 커버리지 리포트 읽기와 뮤테이션으로 약한 테스트 찾기

> 이 랩은 Docker나 대상 앱 없이 **Node.js만으로** 풉니다. (QA 숍 앱은 필요 없습니다.)

## 목표
- **읽는다**: 커버리지 리포트에서 실행되지 않은 분기를 찾아 줄·분기 커버리지를 100%로 끌어올린다.
- **의심한다**: 커버리지가 100%인 테스트도 결함을 놓칠 수 있음을 뮤테이션(코드를 일부러 고장 내 보는 것)으로 확인하고, 살아남는 뮤턴트를 처치하도록 테스트를 보강한다.
- **분석한다**: 순환 복잡도와 정의-사용 쌍을 직접 분석해 필요한 테스트 경로를 설계한다.

## 선수 모듈
- QA-Lab 모듈 [`dev-knowledge`](https://qa-lab.pages.dev/module/dev-knowledge/), [`unit-integration-testing`](https://qa-lab.pages.dev/module/unit-integration-testing/) — 실습: [장바구니 도메인으로 단위·통합 테스트 쓰기](../../unit-integration-testing/cart-domain/README.md)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`structural-testing-practice / coverage-tools-in-practice`](https://qa-lab.pages.dev/lesson/structural-testing-practice/coverage-tools-in-practice/) — t1
- [`structural-testing-practice / mutation-testing`](https://qa-lab.pages.dev/lesson/structural-testing-practice/mutation-testing/) — t2
- [`structural-testing-practice / path-and-data-flow-testing`](https://qa-lab.pages.dev/lesson/structural-testing-practice/path-and-data-flow-testing/) — t3

## 소요 시간
약 100분 (과제당 30분 안팎)

## 준비물
- Node.js 24 LTS와 저장소 루트의 `npm ci` ([설치 안내](../../../README.md)). Docker는 필요 없습니다.
- 테스트 도구는 [Vitest](https://vitest.dev/), 커버리지는 [Istanbul](https://istanbul.js.org/)(`@vitest/coverage-istanbul`)입니다. 저장소에 이미 설치되어 있습니다.

시작하기:

공통

```bash
npm run lab -- structural-testing-practice/coverage-and-mutation
```

작업 폴더 `labs/structural-testing-practice/coverage-and-mutation/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `src/coupon.mjs` | t1·t2 대상: 쿠폰 할인액 계산 |
| `src/order-status.mjs` | t1·t2 대상: 환불 정책 (7일 이내, 4일째부터 수수료, VIP 면제) |
| `src/package-plan.mjs` | t3 대상: 정의(D)·사용(U) 번호가 주석으로 붙은 배송 계획 함수 |
| `tests/coupon.test.mjs`, `tests/refund.test.mjs` | 시작용 테스트. **이 파일들을 고치고 새 파일을 더합니다.** `tests/` 안의 모든 `*.test.mjs`가 t1·t2에서 함께 실행됩니다 |
| `t3-analysis.yaml` | t3 답안 |

`src/`는 읽기만 하세요. 채점기는 항상 원본 `src/`로 실행합니다.

### 커버리지 직접 보기
저장소 루트에서 실행합니다.

공통

```bash
npx vitest run --root labs/structural-testing-practice/coverage-and-mutation/work --coverage
```

터미널에 표가 나오고, `work/coverage/index.html`을 브라우저로 열면 **실행되지 않은 분기가 색으로** 표시됩니다.

macOS / Linux (터미널)

```bash
open labs/structural-testing-practice/coverage-and-mutation/work/coverage/index.html
```

Windows (PowerShell)

```powershell
Start-Process labs/structural-testing-practice/coverage-and-mutation/work/coverage/index.html
```

## 과제

### t1. 커버리지 리포트 해석 — 줄 100% · 분기 100%
- 시작 테스트는 이미 **줄 커버리지 100%** 입니다. 그런데 분기 커버리지는 그렇지 않습니다. 리포트(HTML)에서 실행되지 않은 분기를 찾아 그 분기를 지나가는 테스트를 추가하세요.
- 기준: `coupon.mjs`와 `order-status.mjs` **각각** 줄 100% · 분기 100%
- 채점: `npm run check -- structural-testing-practice/coverage-and-mutation --task t1`

### t2. 뮤테이션 — 약한 테스트 보강
- t1을 통과해도 끝이 아닙니다. 채점기는 코드를 일부러 고장 낸 구현(뮤턴트) 11개에 대해 내 테스트를 실행합니다. 고장 난 구현에서 내 테스트가 **실패해야**(= 처치) 그 결함을 잡을 수 있다는 뜻입니다.
- 뮤턴트는 Stryker 같은 도구가 자동으로 만들어 주는 것과 같은 종류(비교 연산자 바꾸기, 상수 바꾸기, 조건 바꾸기 …)를 **미리 정해 둔** 것입니다. 어떻게 고장 냈는지는 알려 주지 않고, 어느 함수인지만 알려 줍니다.
- 기준: 뮤턴트 11개 중 **10개 이상** 처치
- 채점: `npm run check -- structural-testing-practice/coverage-and-mutation --task t2`
- 채점 결과에 내 테스트의 커버리지와 처치 수가 나란히 나옵니다. 커버리지는 100%인데 뮤턴트가 살아남는 경험을 해 보세요.

> Stryker를 직접 돌려 보는 것은 이 랩에 넣지 않았습니다. 이 저장소의 Vitest 버전(5.0.3)과 Stryker 10의 조합에서 뮤턴트가 코드에 반영되지 않는 문제를 확인했기 때문입니다 (`TODO: verify` — 호환되는 조합이 확인되면 추가합니다).

### t3. 순환 복잡도와 정의-사용 쌍
- `work/src/package-plan.mjs`의 `packagePlan`을 읽고 `work/t3-analysis.yaml`을 채웁니다.
  - `cyclomatic_complexity`: 순환 복잡도
  - `du_pairs`: 변수 `fee`와 `days`의 **정의-사용 쌍**. 소스 주석의 번호로 `D1-U1`처럼 씁니다. (`D1`에서 정의한 값이 정의가 덮어써지지 않은 어떤 실행 경로를 따라 `U1`에서 쓰이는 경우)
- 매개변수(`weightKg`, `express`, `remote`)는 분석 대상이 아닙니다.
- 기준: 순환 복잡도와 정의-사용 쌍이 **모두** 일치 (빠진 쌍도, 없는 쌍을 적는 것도 안 됩니다)
- 채점: `npm run check -- structural-testing-practice/coverage-and-mutation --task t3`
- 쌍을 다 찾았다면, 모든 쌍을 지나가는 테스트 입력이 최소 몇 개인지도 생각해 보세요(채점하지 않는 심화 질문입니다).

### 채점 결과 읽는 법
| 표시 | 뜻 |
|---|---|
| `[처치]` | 고장 난 구현에서 내 테스트가 실패함 |
| `[생존]` | 고장 난 구현에서도 내 테스트가 모두 통과함 → 이 함수에 검증하지 않은 동작이 있음 |
| `[맞음]` / `[다름]` (t3) | 분석 결과가 정답과 같음 / 다름. 정답 값은 알려 주지 않고 개수만 알려 줍니다 |

## 완료 기준
- [ ] t1: 두 파일 모두 줄 100% · 분기 100%
- [ ] t2: 정상 구현에서 모든 테스트 통과, 뮤턴트 10개 이상 처치
- [ ] t3: 순환 복잡도와 정의-사용 쌍 10개 모두 일치

전체 채점:

공통

```bash
npm run check -- structural-testing-practice/coverage-and-mutation
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 어디를 볼까</summary>

- t1: HTML 리포트에서 분홍·노란 배경(실행되지 않은 분기 표시)을 찾으세요. 한 줄에 `if (…) return …`이나 `a ? b : c`가 있으면 줄은 실행됐어도 **분기는 한쪽만** 실행됐을 수 있습니다. 조건이 `참`인 경우와 `거짓`인 경우를 모두 시험했나요?
- t2: 생존한 뮤턴트가 있는 함수에서, 내 테스트가 **정확한 값**을 확인하는 입력이 어떤 것이고 확인하지 않는 입력은 어떤 것인지 구분해 보세요. "호출했다"와 "맞는 값이 나왔다"는 다릅니다.
- t3: 순환 복잡도는 판단 지점(`if`, `else if`, `&&` …)의 수에서 시작합니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t1 (`order-status.mjs`): 배송 완료가 **아닌** 주문, 기한이 **지난** 주문, 수수료가 **붙는** 경우와 **안 붙는** 경우(VIP 포함)를 각각 시험하세요. (`coupon.mjs`): 정률 쿠폰이 최대 할인액에 **못 미치는** 경우가 빠져 있습니다.
- t2: 경계 비교(`<`, `>`)가 있는 곳은 "경계 바로 아래 · 정확히 · 바로 위" 세 점을 확인하세요. 소수가 나오는 계산(1,234.5원), 값의 상한을 막는 코드(할인액이 금액보다 크다면?), 특수한 경우(금액 0원, VIP가 아닌 다른 등급, 배송 완료가 아닌 여러 상태)를 확인하세요. 어서션(`expect`)이 반환값 전체를 확인하는지도 보세요.
- t3: 변수 하나씩 따로 보세요. `fee`의 정의는 D1, D3, D4 세 곳입니다. D1이 어디서 쓰일 수 있는지 가능한 모든 경로(10kg 초과/이하 × 특급/일반 × 도서산간/아님)로 따라가 보세요. D3이 만들어졌다면 D1은 더 이상 도달하지 못합니다.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- structural-testing-practice/coverage-and-mutation --yes`

## 다음 랩
- QA-Lab 선수 관계상 `structural-testing-practice`를 선수로 갖는 모듈은 아직 없습니다.
- 복습: 이 랩의 선수 실습인 [장바구니 도메인으로 단위·통합 테스트 쓰기](../../unit-integration-testing/cart-domain/README.md)에서 만든 테스트를 이 랩의 뮤턴트 기준으로 다시 점검해 보세요.
