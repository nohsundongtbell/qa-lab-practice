# qa-lab-practice 구현 계획 (PLAN) — 초안 v0.3

> 상태: **승인 대기**. 이 문서가 승인되기 전에는 구현을 시작하지 않는다.
> 승인된 결정 사항은 루트 `CLAUDE.md`에 요약한다.
>
> 변경 이력
> - v0.3: 분석 리포트(`00`, `01`, `03`, `05`, `06`)와 `modules.json`을 반영했다. slug를 검증했고, 모듈별 신규/보강/제외를 판정했다. **랩 도구 4건을 실제 레슨에 맞게 교정**했다(§3-2). 인덱스 스키마를 QA-Lab 연동안 S1에 맞췄다. 랩 디렉터리를 2단(`labs/<module>/<lab>/`)으로 바꾸자고 제안한다.
> - v0.2: 크로스 플랫폼 전략(§6)을 추가했다.
> - v0.1: 첫 초안.

---

## 0. 사전 작업 결과

| 자료 | 상태 |
|---|---|
| `00-summary`, `01-project-overview`, `03-lab-integration`, `05-lab-candidates`, `06-risks` | 업로드받아 읽음 |
| `modules.json` (2026-10-02, QA-Lab `main@938cb3b`) | 업로드받아 읽음. 스테이지 7, 모듈 레코드 68개(사이트 표기 66), 레슨 432개 |
| `02-content-structure`, `04-existing-practice-content` | 받지 않음. 04의 모듈별 결론이 `05`(기존 실습 성격, 실습 절 평균 분량)와 `00`(만들지 말 것)에 요약되어 있어 판정에는 충분하다고 보았다. 필요하면 받아서 교차 확인한다 |
| 사이트 직접 크롤링 | 네트워크 정책으로 차단됨(불필요해짐) |

### 검증 결과 — 요청서의 slug 13개 모두 실제 slug와 일치
`modules.json`으로 직접 대조했다(교정 없음).

| id | slug | 스테이지 | 난이도 | 레슨 수 | 선수 모듈 |
|---|---|---|---|---|---|
| m03 | `test-design` | s1 | 중급 | 11 | m01 testing-essence, m02 requirements |
| m06 | `defect-management` | s2 | 입문 | 5 | m01 |
| m05 | `exploratory-testing` | s2 | 중급 | 14 | m03 |
| m10 | `unit-integration-testing` | s3 | 중급 | 6 | m09 dev-knowledge |
| m53 | `structural-testing-practice` | s3 | 고급 | 5 | m09, m10 |
| m61 | `data-checking-sql-logs-analytics` | s3 | 중급 | 6 | m09, **m12** |
| m12 | `api-contract-testing` | s4 | 중급 | 8 | m09, m11 automation-strategy |
| m19 | `api-testing-tools` | s7 | 중급 | 8 | m12 |
| m13 | `ui-automation` | s4 | 중급 | 10 | m09, m11 |
| m20 | `ui-automation-tools` | s7 | 중급 | 1 | m13 |
| m14 | `ci-cd-continuous-testing` | s4 | 중급 | 7 | m12, m13 |
| m21 | `performance-testing-tools` | s7 | 중급 | 2 | **m16 nonfunctional-testing** |
| m23 | `security-testing-tools` | s7 | 중급 | 3 | **m16** |

(모듈 이름은 원본 규칙에 따라 이 저장소에 적지 않는다. 표에는 slug와 id만 둔다.)

