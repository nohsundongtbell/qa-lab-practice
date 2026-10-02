# 재현되는 결함 리포트 쓰기와 결함 지표 계산

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **작성한다**: QA 숍에서 결함을 찾아, 처음 보는 사람도 그대로 따라 하면 재현되는 결함 리포트를 쓴다.
- **구분한다**: 결함마다 심각도(영향)와 우선순위(처리 순서)를 팀 기준으로 따로 판단하고 근거를 적는다.
- **계산한다**: 결함 이력 데이터로 품질 지표를 계산한다.

채점기는 리포트의 재현 절차를 **실제로 실행해서** 재현되는지 확인합니다. "잘 쓴 것 같은" 리포트가 아니라 "재현되는" 리포트가 통과합니다.

## 선수 모듈
- QA-Lab 모듈 [`testing-essence`](https://qa-lab.pages.dev/module/testing-essence/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`defect-management / writing-good-defect-reports`](https://qa-lab.pages.dev/lesson/defect-management/writing-good-defect-reports/) — t1
- [`defect-management / defect-lifecycle-severity-priority`](https://qa-lab.pages.dev/lesson/defect-management/defect-lifecycle-severity-priority/) — t2
- [`defect-management / test-reports-and-quality-metrics`](https://qa-lab.pages.dev/lesson/defect-management/test-reports-and-quality-metrics/) — t3

## 소요 시간
약 90분 (결함 찾기·리포트 50분, 심각도 판단 10분, 지표 30분)

## 준비물
- Docker Desktop, Node.js 24 LTS ([설치 안내](../../../README.md))
- 결함 프로필: `beginner`
- [QA 숍 제품 사양서(SPEC)](../../../apps/shop/SPEC.md) — 앱이 사양과 다르면 결함입니다.
- [재현 절차 쓰는 법 (repro 블록)](../../../docs/REPRO_DSL.md)

시작하기:

공통

```bash
npm run lab -- defect-management/defect-reports
npm run up -- --profile beginner
```

작업 폴더 `labs/defect-management/defect-reports/work/` 에 다음이 복사됩니다.

| 경로 | 용도 |
|---|---|
| `reports/_TEMPLATE.md` | 결함 리포트 템플릿 (밑줄로 시작하는 파일은 채점하지 않습니다) |
| `metrics.yaml` | t3 답안 |
| `data/defect-history.csv`, `data/module-size.csv` | t3 데이터 |

새 리포트는 템플릿을 복사해 만듭니다. 파일 이름은 영문으로 짓습니다(예: `free-shipping.md`).

macOS / Linux (터미널)

```bash
cp labs/defect-management/defect-reports/work/reports/_TEMPLATE.md labs/defect-management/defect-reports/work/reports/my-first-bug.md
```

Windows (PowerShell)

```powershell
Copy-Item labs/defect-management/defect-reports/work/reports/_TEMPLATE.md labs/defect-management/defect-reports/work/reports/my-first-bug.md
```

결함은 웹(http://127.0.0.1:8080)과 API 문서(http://127.0.0.1:3000/docs)를 오가며 사양서의 규칙을 하나씩 확인하면서 찾습니다. 로그인 계정은 [루트 README의 시드 계정](../../../README.md)을 쓰세요.

## 과제

### t1. 재현되는 결함 리포트 3건
- `work/reports/` 에 **서로 다른 결함 3개 이상**을 리포트로 씁니다. 한 파일에 결함 하나.
- 리포트에 반드시 있어야 하는 것 (`npm run check`가 검사합니다):
  - `# 제목` 한 줄. 무엇이, 어디서, 어떻게 잘못되는지.
  - 머리 목록: `심각도`, `우선순위`, `발견 환경`, `관련 사양`
  - 절: `재현 절차`(사람이 읽는 번호 목록 + `repro` 블록 하나), `기대 결과`, `실제 결과`, `심각도·우선순위 근거`, `증거`
- `repro` 블록의 `expect`에는 **사양대로라면 나와야 할 값**을 씁니다. 실제로 본 잘못된 값이 아닙니다.
- 같은 결함을 두 리포트로 쓰면 중복으로 실패합니다.
- 채점: `npm run check -- defect-management/defect-reports --task t1`

### t2. 심각도와 우선순위
- t1에서 **재현되는** 리포트마다 아래 팀 기준으로 심각도를 정하고, 우선순위를 따로 정한 뒤, `심각도·우선순위 근거`에 이유를 씁니다.
- 기준: 서로 다른 결함 3개 이상에 대해 심각도가 팀의 판단과 **1단계 이내**
- 채점: `npm run check -- defect-management/defect-reports --task t2`

**팀 심각도 기준 (이 랩의 기준)**

| 심각도 | 기준 |
|---|---|
| S1 치명 | 저장된 금액·주문 데이터가 틀리거나 손실됨, 보안 문제, 핵심 흐름(가입·주문·결제)이 **모든** 사용자에게 막힘 |
| S2 높음 | 금액이 틀리게 계산됨, 또는 핵심 기능이 **일부** 사용자에게 막히고 우회가 어려움 |
| S3 보통 | 경계 조건 같은 특정 상황에서만 규칙이 어긋남, 우회 방법이 있음 |
| S4 낮음 | 표시·문구, 1원 단위 같은 경미한 차이 |

**우선순위**: P1 즉시 · P2 다음 배포 전 · P3 정기 배포 · P4 여유 있을 때. 우선순위는 자동 채점하지 않습니다. 정답이 하나가 아니기 때문이며, 근거가 설득력 있는지 스스로(또는 동료와) 점검하세요.

### t3. 결함 지표 계산
- `work/data/defect-history.csv`(결함 40건)와 `work/data/module-size.csv`(모듈별 코드 크기, KLOC)로 지표를 계산해 `work/metrics.yaml`에 적습니다.
- 도구는 자유입니다 (스프레드시트, SQL, 코드).
- 채점: `npm run check -- defect-management/defect-reports --task t3`

**이 랩의 계산 규칙**
| 키 | 계산 |
|---|---|
| `valid_defects` | `status`가 `REJECTED`(결함 아님)·`DUPLICATE`(중복)인 행을 뺀 **유효 결함** 수. 아래 지표는 모두 유효 결함만으로 계산합니다 |
| `by_severity` | 유효 결함의 심각도별 건수 |
| `escape_rate_pct` | `found_in`이 `production`인 건수 ÷ 유효 결함 수 × 100 |
| `reopen_rate_pct` | `reopened`가 `Y`인 건수 ÷ 처리 완료(`RESOLVED`+`CLOSED`) 건수 × 100 |
| `avg_resolution_days` | `resolved_at`이 있는 유효 결함의 (`resolved_at` − `opened_at`) 일수 평균 |
| `open_count` | `status`가 `OPEN`인 유효 결함 수 |
| `highest_density_module` | (모듈의 유효 결함 수 ÷ 그 모듈의 KLOC)가 가장 큰 모듈 이름 |

비율과 기간은 소수 첫째 자리까지 반올림합니다. ±0.1은 맞은 것으로 봅니다.

> t1·t2는 채점하면서 DB를 여러 번 초기화합니다. 웹에서 직접 만든 주문 등은 지워집니다.

## 완료 기준
- [ ] t1: 서로 다른 결함 3개 이상이 **자동으로 재현**됨. 형식 오류·무효·재현 안 됨·중복 리포트 0개
- [ ] t2: 재현되는 리포트의 심각도가 팀 기준과 1단계 이내 (서로 다른 결함 3개 이상)
- [ ] t3: 지표 7개 모두 일치

전체 채점:

공통

```bash
npm run check -- defect-management/defect-reports
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 결함을 어디서 찾을까</summary>

- 사양서에서 숫자가 나오는 규칙(금액, 수량, 글자 수, 비율 상한)은 모두 의심해 볼 만합니다. 특히 **경계**(이상·이하)와 **한계**(최대 할인액).
- 화면에서 찾기 어렵다면 API 문서(`/docs`)의 Try it out이나 웹의 장바구니 금액 미리보기를 쓰세요.
- 회원 가입처럼 **입력 검증**이 있는 곳에 한글을 넣어 보세요.

</details>

<details>
<summary>힌트 2 — 리포트와 지표</summary>

- `[무효]`가 나오면 `expect`에 실제 값을 적은 것입니다. "사양대로라면 몇이어야 하는가"로 바꾸세요.
- `[재현 안 됨]`이면 그 절차로는 결함이 드러나지 않는 것입니다. 경계 바로 그 값을 넣었는지 확인하세요.
- 심각도는 "얼마나 많은 사용자가, 얼마나 큰 피해를, 우회할 수 있는가"로 판단합니다. 1원 차이와 가입 불가는 같은 등급일 수 없습니다.
- 지표: 재오픈률의 분모는 유효 결함 전체가 아니라 **처리 완료** 건수입니다. 결함 밀도는 건수가 아니라 크기로 나눈 값입니다.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- defect-management/defect-reports --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`test-management`](https://qa-lab.pages.dev/module/test-management/) 등입니다 (실습 랩 준비 중).
- 이어서 해 볼 랩: [탐색적 테스팅 — 차터 기반 세션](../../exploratory-testing/charter-sessions/README.md) — 같은 리포트 형식으로 더 깊은 결함을 찾습니다.
