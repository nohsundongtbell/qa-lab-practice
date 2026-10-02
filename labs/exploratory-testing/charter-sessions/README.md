# 차터로 이끄는 탐색 세션과 결함 지도

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **작성한다**: 리스크를 바탕으로 탐색 차터를 쓴다.
- **탐험한다**: 차터 하나를 들고 시간 상자 안에서 탐색하며, 세션 노트에 관찰·버그·질문을 기록한다.
- **파고든다**: 화면에 바로 보이는 값 너머의 결함을 찾는다. 상태가 바뀐 뒤의 데이터, 숨은 변수(시각·등급), API로만 보이는 값이 대상이다. 로그의 상관 ID로 증거를 남긴다.

이 랩의 앱에는 결함이 여러 개 숨어 있습니다. 채점기는 세션 노트의 버그마다 재현 절차를 **실제로 실행해서** 진짜 결함인지 확인합니다.

## 선수 모듈
- QA-Lab 모듈 [`test-design`](https://qa-lab.pages.dev/module/test-design/) — 실습: [쇼핑몰 규칙으로 테스트 케이스 설계하기](../../test-design/shop-rules/README.md)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`exploratory-testing / what-is-exploratory-testing`](https://qa-lab.pages.dev/lesson/exploratory-testing/what-is-exploratory-testing/) — 시간 상자, 세션 노트
- [`exploratory-testing / charter-writing`](https://qa-lab.pages.dev/lesson/exploratory-testing/charter-writing/) — t1
- [`exploratory-testing / careful-observation`](https://qa-lab.pages.dev/lesson/exploratory-testing/careful-observation/) — 로그·응답 헤더 관찰
- [`exploratory-testing / hidden-variables`](https://qa-lab.pages.dev/lesson/exploratory-testing/hidden-variables/) — t3
- [`exploratory-testing / discovering-states-and-transitions`](https://qa-lab.pages.dev/lesson/exploratory-testing/discovering-states-and-transitions/) — t3
- [`exploratory-testing / exploring-without-ui`](https://qa-lab.pages.dev/lesson/exploratory-testing/exploring-without-ui/) — API 탐험
- [`test-design / experience-based-testing`](https://qa-lab.pages.dev/lesson/test-design/experience-based-testing/) — 오류 추정

## 소요 시간
약 120분 (차터 15분, 세션 30~60분 × 2회, 정리 15분)

## 준비물
- Docker Desktop, Node.js 24 LTS ([설치 안내](../../../README.md))
- 결함 프로필: `intermediate`
- [QA 숍 제품 사양서(SPEC)](../../../apps/shop/SPEC.md), [재현 절차 쓰는 법 (repro 블록)](../../../docs/REPRO_DSL.md)
- 타이머 (시간 상자용 — 휴대폰 타이머면 충분합니다)

시작하기:

공통

```bash
npm run lab -- exploratory-testing/charter-sessions
npm run up -- --profile intermediate
```

작업 폴더 `labs/exploratory-testing/charter-sessions/work/` 에 `charters.md`(차터 템플릿)와 `sessions/_TEMPLATE.md`(세션 노트 템플릿)가 복사됩니다. 세션마다 템플릿을 복사해 새 파일을 만드세요. 파일 이름은 영문으로 짓습니다(예: `sessions/session-1.md`).

### 관찰 도구
- **로그**: 탐색하는 동안 다른 터미널에서 로그를 띄워 두세요. 요청마다 `reqId`가 찍힙니다.

공통

```bash
npm run logs -- --follow
```

- **응답 헤더의 `X-Request-Id`**: 같은 요청의 로그 `reqId`와 값이 같습니다. 브라우저 개발자 도구의 Network 탭에서 보거나, 터미널에서 확인합니다.

macOS / Linux (터미널)

```bash
curl -si http://127.0.0.1:3000/api/products/10 | grep -i x-request-id
```

Windows (PowerShell)

```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/products/10).Headers['X-Request-Id']
```

- **API 문서**: http://127.0.0.1:3000/docs — 화면에 없는 값(저장된 주문 금액, 재고, 쿠폰 사용 시각)을 직접 조회할 수 있습니다.
- **현재 시각 바꾸기**: 요청 헤더 `X-QA-Lab-Now: 2026-10-07T15:00:00+09:00`을 붙이면 그 요청만 "지금"이 그 시각이 됩니다(로컬 실습 전용). repro 블록에서는 `now:`로 씁니다.

## 과제

### t1. 차터 2개 이상
- `work/charters.md`에 `## 차터 N` 절마다 네 항목(`탐험 대상`, `자원`, `알아낼 정보`, `리스크`)을 채웁니다. 차터마다 탐험 대상이 달라야 합니다.
- 리스크가 큰 영역부터 고르세요. 무엇이 잘못되면 누가 얼마나 손해를 보는지가 기준입니다.
- 채점: `npm run check -- exploratory-testing/charter-sessions --task t1`

### t2. 시간 상자 세션 — 재현되는 버그 3개 이상
- 차터 하나를 고르고 타이머를 켠 뒤 탐색합니다. 세션이 끝나면 `work/sessions/<이름>.md`에 노트를 씁니다.
  - 머리 목록: `차터`(예: `차터 1`), `테스터`, `시작`(`YYYY-MM-DD HH:MM`), `시간 상자(분)`(15~120), `시간 배분(%)`(준비 / 테스트 / 버그 조사, 합 100)
  - `## 테스트 노트`: 무엇을 해 봤고 무엇을 봤는지. 아무것도 못 찾은 시도도 적습니다.
  - `## 발견한 버그`: 버그마다 `### 버그 N: 요약` + 설명 + `repro` 블록 하나
  - `## 이슈·질문`: 버그인지 모르는 것, 사양이 모호한 곳, 다음에 볼 것
- 세션 노트 전체에서 **서로 다른 결함 3개 이상**이 재현되어야 합니다. 세션은 여러 번 해도 됩니다.
- 확실하지 않은 것은 버그가 아니라 `이슈·질문`에 적으세요. 버그로 적었는데 재현되지 않으면 실패합니다.
- 채점: `npm run check -- exploratory-testing/charter-sessions --task t2`

### t3. 더 깊이
- `beginner` 프로필에는 없는, **화면 너머의** 결함을 2개 이상 찾습니다(서로 다른 결함).
- 버그 중 하나 이상에는 증거로 **`X-Request-Id`** 값을 남깁니다(로그 `reqId`와 같은 값).
- 채점: `npm run check -- exploratory-testing/charter-sessions --task t3`

> t2·t3는 채점하면서 DB를 여러 번 초기화합니다. 탐색을 마친 뒤에 채점하세요.

## 완료 기준
- [ ] t1: 네 항목을 모두 채운 차터 2개 이상 (탐험 대상이 서로 다름)
- [ ] t2: 형식이 맞는 세션 노트 1개 이상, 기록한 버그가 모두 재현되고 서로 다른 결함 3개 이상
- [ ] t3: `beginner`에 없는 서로 다른 결함 2개 이상 + `X-Request-Id`를 남긴 버그 1개 이상

전체 채점:

공통

```bash
npm run check -- exploratory-testing/charter-sessions
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 어떤 차터가 결함을 잘 찾을까</summary>

- "기능 하나를 써 본다"보다 **"무엇이 바뀐 뒤 무엇이 남는가"** 를 따라가는 차터가 깊은 결함을 찾습니다. 예: 주문을 만들고 → 취소하고 → 그 뒤에 무엇이 원래대로 돌아와야 하는가?
- 화면에 보이는 값과 **저장된 값**이 같은지 API로 다시 조회해 보세요.
- 같은 요청이라도 **언제**(시각), **누가**(등급) 하느냐에 따라 결과가 달라져야 하는 규칙을 사양서에서 찾아보세요.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- SPEC §7: 상태 전이 표의 "허용되지 않는" 칸을 시험하고, 취소 뒤 **재고**와 **쿠폰**을 확인하세요.
- SPEC §4: 쿠폰을 한 번 쓴 뒤 **다른 주문**에 또 써 보세요. 정액·정률 둘 다.
- SPEC §3·§7.2: 쿠폰을 쓴 주문을 만든 뒤 주문 **상세**를 조회해 `total`을 손으로 계산한 값과 비교하세요.
- SPEC §6: 평일 **오후**의 여러 시각으로 배송 예정일을 계산해 보세요.
- SPEC §3: 등급 할인율이 1%인 회원으로 끝자리가 애매한 금액(예: 4,990원)을 사 보세요.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- exploratory-testing/charter-sessions --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`agile-testing-practice`](https://qa-lab.pages.dev/module/agile-testing-practice/), [`usability-accessibility-testing`](https://qa-lab.pages.dev/module/usability-accessibility-testing/) 등입니다 (실습 랩 준비 중).
- 찾은 버그를 정식 리포트로 다듬어 보려면: [재현되는 결함 리포트 쓰기](../../defect-management/defect-reports/README.md)