### 리포트에서 얻은, 계획을 바꾸는 사실
1. **QA-Lab은 정적 내보내기다.** 연동은 빌드 시점 JSON과 일반 링크로만 할 수 있다. 권장안은 S1(`content/labs.json`을 QA-Lab 쪽에 vendoring)이고, 우리 인덱스는 **그 JSON과 같은 모양**으로 만들어야 한다(§7).
2. **연결 키는 `(moduleSlug, lessonSlug)`다.** 레슨 slug는 모듈 안에서만 유일하다. 레슨 id는 규칙으로 유도하지 말고 명시값을 쓴다. 파일명에서 slug를 추정하면 틀린다(m03 l01 사례).
3. **역링크는 레슨 URL까지만 걸고 끝에 `/`를 붙인다.** 앵커(`#섹션`) 링크는 쓰지 않는다. 한글 헤딩에서 만든 id라서 바뀔 수 있다.
4. **QA-Lab 쪽 slug 보호 스냅샷이 낡았다**(미등록 레슨 187개, 모듈 36개). 우리가 의존하기 전에 QA-Lab에서 `npm run content:snapshot`을 실행해야 한다. 이 저장소에서는 하지 않고 `docs/QA_LAB_INTEGRATION.md`에 선행 조건으로 적는다.
5. **이 저장소는 public이어야 한다.** 현재 `nohsundongtbell/qa-lab-practice`는 public으로 확인했다.
6. **주제가 여러 모듈에 흩어져 있다.** k6·JMeter·ZAP은 m16, Locust는 m21, 구조 커버리지는 m03 l07과 m53, 모델 기반 테스팅은 m03 l11과 m54에 있다. 같은 실습을 두 번 만들지 않도록 모듈 간 매핑이 필요하다(§3-3).

---

## 1. 대상 앱(SUT) 기술 스택

### 공통 도메인
리포트도 **공통 SUT 하나("쇼핑/주문")**를 권장했다(05 E-0). 예약 도메인은 1차에서 제외한다.
- 회원(등급), 한글 이름·주소, 상품(원 단위 정수, 재고), 장바구니, 주문 상태 전이, 쿠폰, 배송비, 영업일 배송 예정일, 가짜 결제
- **DB 테이블은 m61 레슨의 스키마(`members`, `orders`, `order_items`, `coupons`)를 따른다.** 리포트는 "스키마를 다시 정의하지 말고 데이터만 제공"하라고 권고한다. 레슨에 실린 DDL의 컬럼 정의는 리포트에 없어서 `TODO: verify`로 둔다. 구현 전에 m61 l01·l02의 DDL을 받아 컬럼을 맞춘다. 레슨에 없는 테이블(`products`, `cart_items`, `deliveries` 등)만 새로 만든다.

### 랩들이 요구하는 SUT 기능 (리포트 05 기반, 1차에 필요한 것만)
| 기능 | 쓰는 랩 | 비고 |
|---|---|---|
| 결함 프로필 + 요청별 덮어쓰기 | 1·2·3·6·7·10 | §2 |
| OpenAPI 3.1 spec-first + Swagger UI(토큰 Authorize 포함) | 7a·7b | m19 l06 |
| 웹 UI **변형 `UI_VARIANT=v1|v2`**(DOM 구조 변경, 결함이 아님) | 8a | m13 l03 로케이터 내구성 |
| 지연·불안정 응답 모드 `LATENCY_PROFILE` | 8a·9 | m13 l05·l06, m14 l05 |
| 테스트 데이터 fixture API(로컬 전용) | 8a | m13 l10 |
| 상관 ID가 있는 JSON 로그, 액세스 로그 | 3·6 | m61 l03·l04, m05 l04 |
| 웹 페이지의 `dataLayer` 이벤트 | 6 | m61 l05 |
| 읽기 전용 DB 계정 | 6 | m61 l01 원칙과 일치 |
| 숨은 변수(시간대·로케일·권한)로 결과가 달라지는 기능 | 3 | m05 l05 |
| 결제 모의 + 웹훅 | 3 | m05 l09 |
| 시드를 고정할 수 있는 타이밍·랜덤 결함 | 3 | m05 l12 |

### 안 A — TypeScript (**추천**)
Node.js 24 LTS(`TODO: verify` — QA-Lab CI는 Node 22를 쓴다. 맞추려면 22도 무방), Fastify + spec-first OpenAPI, PostgreSQL 16, React + Vite(nginx), Vitest/Stryker/Playwright/Newman/Pact JS/Selenium(`selenium-webdriver` npm).

### 안 B — Python
FastAPI + SQLAlchemy, Jinja2, pytest/coverage.py/mutmut/Locust/Selenium Python.

