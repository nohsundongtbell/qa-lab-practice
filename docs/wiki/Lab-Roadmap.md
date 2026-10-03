# 랩 목록과 학습 순서

랩마다 QA-Lab 모듈 하나와 연결되어 있습니다(아래는 모듈 **slug** 입니다). 개념은 각 랩 README 의 레슨 링크에서 배우세요.

> 코딩 없이 표·글로만 풀 수 있는 랩과 과제는 [코딩 없이 하는 랩](https://github.com/nohsundongtbell/qa-lab-practice/wiki/No-Code-Labs)에 따로 모았습니다.

## 추천 순서
QA-Lab 의 선수 관계를 따라 묶었습니다. 위에서 아래 순서를 권합니다(같은 단계 안에서도 위의 랩이 아래 랩의 선수인 경우가 있습니다. 예: `unit-integration-testing` → `structural-testing-practice`).

| 단계 | 랩 | 모듈 slug | 수준 | 시간 | Docker |
|---|---|---|---|---|---|
| 1 기초 | [`test-design/shop-rules`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/test-design/shop-rules) | `test-design` | 중급 | 120분 | 필요 |
| 1 기초 | [`defect-management/defect-reports`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/defect-management/defect-reports) | `defect-management` | 입문 | 90분 | 필요 |
| 2 기초 다음 | [`exploratory-testing/charter-sessions`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/exploratory-testing/charter-sessions) | `exploratory-testing` (`test-design` 에도 연결) | 중급 | 120분 | 필요 |
| 3 코드 테스트 | [`unit-integration-testing/cart-domain`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/unit-integration-testing/cart-domain) | `unit-integration-testing` | 중급 | 100분 | 불필요 |
| 3 코드 테스트 | [`structural-testing-practice/coverage-and-mutation`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/structural-testing-practice/coverage-and-mutation) | `structural-testing-practice` | 고급 | 100분 | 불필요 |
| 4 자동화 | [`api-contract-testing/shop-api-contract`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/api-contract-testing/shop-api-contract) | `api-contract-testing` | 중급 | 120분 | 필요 |
| 4 자동화 | [`ui-automation/shop-ui-flows`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/ui-automation/shop-ui-flows) | `ui-automation` | 입문 | 180분 | 필요 |
| 5 자동화 다음 | [`data-checking-sql-logs-analytics/sql-and-logs`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/data-checking-sql-logs-analytics/sql-and-logs) | `data-checking-sql-logs-analytics` | 중급 | 120분 | 필요(DB) |
| 5 자동화 다음 | [`api-testing-tools/swagger-and-traffic`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/api-testing-tools/swagger-and-traffic) | `api-testing-tools` | 중급 | 150분 | 필요 |
| 5 자동화 다음 | [`ui-automation-tools/selenium-shop-flow`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/ui-automation-tools/selenium-shop-flow) | `ui-automation-tools` | 입문 | 90분 | 필요 + Chrome |
| 5 자동화 다음 | [`ci-cd-continuous-testing/quality-gates`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/ci-cd-continuous-testing/quality-gates) | `ci-cd-continuous-testing` | 입문 | 120분 | 불필요 |
| 6 비기능 | [`performance-testing-tools/locust-bottlenecks`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/performance-testing-tools/locust-bottlenecks) | `performance-testing-tools` | 고급 | 120분 | 필요 |
| 6 비기능 | [`security-testing-tools/scanner-triage`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/security-testing-tools/scanner-triage) | `security-testing-tools` | 고급 | 150분 | 불필요 |
| 6 비기능 | [`usability-accessibility-testing/shop-a11y-audit`](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/labs/usability-accessibility-testing/shop-a11y-audit) | `usability-accessibility-testing` (`nonfunctional-testing` 에도 연결) | 중급 | 120분 | 필요 |

- 단계 3 의 두 랩과 CI/CD·보안 랩은 **Docker 없이** Node.js 만으로 풉니다.
- UI 랩과 접근성 랩은 브라우저가 필요합니다(Playwright 는 `npx playwright install chromium`, Selenium 은 Chrome 설치).
- 부하 랩과 API 도구 랩의 t3 은 채점할 때 Locust·mitmproxy Docker 이미지를 받습니다(처음 한 번).

## 랩마다 무엇을 내고, 어떻게 채점하나
| 랩 | 내 결과물 | 채점 |
|---|---|---|
| test-design | 테스트 케이스 표(CSV) | 케이스를 앱에 실행해 결함을 잡았는지 |
| defect-management | 결함 리포트(마크다운), 지표 | 리포트의 재현 절차가 재현되는지, 심각도·지표가 맞는지 |
| exploratory-testing | 차터·세션 노트 | 노트의 재현 절차와 증거(요청 ID) |
| unit-integration-testing | Vitest 테스트 | 일부러 고장 낸 코드(뮤턴트)를 잡는지 |
| structural-testing-practice | 테스트 + 분석 답 | 커버리지, 뮤턴트, 정의-사용 쌍 |
| data-checking-sql-logs-analytics | SQL, 로그 분석 답 | 읽기 전용 계정으로 실행한 결과 |
| api-contract-testing | Postman 컬렉션, 계약 테스트 | 계약 위반을 잡는지, 명세 커버리지 |
| api-testing-tools | 답안 파일, 컬렉션, mitmproxy 애드온 | 답, 컬렉션 실행, 애드온 동작 |
| ui-automation | Playwright 테스트 | 화면 변형·느린 응답·반복에서도 통과하는지 |
| ui-automation-tools | Selenium 테스트 | 같은 조건에서 통과하는지 |
| ci-cd-continuous-testing | 워크플로 YAML, 게이트 스크립트 | 규칙 검사, 경계값 시나리오 |
| performance-testing-tools | locustfile, 병목 분석 답 | 시나리오 실행, 병목 판정 |
| security-testing-tools | 범위 체크리스트, 리포트 분류표 | 범위 검사(먼저), 분류 정확도 |
| usability-accessibility-testing | axe 스캔 테스트, 분류표·키보드 점검표·KWCAG 보고서(CSV) | 결함을 하나씩 켜서 스캔이 잡는지, 분류 정확도(오탐을 위반으로 보면 감점), 수동 점검 검출·거짓 보고, 매핑 |
