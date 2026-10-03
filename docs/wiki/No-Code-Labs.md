# 코딩 없이 하는 랩

프로그래밍을 하지 않고 **표·글·답안 파일만으로** 풀 수 있는 랩과 과제를 모았습니다. 기획자, QA 입문자, 테스트 자동화 전에 기본기를 다지고 싶은 분께 맞습니다.

준비: [처음이라면](https://github.com/nohsundongtbell/qa-lab-practice/wiki/First-Time-Setup)의 6단계(쇼핑몰 화면이 열리는 것)까지 끝내 두세요. 그 밖에 필요한 것은 **브라우저**, **메모장(또는 아무 텍스트 편집기)**, **Excel** 정도입니다.

## 추천 코스 (약 5시간 30분)

| 순서 | 랩 | 내가 만드는 것 | 쓰는 도구 | 시간 |
|---|---|---|---|---|
| 1 | `test-design/shop-rules` | 테스트 케이스 표 4개 | Excel(CSV) | 120분 |
| 2 | `defect-management/defect-reports` | 결함 리포트 3개 이상 + 품질 지표 | 메모장, Excel | 90분 |
| 3 | `exploratory-testing/charter-sessions` | 탐색 계획(차터)과 세션 노트 | 브라우저, 메모장 | 120분 |

각 랩은 이렇게 진행합니다.

공통

```bash
npm run lab -- test-design/shop-rules
npm run up -- --profile intermediate
npm run check -- test-design/shop-rules --task t1
```

1. `npm run lab -- <랩>` 이 작업 폴더 `labs/<랩>/work/` 를 만들고, **어떤 프로필로 앱을 띄워야 하는지** 알려 줍니다(위 예에서는 `intermediate`).
2. 알려 준 프로필로 앱을 띄웁니다. 프로필의 뜻은 [결함 프로필과 환경 조건](https://github.com/nohsundongtbell/qa-lab-practice/wiki/App-Profiles-and-Conditions)에 있습니다.
3. 랩 README 를 읽고 `work/` 안의 파일을 채웁니다. README 는 GitHub 에서 읽는 편이 보기 좋습니다(아래 링크).
4. `npm run check -- <랩> --task t1` 처럼 **과제 하나씩** 채점합니다. 결과 읽는 법은 [채점 결과 읽는 법](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Reading-Results).
5. 막히면 README 의 "막혔을 때"를 힌트 1 → 힌트 2 → 정답 위치 순서로 엽니다.

### 1. 테스트 케이스 설계 — `test-design/shop-rules`
[README](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/labs/test-design/shop-rules/README.md)

쇼핑몰 규칙(회원 등급, 배송비, 쿠폰, 주문 상태)을 읽고 **한 행이 테스트 케이스 하나인 표**를 만듭니다. 채점기가 표의 케이스를 앱에 직접 실행해서, 내 케이스가 숨은 결함을 잡았는지 알려 줍니다.

- `work/t1-grade.csv` 같은 파일을 Excel 로 열어 편집합니다. **첫 줄(머리글)은 바꾸지 마세요.**
- 저장할 때 "CSV UTF-8(쉼표로 분리)"를 고르세요. 일반 "CSV"로 저장해도 채점기가 읽습니다.
- 과제 4개(t1~t4)가 각각 다른 설계 방법(경계값, 동등분할, 결정 테이블, 상태 전이)을 연습합니다.
- 몇몇 칸은 약속된 표기를 씁니다. 예: `items` 칸의 `1x2;9x20` 은 "상품 1번 2개와 상품 9번 20개", `steps` 칸은 주문에 할 동작을 `>` 로 잇습니다. 칸마다 쓰는 법은 README 의 과제 설명에 있습니다.

### 2. 결함 리포트 — `defect-management/defect-reports`
[README](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/labs/defect-management/defect-reports/README.md)

앱에서 찾은 결함을 **다른 사람이 그대로 따라 할 수 있는 리포트**로 씁니다. `work/reports/_TEMPLATE.md` 를 복사해 새 파일을 만들고 메모장으로 채웁니다. t3 은 결함 이력 표(CSV)로 품질 지표를 계산해 답안 파일에 숫자를 적는 과제입니다. Excel 로 계산하면 됩니다.

리포트에는 사람이 읽는 절차와 함께 **채점기가 실행하는 짧은 절차(`repro` 블록)** 를 씁니다. 아래 "코드처럼 보이지만 코드가 아닌 것"을 먼저 보세요.

### 3. 탐색적 테스트 — `exploratory-testing/charter-sessions`
[README](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/labs/exploratory-testing/charter-sessions/README.md)

무엇을 탐색할지 계획(차터)을 세우고, 시간을 정해 직접 써 보면서 발견한 것을 세션 노트에 적습니다. 버그마다 `repro` 블록을 하나씩 씁니다.

- t3 은 서버 로그와 요청 ID 를 따라가는 과제라 조금 어렵습니다. t1·t2 를 먼저 끝내고 도전하세요.

## 한 걸음 더: 다른 랩의 코딩 없는 과제

다른 랩에도 **답안 파일만 채우면 되는 과제**가 있습니다. `--task` 로 그 과제만 채점할 수 있습니다.

| 랩 · 과제 | 하는 일 | 채점 |
|---|---|---|
| `api-testing-tools/swagger-and-traffic` t1 | 브라우저의 API 문서 화면(Swagger UI)에서 버튼을 눌러 API 를 직접 호출해 보고 질문 6개에 답하기 | `npm run check -- api-testing-tools/swagger-and-traffic --task t1` |
| `data-checking-sql-logs-analytics/sql-and-logs` t3·t4 | 서버 로그 파일을 검색해 오류의 규모·시각과 실패한 결제의 증거 찾기. README 의 검색 명령을 복사해 쓰면 됩니다 | `npm run check -- data-checking-sql-logs-analytics/sql-and-logs --task t3` |
| `security-testing-tools/scanner-triage` t1 | 보안 실습을 시작하기 전에 허가·범위 체크리스트 작성 | `npm run check -- security-testing-tools/scanner-triage --task t1` |

같은 랩의 다른 과제(SQL 작성, 코드 확인 등)는 이 코스 다음 단계입니다. 전체 목록: [랩 목록과 학습 순서](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Lab-Roadmap).

## 코드처럼 보이지만 코드가 아닌 것

**CSV** — 쉼표로 칸을 나눈 표입니다. Excel 로 열고 저장하면 됩니다.

**답안 파일(YAML)** — `키: 값` 형식의 메모입니다. 콜론(`:`) 뒤에 한 칸 띄우고 값을 적습니다. `#` 뒤는 설명이라 지우지 않아도 됩니다. 시각처럼 `"HH:MM:SS"` 로 안내된 값은 큰따옴표를 그대로 둡니다. 목록은 `[1, 2]` 처럼 대괄호 안에 쉼표로 적습니다.

```yaml
count: 12              # 숫자
checked_at: "09:30:00"  # 큰따옴표로 안내된 값
ids: [1, 2]            # 목록
```

**repro 블록** — 결함을 다시 일으키는 절차를 채점기가 알아듣는 짧은 형식으로 적은 것입니다. 한 줄이 행동 하나입니다. `expect` 에는 **실제로 본 잘못된 값이 아니라, 규칙대로라면 나와야 하는 값**을 적습니다.

````markdown
```repro
steps:
  - login: kim@example.com
  - quote: { items: [{ product: 1, qty: 1 }] }
    expect: { status: 200, json: { shippingFee: 0 } }
```
````

위 예는 "김일반으로 로그인해 상품 1번 하나의 금액을 미리 보면, 배송비가 0원이어야 한다"는 뜻입니다. 요령:

- 줄 맨 앞의 **띄어쓰기 칸 수를 예시와 똑같이** 맞춥니다(탭 대신 스페이스).
- 처음부터 쓰지 말고, 랩 README 와 [재현 절차 쓰는 법](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/REPRO_DSL.md)의 예시를 **복사해서 값만 바꾸세요.** 쓸 수 있는 행동(로그인, 장바구니 담기, 주문 등)도 그 문서에 표로 있습니다.
- 형식이 틀리면 채점기가 몇 번째 줄이 왜 틀렸는지 알려 줍니다. 그 메시지대로 고치면 됩니다.

## 이 코스 다음에는
- 같은 결함을 **자동으로** 잡는 법: `ui-automation/shop-ui-flows`(Playwright) — 브라우저 조작을 코드로 적습니다. 코드가 처음이어도 README 의 예시에서 시작할 수 있습니다.
- 데이터로 결함 찾기: `data-checking-sql-logs-analytics/sql-and-logs` t1·t2(SQL).