### 추천과 근거 (v0.3 재평가)
리포트를 보니 일부 레슨은 Python 도구를 쓴다(m21 Locust, m20 Selenium 예시는 Python/Java, m10·m53은 JUnit/pytest/Jest를 3언어로 보여 줌). 그래도 **안 A를 유지**한다.
- 13개 랩 중 Playwright, Newman, Pact, Stryker, OpenAPI 검증, Vitest를 쓰는 랩이 다수다.
- Locust는 **고정 태그 docker 이미지로 실행**하면 된다. 학습자는 `locustfile.py` 하나만 쓰고 호스트에 Python을 설치하지 않는다(랩 10만 Python 문법을 쓴다).
- 레슨의 다언어 비교(3언어)는 1차에서 JS 한 언어로만 제공하고, 다른 언어 스타터는 2차 후보로 둔다.
- spec-first 계약이 계약 테스트 랩(m12 l04 "스펙을 어기는 응답")의 오라클이 된다.

### 컨테이너와 안전 장치
| 서비스 | 기본 바인딩 |
|---|---|
| `web` | `127.0.0.1:8080` |
| `api` | `127.0.0.1:3000` (`/openapi.yaml`, `/docs`) |
| `db` | `127.0.0.1:55432` |
| `seed` | 일회성 |
| (profile `tools`) `locust`, `sonarqube` 등 | 랩에서 필요할 때만 |

- 모든 포트는 `127.0.0.1`에만 바인딩하고 `.env`로 바꿀 수 있다. README 최상단에 배포 금지 경고를 둔다.
- 이미지는 amd64/arm64 멀티 아키텍처만 쓴다. 단계 2에서 `docker buildx imagetools inspect`로 확인해 `docs/PLATFORM_SUPPORT.md`에 기록한다. Locust, SonarQube, Selenium 이미지의 arm64 지원은 `TODO: verify`.

---

## 2. 결함 주입 시스템
v0.2와 같다. 요점만 다시 적는다.
- `defects/catalog.yaml`, `defects/ANSWERS.md`, `defects/profiles/{none,beginner,intermediate,advanced}.yaml`
- ID는 의미가 드러나지 않게 `DF-001` 형식으로 붙이고, 코드는 `isDefectOn(id)` 한 함수로만 분기한다. 결함 하나는 분기 지점 하나에 둔다.
- 프로필은 누적한다(`beginner ⊂ intermediate ⊂ advanced`). 지정은 `npm run up -- --profile <p>` 또는 `.env`로 한다.
- 요청별 덮어쓰기 헤더 `X-QA-Lab-Defects`(로컬 전용)는 채점기의 결함 귀속에 쓴다.
- 카탈로그 항목의 `modules[]`는 스냅샷 slug로 검증한다. 결함 하나가 여러 모듈(예: m03과 m05)에 걸칠 수 있다.
- 약 20개로 시작한다. CI가 결함별 단독 재현을, nightly가 N×N 독립성을 검증한다.
- `UI_VARIANT`와 `LATENCY_PROFILE`은 결함이 아니라 **환경 조건**이라서 카탈로그와 따로 관리한다.

---

## 3. 모듈별 신규 / 보강 / 제외 (판정 완료)

판정 기준: 강의에 실행 환경·데이터·정답이 없으면 **신규**, 레슨이 이미 도구 실습형이면 **보강**(샘플·게이트만 제공하고 설명은 쓰지 않음), 상용 도구이거나 다른 모듈과 중복이면 **제외**(링크만).
근거: 05의 "기존 실습 성격", 00 핵심 발견 4("실행 가능한 SUT, 시드, 샘플 로그, 정답·채점, CI 템플릿은 사실상 0").

### 3-1. 랩별 판정과 연결 레슨 (1차)

