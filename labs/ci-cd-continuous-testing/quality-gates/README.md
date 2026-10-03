# GitHub Actions 워크플로와 품질 게이트 만들기

> 이 랩은 Docker나 대상 앱 없이 **Node.js만으로** 풉니다. GitHub Actions를 실제로 실행하지 않고, 워크플로 파일을 정적으로 검사하고 게이트 스크립트를 시나리오로 시험합니다.

## 목표
- **작성한다**: 안전하고(최소 권한, 고정된 버전, 시간 제한) 게이트로 동작하는(실패를 삼키지 않는) GitHub Actions 워크플로를 쓴다.
- **정의한다**: 테스트·커버리지·보안·성능 지표로 빌드를 막거나 통과시키는 품질 게이트를 코드로 만든다.
- **줄인다**: 불안정한 테스트를 기한부로 격리해, 거짓 경보로 게이트가 무시되는 일을 막는다.

채점은 "정답과 같은가"가 아니라 **내 워크플로가 규칙을 지키는가**, **내 게이트가 막아야 할 때 막고 통과시킬 때 통과시키는가**로 합니다.

## 선수 모듈
- QA-Lab 모듈 [`api-contract-testing`](https://qa-lab.pages.dev/module/api-contract-testing/) — 실습: [QA 숍 API의 계약을 컬렉션과 명세로 점검하기](../../api-contract-testing/shop-api-contract/README.md)
- QA-Lab 모듈 [`ui-automation`](https://qa-lab.pages.dev/module/ui-automation/) — 실습: [QA 숍 화면을 Playwright로 안정적으로 자동화하기](../../ui-automation/shop-ui-flows/README.md)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`ci-cd-continuous-testing / github-actions-workflows`](https://qa-lab.pages.dev/lesson/ci-cd-continuous-testing/github-actions-workflows/) — t1
- [`ci-cd-continuous-testing / designing-quality-gates`](https://qa-lab.pages.dev/lesson/ci-cd-continuous-testing/designing-quality-gates/) — t2
- [`ci-cd-continuous-testing / reducing-false-alarms`](https://qa-lab.pages.dev/lesson/ci-cd-continuous-testing/reducing-false-alarms/) — t2 (격리)

## 소요 시간
약 120분

## 준비물
- Node.js 24 LTS와 저장소 루트의 `npm ci` ([설치 안내](../../../README.md)). Docker는 필요 없습니다.
- (선택) 본인 GitHub 저장소 — 완성한 워크플로를 실제로 돌려 볼 때

공통

```bash
npm run lab -- ci-cd-continuous-testing/quality-gates
```

작업 폴더 `labs/ci-cd-continuous-testing/quality-gates/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `quality.yml` | t1 답안. 위험한 부분이 여러 곳 있는 시작 워크플로 |
| `gate.mjs` | t2 답안. 아무것도 막지 않는 게이트 뼈대 |

## 과제

### t1. 워크플로 규칙 지키기
- 할 일: `work/quality.yml`을 고쳐 아래 규칙 R1~R10을 모두 지키게 합니다. 채점기는 규칙마다 통과/실패와 이유를 알려 줍니다.

| 규칙 | 내용 |
|---|---|
| R1 | 트리거는 `pull_request`와 `push`. `push`는 `branches`(예: `[main]`)로 한정한다. `pull_request_target`은 쓰지 않는다 |
| R2 | `permissions`를 선언하고 `contents: read`만 둔다. 쓰기 권한 없음 |
| R3 | 모든 잡에 `timeout-minutes`(1~30) |
| R4 | `concurrency`에 `group`과 `cancel-in-progress: true` |
| R5 | `uses:`는 `@v4` 같은 버전이나 40자리 커밋 SHA로 고정한다. 브랜치(`@main`)나 버전 없음은 안 된다 |
| R6 | `runs-on`은 Ubuntu 러너(`ubuntu-latest`, `ubuntu-24.04`) |
| R7 | 순서: `actions/checkout` → `actions/setup-node`(`node-version: '24'`, `cache: npm`) → `npm ci` → `npm test` |
| R8 | `node …/gate.mjs`를 실행하는 게이트 단계가 있다. 테스트·게이트 단계에 `continue-on-error: true`나 `\|\| true`가 없다 |
| R9 | 비밀 값(`secrets.*`)을 `echo`·`cat` 등으로 출력하지 않는다 |
| R10 | `actions/upload-artifact`로 결과를 보관하고 `if: always()`로 실행한다 |

- 기준: 규칙 10개 모두 통과
- 채점: `npm run check -- ci-cd-continuous-testing/quality-gates --task t1`

### t2. 품질 게이트 스크립트
- 할 일: `work/gate.mjs`를 완성합니다. 사용법은 `node gate.mjs <metrics.json>`이고, **종료 코드 0 = 통과, 1 = 차단**입니다. 막을 때는 이유를 출력하세요(채점하지는 않지만 실제 게이트에서는 필수입니다).
- 입력 지표 파일 예:

```json
{
  "today": "2026-10-03",
  "tests": { "total": 120, "failed": ["checkout > 반올림"] },
  "quarantine": [{ "test": "flaky > 타이머", "until": "2026-10-20" }],
  "coverage": { "line": 85.0, "baseline_line": 85.0 },
  "security": { "new_critical": 0, "new_high": 0 },
  "performance": { "p95_ms": 100, "baseline_p95_ms": 100 }
}
```

- **게이트 정책**(채점 기준이 되는 운영 정의):

| 번호 | 정책 | 경계 |
|---|---|---|
| G1 | 실패한 테스트가 있으면 **차단**. 단, `quarantine`에 있고 `until`이 오늘(`today`) **이후이거나 같은** 테스트의 실패는 경고만 하고 통과(격리). 기한이 지났거나 목록에 없는(이름이 정확히 같지 않은) 테스트가 하나라도 실패하면 차단 | 기한 마지막 날은 아직 격리 중 |
| G2 | 라인 커버리지가 **80% 미만**이면 차단 | 정확히 80%는 통과 |
| G3 | 기준선(`baseline_line`)보다 **2.0포인트를 넘게** 떨어지면 차단 | 정확히 2.0포인트 하락은 통과 |
| G4 | 새 critical 또는 high 취약점이 **1개 이상**이면 차단 | |
| G5 | `p95_ms`가 기준선의 **1.2배를 넘으면** 차단 | 정확히 1.2배는 통과 |
| G6 | 필요한 지표가 없거나 형식이 틀리거나 파일이 깨졌으면 **차단**(fail closed). 읽다가 예외가 나도 종료 코드는 1 | |
| G7 | 실행된 테스트가 **0개**(`total`이 0)이면 차단 — 아무것도 안 돌았는데 통과하는 거짓 성공을 막는다 | |

- 정책은 서로 독립입니다. 하나라도 위반하면 차단하고, 격리로 실패를 눈감아 줘도 커버리지 같은 다른 정책은 그대로 적용됩니다.
- 채점기는 시나리오 26개(경계값 포함)를 내 스크립트에 넣어 종료 코드를 확인하고, 틀린 시나리오를 **너무 느슨함**(막아야 하는데 통과)과 **너무 엄격함**(통과해야 하는데 막음)으로 나눠 알려 줍니다.
- 기준: 26개 모두 정답
- 채점: `npm run check -- ci-cd-continuous-testing/quality-gates --task t2`

직접 시험해 보기: 위 예시를 `labs/ci-cd-continuous-testing/quality-gates/work/m.json`으로 저장하고 실행한 뒤 종료 코드를 봅니다.

macOS / Linux (터미널)

```bash
node labs/ci-cd-continuous-testing/quality-gates/work/gate.mjs labs/ci-cd-continuous-testing/quality-gates/work/m.json; echo "종료 코드: $?"
```

Windows (PowerShell)

```powershell
node labs/ci-cd-continuous-testing/quality-gates/work/gate.mjs labs/ci-cd-continuous-testing/quality-gates/work/m.json; "종료 코드: $LASTEXITCODE"
```

## 실제 GitHub에서 돌려 보기 (선택, 채점하지 않음)
내 GitHub 저장소(Node.js 프로젝트)에 `quality.yml`을 `.github/workflows/`에 넣고 푸시하면 실행됩니다. 워크플로가 부르는 `scripts/gate.mjs`와 `metrics/summary.json`(테스트 단계가 만든 요약)은 내 프로젝트에 맞게 준비해야 합니다. 게이트가 막을 때 PR의 체크가 실패하는지, `concurrency`가 이전 실행을 취소하는지 확인해 보세요. `TODO: verify` — 개발 환경에서는 실제 GitHub 실행을 확인하지 못했습니다.

## 완료 기준
- [ ] t1: 워크플로 규칙 R1~R10 모두 통과
- [ ] t2: 게이트 시나리오 26개 모두 정답

전체 채점:

공통

```bash
npm run check -- ci-cd-continuous-testing/quality-gates
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 방향</summary>

- t1: 시작 파일은 위험한 설정이 많습니다. 채점 결과의 실패한 규칙 이유를 하나씩 읽고 고치세요. `on:`을 목록(`[push, …]`)으로 쓰면 `push`의 `branches`를 정할 수 없으니 맵 형식으로 바꿔야 합니다.
- t1: "게이트"는 실패했을 때 **빌드를 실패시키는** 단계입니다. 실패를 삼키는 설정(`continue-on-error`, `|| true`)이 있으면 게이트가 아닙니다.
- t2: 정책 G1~G7을 하나씩 `if`로 옮기고, 막는 이유를 모아 마지막에 한꺼번에 출력하면 디버깅하기 쉽습니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t2: 경계는 부등호 하나로 갈립니다. "미만"과 "이하", "넘게"와 "이상"을 표의 말 그대로 옮기세요. 날짜는 `YYYY-MM-DD` 문자열이라 문자열 비교(`until >= today`)로 충분합니다.
- t2: 지표 확인(`typeof x === 'number'`)을 먼저 하고, 없으면 바로 차단하세요. `JSON.parse`가 예외를 던지면 `try/catch`에서 `process.exit(1)`로 끝냅니다.
- t2: 격리는 "이 테스트의 실패는 무시"가 아니라 "기한까지만 무시"입니다. 실패한 테스트를 하나씩 보며 각각 격리 중인지 확인하세요(`failed`에 하나는 격리, 하나는 아닌 시나리오가 있습니다).
- t1: R7의 순서는 `steps` 목록의 위에서 아래 순서입니다.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- ci-cd-continuous-testing/quality-gates --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`test-automation-architecture`](https://qa-lab.pages.dev/module/test-automation-architecture/), [`testops-execution-and-observability`](https://qa-lab.pages.dev/module/testops-execution-and-observability/), [`cloud-ai-infrastructure-qa`](https://qa-lab.pages.dev/module/cloud-ai-infrastructure-qa/), [`ai-verification-pipeline`](https://qa-lab.pages.dev/module/ai-verification-pipeline/) (실습 랩 준비 중)
