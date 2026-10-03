# 장바구니 도메인으로 단위·통합 테스트 쓰기

> 이 랩은 Docker나 대상 앱 없이 **Node.js만으로** 풉니다. (QA 숍 앱은 필요 없습니다.)

## 목표
- **작성한다**: AAA 구조의 단위 테스트로 순수 함수의 경계와 잘못된 입력을 검증한다.
- **대체한다**: 스텁·스파이·목으로 외부 의존성(결제, 메일, 저장소)을 바꿔 끼워 통합 흐름을 테스트한다.
- **통제한다**: 시계와 난수를 테스트가 직접 통제해 플래키 테스트를 결정적인 테스트로 고친다.

채점은 "테스트가 많은가"가 아니라 **내 테스트가 코드의 결함을 잡아내는가**로 합니다. 채점기가 정상 구현에서는 내 테스트가 통과하는지 확인하고, 코드를 일부러 고장 낸 구현(뮤턴트)에서는 실패하는지 확인합니다. 고장 난 구현을 실패시킬수록(= **처치**) 좋은 테스트입니다.

## 선수 모듈
- QA-Lab 모듈 [`dev-knowledge`](https://qa-lab.pages.dev/module/dev-knowledge/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`unit-integration-testing / what-is-unit-testing`](https://qa-lab.pages.dev/lesson/unit-integration-testing/what-is-unit-testing/) — t1
- [`unit-integration-testing / mocks-stubs-spies`](https://qa-lab.pages.dev/lesson/unit-integration-testing/mocks-stubs-spies/) — t2
- [`unit-integration-testing / handling-nondeterminism`](https://qa-lab.pages.dev/lesson/unit-integration-testing/handling-nondeterminism/) — t3
- [`unit-integration-testing / coverage-report-pitfalls`](https://qa-lab.pages.dev/lesson/unit-integration-testing/coverage-report-pitfalls/) — 커버리지가 높아도 약한 테스트 (이어서 구조 기반 테스트 실습으로)

## 소요 시간
약 100분 (과제당 30분 안팎)

## 준비물
- Node.js 24 LTS와 저장소 루트의 `npm ci` ([설치 안내](../../../README.md)). Docker는 필요 없습니다.
- 테스트 도구는 [Vitest](https://vitest.dev/)입니다. 저장소에 이미 설치되어 있습니다.

시작하기:

공통

```bash
npm run lab -- unit-integration-testing/cart-domain
```

작업 폴더 `labs/unit-integration-testing/cart-domain/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `src/shipping.mjs`, `src/grade.mjs` | t1 대상: 배송비, 회원 등급·등급 할인 (순수 함수) |
| `src/checkout.mjs` | t2 대상: 결제 → 주문 저장 → 메일 (외부 의존성을 **주입**받음) |
| `src/voucher.mjs` | t3 대상: 바우처 발급·만료·상담 시간 (시계와 난수를 **직접** 씀) |
| `tests/t1-pure.test.mjs` 등 | 시작용 테스트 뼈대. **이 파일들을 고치고 채웁니다** |

`src/`는 읽기만 하세요. 채점기는 항상 원본 `src/`로 실행하므로 고쳐도 소용없습니다. 테스트 파일 이름은 `t1-`, `t2-`, `t3-`로 시작해야 해당 과제에서 채점됩니다(`t1-pure.test.mjs`, `t1-more.test.mjs`처럼 여러 파일도 됩니다).

내 테스트를 직접 돌려 보려면 (채점 전에 자주 실행하세요):

공통

```bash
npx vitest run --root labs/unit-integration-testing/cart-domain/work
```

파일을 저장할 때마다 자동으로 다시 실행하려면 `run` 대신 `--watch`를 쓰세요(`npx vitest --root …/work`).

## 과제

### t1. 단위 테스트 — 배송비와 등급
- 파일: `work/tests/t1-*.test.mjs`
- 대상: `shippingFee`, `gradeFor`, `gradeDiscount`
- 규칙은 소스의 주석과 코드, 그리고 [QA 숍 사양서 §1.3·§3·§5](../../../apps/shop/SPEC.md)에 있습니다.
- 기준: 뮤턴트 7개 중 **6개 이상** 처치
- 채점: `npm run check -- unit-integration-testing/cart-domain --task t1`

### t2. 통합 테스트 — 결제 흐름과 테스트 더블
- 파일: `work/tests/t2-*.test.mjs`
- 대상: `checkout` — 결제 게이트웨이에 청구하고, 승인되면 주문을 저장하고 메일을 보낸다.
- 뼈대의 `makeDeps()`가 의존성을 테스트 더블로 만들어 줍니다. 스텁(정해 둔 응답)과 스파이·목(호출 기록)을 구분해 쓰세요.
- 기준: 뮤턴트 7개 중 **6개 이상** 처치
- 채점: `npm run check -- unit-integration-testing/cart-domain --task t2`

### t3. 비결정적 요소 — 플래키 테스트 고치기
- 파일: `work/tests/t3-voucher.test.mjs`
- 대상: `issueVoucher`, `isExpired`, `isBusinessHours`
- 시작 파일의 테스트는 **가끔 실패**합니다. 먼저 여러 번 실행해 보고 왜 흔들리는지 찾으세요. 그다음 시계와 난수를 테스트가 직접 통제하는 결정적인 테스트로 고치고, 나머지 규칙도 검증하세요.
- 채점기는 **시간대(UTC·서울·로스앤젤레스), 현재 시각, 난수가 다른 세 가지 환경**에서 내 테스트를 실행합니다. 어느 한 환경에서라도 실패하면 플래키로 봅니다.
- 기준: 세 환경에서 모두 통과하고 뮤턴트 6개 중 **5개 이상** 처치
- 채점: `npm run check -- unit-integration-testing/cart-domain --task t3`

### 채점 결과 읽는 법
| 표시 | 뜻 |
|---|---|
| `[통과] 정상 구현` | 내 테스트가 올바른 코드에서 모두 통과함 (유효한 테스트) |
| `[실패] 정상 구현에서 …` | 올바른 코드에서 실패하는 테스트가 있음 → 기대값이 틀렸거나, 환경에 따라 결과가 바뀌는 테스트 |
| `[처치]` | 고장 난 구현에서 내 테스트가 실패함 → 그 결함을 잡을 수 있다는 뜻 |
| `[생존]` | 고장 난 구현에서도 내 테스트가 모두 통과함 → 이 함수의 어떤 동작이 검증되지 않고 있음 |

생존한 뮤턴트가 **어떻게** 고장 났는지는 알려 주지 않습니다. 어떤 함수인지만 알려 주니, 그 함수에서 검증하지 않은 동작을 스스로 찾으세요.

## 완료 기준
- [ ] t1: 정상 구현에서 모든 테스트 통과, 뮤턴트 6개 이상 처치
- [ ] t2: 정상 구현에서 모든 테스트 통과, 뮤턴트 6개 이상 처치
- [ ] t3: 세 가지 환경에서 모든 테스트 통과, 뮤턴트 5개 이상 처치

전체 채점:

공통

```bash
npm run check -- unit-integration-testing/cart-domain
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 무엇을 검증하지 않았을까</summary>

- **경계**: 코드에서 `>=`, `<`, `>` 같은 비교가 나오는 곳마다 "바로 아래 · 정확히 · 바로 위" 세 점을 시험했나요?
- **입력**: 잘못된 입력(음수, 소수, `NaN`)에서 예외가 나는지 `toThrow`로 검증했나요?
- **호출**: t2에서는 반환값만 보지 말고, 의존성이 **무엇으로, 몇 번** 호출되었는지(`toHaveBeenCalledWith`, `toHaveBeenCalledTimes`)와 **호출되지 않아야 할 때**(`not.toHaveBeenCalled`)를 확인했나요?
- **조합**: 도서산간 + 무료 배송처럼 두 규칙이 겹치는 경우는요?

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t1: 등급 경계는 세 곳(100,000 · 500,000 · 1,000,000)입니다. 할인액은 49.9원 같은 소수가 나오는 금액으로 시험하세요. 모든 등급의 할인율도 한 번씩 확인하세요.
- t2: 결제가 **거절**된 경우의 두 의존성(저장소, 메일)을 확인하세요. 승인된 경우에는 저장소에 넘긴 객체의 모든 필드와, 메일을 받는 사람이 맞는지를 보세요. 결제 금액은 상품 금액이 아니라 **배송비를 포함한** 금액입니다.
- t3: 시계는 `vi.useFakeTimers()`로 가짜로 바꾼 뒤 `vi.setSystemTime(...)`으로 정합니다. 난수는 `vi.spyOn(Math, 'random').mockReturnValue(...)`. 상담 시간처럼 **현지 시각**을 쓰는 코드는 `new Date('…+09:00')`처럼 시간대를 박아 넣으면 다른 시간대에서 깨집니다. `new Date(2026, 9, 5, 9, 0)`처럼 **현지 시각 생성자**를 쓰면 어디서 실행해도 같은 "현지 9시"가 됩니다. 만료는 "정확히 그 순간"과 1ms 뒤를 모두 시험하세요.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- unit-integration-testing/cart-domain --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`structural-testing-practice`](https://qa-lab.pages.dev/module/structural-testing-practice/) (실습 랩 준비 중)
- 같은 선수 관계의 다른 모듈: [`ai-cross-check`](https://qa-lab.pages.dev/module/ai-cross-check/) (실습 랩 준비 중)