| # | 모듈 | 판정 | 1차에 연결할 레슨(`lessons:`) | 1차에서 제외(이유) |
|---|---|---|---|---|
| 1 | `test-design` | **신규** (서술형 과제만 있음) | `boundary-value-analysis`, `state-transition-decision-table`, `test-case-design-synthesis`, `experience-based-testing` | `pairwise-combinatorial-testing`(PICT 바이너리의 크로스 플랫폼 확인이 필요해 2차로), `classification-tree-testona`(상용), `structural-coverage-testing`(→ m53 랩과 통합), `model-based-testing`(→ m54와 중복), `cyclomatic-complexity-path-testing`(2차), `test-design-technique-map`(문서형) |
| 2 | `defect-management` | **신규** (글쓰기 과제만 있음) | `writing-good-defect-reports`, `defect-lifecycle-severity-priority`, `test-reports-and-quality-metrics` | `blame-free-defect-communication`(문서형), `issue-tracking-tools`(GitHub Issues 템플릿 과제로 2차) |
| 3 | `exploratory-testing` | **신규** (실습 절이 가장 짧음, 평균 258자) | `what-is-exploratory-testing`, `charter-writing`, `careful-observation`, `hidden-variables`, `exploring-without-ui`, `non-reproducible-bugs` | 문서형 레슨(`nightmare-headline-game`, `pair-exploration-…`, `test-heuristics-cheat-sheet`), `exploring-legacy-systems`(별도 앱이 필요해 2차) |
| 4 | `unit-integration-testing` | **신규** (코드 조각만 있고 실행 환경 없음) | `what-is-unit-testing`, `mocks-stubs-spies`, `handling-nondeterminism`, `coverage-report-pitfalls` | `xunit-frameworks` 3언어판(2차), `frontend-component-testing`(2차 후보) |
| 5 | `structural-testing-practice` | **보강** (이미 도구 실습형) | `coverage-tools-in-practice`(Istanbul만), `mutation-testing`(Stryker), `path-and-data-flow-testing` | `static-dynamic-analysis-advanced`(C/C++·ASan: 크로스 플랫폼 부담이 커서 2차), `code-review-as-test-activity`(PR diff 세트로 2차). JaCoCo·coverage.py판은 2차 |
| 6 | `data-checking-sql-logs-analytics` | **신규** (쿼리 코드는 많으나 데이터 없음) | `sql-for-verification`, `data-integrity-queries`, `reading-logs`, `logs-as-defect-evidence` | `analytics-tag-verification`·`collected-data-quality`는 1차 말미에 여유가 있으면 넣는다(`dataLayer`는 SUT에 미리 넣어 둠) |
| 7a | `api-contract-testing` | **신규** (Postman 과제에 대상 API가 없음) | `why-api-testing`, `getting-started-with-postman`(Newman), `contract-testing-with-openapi`, `consumer-driven-contracts-with-pact`(선택), `api-test-coverage` | `graphql-testing`(SUT에 GraphQL 없음, 2차), `soapui-and-legacy-api-tools`(우선순위 낮음) |
| 7b | `api-testing-tools` | **보강** (샘플 입력물만 제공) | `swagger-ui-hands-on`, `swagger-and-postman-workflow`, `charles-proxy-in-practice`(mitmproxy 애드온), `wireshark-tcpdump-packet-analysis`(샘플 `.pcap`) | `apidog-integrated-platform`(상용), `insomnia-quickstart`·`hoppscotch-thunder-client`(설치·클릭 절차를 복제하게 되므로 컬렉션 파일만 제공), `adopting-swagger-in-your-project`(2차) |
| 8a | `ui-automation` | **신규** (의사코드 과제만 있음) | `getting-started-with-playwright`, `resilient-locators`, `page-object-model`, `wait-strategies`, `taming-flaky-ui-tests`, `api-fixture-test-data` | `mobile-automation-with-appium`(무거움), `cypress-vs-playwright`(2차), `cross-browser-device-strategy`(설정 샘플만, 2차) |
| 8b | `ui-automation-tools` | **신규** | `selenium-webdriver-quickstart` | — |
| 9 | `ci-cd-continuous-testing` | **신규** (YAML 읽기 과제만 있음) | `github-actions-workflows`, `designing-quality-gates`, `reducing-false-alarms` | `observability-…`·`slo-sli-…`(데이터형, 2차), `reproducing-environments-with-docker`(이미 SUT compose로 체험하므로 2차) |
| 10 | `performance-testing-tools` | **신규** | `locust-python-load-testing` | `ngrinder-distributed-testing`(무거움, 선택 과제조차 1차 제외) |
| 11 | `security-testing-tools` | **신규** | `sonarqube-static-analysis`, `ai-security-scanners-and-report-triage` | `fortify-enterprise-security`(상용 → 링크만) |

### 3-2. 요청서 대비 도구 교정 (중요 — 승인 필요)
실제 레슨 구성과 맞지 않는 부분을 고쳤다.

| 랩 | 요청서 | 실제 레슨 | 교정안 |
|---|---|---|---|
| 10 `performance-testing-tools` | k6 (또는 Locust) | m21 레슨은 **Locust와 nGrinder뿐**. k6·JMeter는 m16 l03·l09에 있음 | **Locust**(docker 실행)를 기본으로 한다. k6 시나리오는 m16 연결용 2차 후보로 둔다 |
| 8b `ui-automation-tools` | Playwright (8a와 묶음) | m20 레슨은 **Selenium WebDriver 1개뿐** | 8a와 같은 시나리오를 **Selenium**(`selenium-webdriver` JS)으로 짜는 스타터. m13 l09 비교와 짝을 이룬다 |
| 7b `api-testing-tools` | Postman/Newman | Newman은 m12 l02. m19 레슨은 Swagger UI, mitmproxy, pcap, 컬렉션 변환 | Newman은 **7a로 옮긴다**. 7b는 Swagger UI 토큰 시나리오, mitmproxy 애드온, `.pcap` 필터 과제, OpenAPI → 컬렉션 → Newman 파이프라인으로 한다 |
| 11 `security-testing-tools` | ZAP / SonarQube | ZAP은 **m16**(l05~l14). m23 레슨은 SonarQube, Fortify, **AI 스캐너 리포트 분류** | **SonarQube**(선택, 무거움)와 **오탐을 섞은 가짜 스캐너 리포트 100건 분류**(정답 데이터로 자동 채점, Docker 없이 가능)로 한다. ZAP은 m16 연결용 2차 후보 |

### 3-3. 모듈 간 중복 매핑 (같은 실습을 두 번 만들지 않음)
| 주제 | 1차에서 만드는 곳 | 다른 모듈 |
|---|---|---|
| 구조 커버리지 | m53 랩 | m03 l07 → 같은 랩을 가리킴(2차에 인덱스 링크 추가) |
| 모델 기반 테스팅 | 만들지 않음 | m03 l11, m54 |
| Postman/Newman | m12 랩(7a) | m19 l07은 같은 컬렉션을 재사용 |
| 부하 테스트 | m21 랩(Locust) | m16(k6·JMeter), m51 → 2차에 같은 시나리오로 확장 |
| 보안 스캐너 | m23 랩 | m16(ZAP), m50 → 2차 |
| 상태 전이 SUT | m03 랩의 주문 상태 | m05 l08이 같은 SUT를 탐험 |

한 랩이 여러 모듈의 레슨에 걸리는 경우를 위해 `lab.yaml`에 선택 필드 `also_for: [{ module, lessons }]`를 둔다(§7). 인덱스에는 모듈별 항목으로 펼쳐서 넣는다.

---

## 4. 채점 방식 — "관찰 가능한 결과"
v0.2와 같다. 차등 오라클(`none`에서 통과해야 유효) → 결함 프로필에서 실패한 케이스 → 요청별 덮어쓰기로 **결함 ID 귀속**까지 한다. 학습자는 결함 ID를 몰라도 된다. 랩 1~3은 같은 재현 DSL(`http`/`ui` 단계, 셸 단계 없음)을 쓴다.

랩별 관찰 대상(교정 반영):
| 랩 | 관찰 결과 |
|---|---|
| 1 | 귀속된 서로 다른 결함 수 |
| 2 | 리포트 절차의 자동 재현 성공 + 심각도가 카탈로그 ±1 등급 안 + 결함 이력 CSV 지표 계산값 |
| 3 | 세션 노트의 버그 블록과 매칭된 결함 수 |
| 4 | 결함 구현에서 실패하고 정상 구현에서 통과하는 테스트 |
| 5 | 커버리지 기준 + 생존 뮤턴트 수 ≤ N + 정의-사용 쌍 정답 일치 |
| 6 | 정합성 쿼리가 찾은 레코드 ID 집합 = 시드에 심은 이상 레코드 집합, 로그에서 찾은 상관 ID |
| 7a | Newman 실행 결과 + 계약 검증기가 계약 위반 결함을 검출 |
| 7b | mitmproxy 애드온이 변조한 응답으로 SUT 결함 재현, `.pcap` 필터 답 |
| 8a | 테스트 통과 + `UI_VARIANT=v2`에서도 통과 + `LATENCY_PROFILE=unstable`에서 10회 반복 안정 |
| 8b | 같은 시나리오의 Selenium 테스트 통과 |
| 9 | 학습자 fork의 워크플로가 게이트 위반 시 실패하고 통과 시 성공(로컬 검증은 워크플로 YAML 정적 검사 + 시뮬레이션) |
| 10 | Locust 결과에서 병목 엔드포인트(결함 ID) 식별 + 임계값 판정 |
| 11 | 스캐너 리포트 100건 분류 정확도(오탐/정탐/중복) ≥ 기준 + 허가·범위 체크리스트 |

정답은 저장소 안 `solution/`에 두고, 힌트는 README `<details>`로 1 → 2 → 정답 위치 순서로 연다. `defects/ANSWERS.md`는 어떤 README에서도 링크하지 않는다.

---

## 5. 1차 범위와 순서

**랩 13개(모듈당 1개).** 요청서의 우선순위를 유지한다. 리포트의 P1 제안(m61·m03·m12·m13·m05·m06)과는 순서가 다르지만, 랩 1~3을 기준 샘플로 먼저 완성한다는 요청서의 목적에는 요청서 순서가 맞다.

| 순서 | 랩 | sut_profile | 과제 수(안) | 주요 도구 |
|---|---|---|---|---|
| 1 | test-design | beginner | 4 | 케이스 표(CSV/YAML) |
| 2 | defect-management | beginner | 3 | 리포트 템플릿, 결함 CSV |
| 3 | exploratory-testing | intermediate | 3 | 세션 노트, 로그 |
| 4 | unit-integration-testing | none | 3 | Vitest, fake timer |
| 5 | structural-testing-practice | none | 3 | c8/Istanbul, Stryker |
| 6 | data-checking-sql-logs-analytics | intermediate | 3 | `psql`(컨테이너), 로그 |
| 7a | api-contract-testing | intermediate | 3 | Newman(`npx`), OpenAPI 검증, (선택) Pact |
| 7b | api-testing-tools | intermediate | 3 | Swagger UI, mitmproxy(docker), `.pcap` |
| 8a | ui-automation | beginner | 4 | Playwright |
| 8b | ui-automation-tools | beginner | 1 | selenium-webdriver |
| 9 | ci-cd-continuous-testing | beginner | 2 | GitHub Actions |
| 10 | performance-testing-tools | advanced | 2 | Locust(docker) |
| 11 | security-testing-tools | advanced | 2 | 리포트 분류(Node), (선택) SonarQube |

- "다음 랩" 링크는 스냅샷의 선수 관계로 정한다. 이 모듈을 선수로 가진 모듈 중 랩이 있는 것을 고르고, 없으면 QA-Lab 모듈 페이지로 연결한다. 예: m03 다음은 m05, m12와 m13 다음은 m14, m12 다음은 m61·m19.
- m21·m23의 선수 모듈 m16에는 1차 랩이 없다 → README의 "선수 모듈"에는 QA-Lab 링크만 둔다.

---

## 6. 크로스 플랫폼 전략 (macOS / Windows)
v0.2와 같다. 요약:
- 모든 `npm run` 스크립트 본문은 `node scripts/cli.mjs <cmd>` 한 줄로 고정한다. 명령은 `up/down/reset/lab/check/solution/logs/doctor/validate/build-index`다. `Makefile`은 macOS/Linux 선택 래퍼다.
- 채점기는 `.mjs`가 기본이다. 1차는 `.sh`/`.ps1` 쌍 0개가 목표다. 셸 명령 자체가 학습 내용이면 문서에 두 OS 블록을 쓰고, 채점은 결과물로 한다.
- PowerShell 기준은 5.1이다(블록에서 `&&` 금지). `.ps1`은 ASCII만 쓴다(5.1의 BOM 없는 UTF-8 해석 문제, `TODO: verify-windows`).
- `.gitattributes`는 기본 LF, `.ps1`만 CRLF다. 한글 파일명을 금지하고 경로는 120자 이하로 제한한다.
- Windows 검증: CI(Docker 없는 부분 + fixture 기반 채점기 테스트) + `docs/PLATFORM_SUPPORT.md` 수동 체크리스트. GitHub 러너의 Docker 제약은 `TODO: verify`.
- v0.3 추가: 7b의 mitmproxy와 `.pcap` 분석은 호스트 설치 대신 docker 이미지로 실행한다(Wireshark GUI는 선택이고, 기본은 `tshark` 컨테이너 — 이미지와 arm64 지원 `TODO: verify`).

---

## 7. QA-Lab 연동과 인덱스 스키마 (v0.3 개정)

### 7-1. 디렉터리: `labs/<module-slug>/<lab-slug>/` 2단 구조 (**제안 — 요청서 변경**)
- 요청서는 `labs/<module-slug>/` 1단이다. 그러나 ① 연동안 S1의 `id`가 "폴더 경로"(`test-design/bva-order-discount`)이고, ② m03(11레슨)과 m05(14레슨)는 2차에 랩이 여러 개로 늘어날 것이 분명하다.
- **랩 경로는 QA-Lab에 링크로 박히므로 나중에 옮기면 링크가 깨진다.** 그래서 지금 2단으로 정하는 것을 추천한다. 1차는 모듈마다 랩 1개만 둔다.
- 예: `labs/test-design/shop-pricing-rules/`, `labs/defect-management/reproducible-reports/`. 이름은 단계 4에서 정한다.

### 7-2. `lab.yaml` (요청서 스키마 + 변경점)
```yaml
module: test-design                 # 스냅샷에 존재해야 함
lessons: [boundary-value-analysis, state-transition-decision-table]  # 그 모듈의 레슨 slug
also_for: []                        # 선택: [{ module: ..., lessons: [...] }]
title_ko: ...
level: intermediate                 # beginner|intermediate|advanced → 인덱스에서 입문|중급|고급으로 변환
est_minutes: 90
requires: [docker, node24]
platforms: [macos, windows, linux]
tools: [playwright]
sut_profile: beginner
tasks:
  - id: t1
    goal: ...
    check: check/t1.mjs             # 또는 { unix: ..., windows: ... }
    pass: { min_defects: 2 }
status: planned                     # planned | beta | ready  (요청서의 draft → beta로 대응)
```
- `status` 값을 S1에 맞춰 `planned | beta | ready`로 바꾸자고 제안한다. `planned`면 QA-Lab에서 링크 없이 "준비 중"으로 표시된다.

### 7-3. `labs/index.json` = S1 `content/labs.json`과 같은 모양
```jsonc
{
  "schemaVersion": 1,
  "repoUrl": "https://github.com/nohsundongtbell/qa-lab-practice",
  "ref": "main",
  "snapshot": { "source": "qa-learning-platform_v2@938cb3b", "generatedAt": "2026-10-02" },
  "labs": [
    {
      "id": "test-design/shop-pricing-rules",
      "moduleSlug": "test-design",
      "lessonSlugs": ["boundary-value-analysis"],
      "title": "...",
      "path": "labs/test-design/shop-pricing-rules",
      "status": "beta",
      "estimatedMinutes": 90,
      "level": "중급",
      "tools": ["playwright"],
      "platforms": ["macos", "windows", "linux"]   // 확장 필드 — QA-Lab은 모르는 필드를 무시
    }
  ]
}
```
- `also_for`는 같은 `id`에 `moduleSlug`만 다른 항목으로 펼친다. QA-Lab 쪽 조회 키가 `(moduleSlug, lessonSlug)`이기 때문이다.
- 파일 위치는 요청서대로 `labs/index.json`이다. 리포트가 가정한 루트 `labs-index.json`과 다르므로 QA-Lab의 동기화 스크립트에 이 경로를 넘긴다(연동 제안서에 명시).

### 7-4. 스냅샷 `data/qa-lab-modules.snapshot.json`
- 받은 `modules.json`에서 **모듈 이름(`title`)과 스테이지 이름을 빼고** 만든다. 남기는 필드는 `id, slug, stage, order, level, status, prerequisites, lessons[{id, slug, order, url}], url`이다. 파일 머리에 "스냅샷, 원본 아님 — 원본: QA-Lab `content/modules.json`" 메타를 둔다.
  - 이름을 빼는 이유: "이름·설명을 복사하지 않는다"는 원칙을 엄격하게 지키기 위해서다. 화면에 이름이 필요하면 QA-Lab 링크로 대신한다.
- 스냅샷 갱신은 `npm run snapshot:update -- <modules.json 경로>`로 하고, 바뀐 slug는 diff로 보고한다.
- validate 규칙: `module`, `lessons`, `also_for`, `catalog.modules[]`가 스냅샷에 있어야 한다. `coming-soon` 모듈(m59·m60·m62·m63·m65·m66)과 m55(QA-Lab에서 레슨 폴더가 git 미추적)에 연결하면 실패 처리한다.
- 역링크 생성 규칙: `https://qa-lab.pages.dev` + 스냅샷의 `url`(끝 `/` 포함). 앵커는 쓰지 않는다.

### 7-5. QA-Lab 쪽 변경
이 저장소에서는 하지 않는다. `docs/QA_LAB_INTEGRATION.md`(단계 7)에 03 리포트의 S1 + 후보 B(동기화 후 커밋 + 자동 PR)를 기준으로 제안서를 쓴다. 선행 조건으로 `content:snapshot` 갱신을 명시한다.

---

## 8. CI (`.github/workflows/`)
| 워크플로 | 트리거 | OS | 내용 |
|---|---|---|---|
| `validate` | PR | ubuntu, macos, windows | 스키마, 스냅샷 slug 존재, README 필수 섹션·OS 블록 쌍, ANSWERS 링크 금지, 스크립트 단위 테스트, fixture 기반 starter 실패/solution 통과 |
| `lab-ci` | PR(변경된 랩), 매트릭스 | ubuntu | `up → starter check(실패) → solution check(통과)`, 결함별 단독 재현 |
| `nightly` | 매일 | ubuntu (+ validate 3 OS) | 전체 랩, 결함 N×N, fixture와 실제 SUT 응답 비교 |
| `publish-index` | main push | ubuntu | `labs/index.json` 생성·커밋 확인(QA-Lab 동기화가 읽을 수 있게) |

## 9. 라이선스
코드 MIT, 문서 CC BY 4.0.

---

## 10. 승인이 필요한 결정

1. **SUT 스택**: 안 A TypeScript(추천, Locust만 docker로 Python 사용) / 안 B Python
2. **도메인**: 쇼핑몰만 + DB 테이블은 m61 레슨 스키마를 따름(추천). 레슨 DDL 원문을 받아야 한다(§1)
3. **정답 방식**: 저장소 안 `solution/`(추천) / `solutions` 브랜치
4. **Node 버전**: 24 LTS(추천) / 22 LTS(QA-Lab CI와 같음)
5. **1차 범위**: §3-1의 연결 레슨, 제외 목록과 함께 랩 13개
6. **도구 교정 4건(§3-2)**: Locust, Selenium, Newman을 7a로 이동, m23은 SonarQube + 리포트 분류
7. **디렉터리 2단 구조**(§7-1): `labs/<module>/<lab>/`(추천) / 요청서대로 1단
8. **`status` 값**: `planned|beta|ready`(추천, S1과 일치) / 요청서대로 `draft|ready`
9. **스냅샷에서 이름 제거**(§7-4): 제거(추천) / `modules.json` 그대로
10. **크로스 플랫폼 6a~6e**(v0.2와 같음): Node CLI 단일 진입점, `.mjs` 채점기, PowerShell 5.1과 `.ps1` ASCII, 한글 파일명 금지, Windows 검증 방식
