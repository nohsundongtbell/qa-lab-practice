# qa-lab-practice

> ## ⚠️ 경고 — 공개 서버에 배포하지 마세요
> 이 저장소의 대상 앱(QA 숍)에는 **실습을 위해 일부러 넣은 결함과 취약점**이 들어 있습니다.
> 모든 포트는 내 컴퓨터(`127.0.0.1`)에서만 열리도록 설정되어 있습니다. 이 설정을 바꾸거나 인터넷에 공개된 서버에 올리지 마세요.

[QA-Lab](https://qa-lab.pages.dev/) 강의와 짝을 이루는 **한국어 QA 실습 저장소**입니다.
개념은 QA-Lab 레슨에서 배우고, 이 저장소에서는 실제로 돌아가는 앱에 직접 테스트를 해 봅니다.

| 층 | 어디서 | 무엇을 |
|---|---|---|
| 강의 | [qa-lab.pages.dev](https://qa-lab.pages.dev/) | 개념, 판단 기준 — "왜, 언제" |
| 실습 | 이 저장소 | 대상 앱, 과제, 자동 채점 — "어떻게" |

---

## 3분 안에 시작하기

### 1. 준비물
| 도구 | 버전 | 용도 |
|---|---|---|
| Docker Desktop (Docker Compose v2 포함) | 최신 안정판 | 대상 앱 실행 |
| Node.js | 24 LTS | 랩 실행·채점 |
| Git | 아무 버전 | 저장소 받기 |

macOS / Linux (터미널)

```bash
brew install --cask docker
brew install node@24 git
```

Windows (PowerShell)

```powershell
winget install -e --id Docker.DockerDesktop
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
```
<!-- TODO: verify-windows — winget 패키지 ID와 OpenJS.NodeJS.LTS 가 설치하는 주 버전(24) 확인 -->

> Windows에서는 Docker Desktop의 **WSL 2 백엔드**를 사용합니다. 설치 후 Docker Desktop을 한 번 실행해 두세요.

### 2. 대상 앱 기동

공통

```bash
git clone https://github.com/nohsundongtbell/qa-lab-practice.git
cd qa-lab-practice
npm ci
npm run doctor
npm run up
```

`npm run doctor`는 Node·Docker·포트 같은 환경을 점검하고, 문제가 있으면 해결 방법을 알려 줍니다. 처음 `npm run up`에는 이미지를 빌드하느라 몇 분 걸릴 수 있습니다. 끝나면 아래 주소로 접속합니다.

| 무엇 | 주소 |
|---|---|
| 웹 (QA 숍) | http://127.0.0.1:8080 |
| API | http://127.0.0.1:3000 |
| API 문서 (Swagger UI) | http://127.0.0.1:3000/docs |
| OpenAPI 명세 | http://127.0.0.1:3000/openapi.yaml |
| DB (PostgreSQL) | `127.0.0.1:55432`, DB `shop`, 사용자 `shop`, 비밀번호 `shop` |

### 3. 시드 계정
모든 계정의 비밀번호는 `qa-lab-1234`입니다.

| 이메일 | 이름 | 등급 (누적 구매액) | 비고 |
|---|---|---|---|
| `kim@example.com` | 김일반 | NORMAL (0원) | |
| `lee@example.com` | 이실버 | SILVER (100,000원) | |
| `park@example.com` | 박골드 | GOLD (500,000원) | |
| `choi@example.com` | 최브이아이피 | VIP (1,000,000원) | |
| `jeju@example.com` | 고제주 | NORMAL (0원) | 도서산간 우편번호 |
| `admin@example.com` | 관리자 | — | 출고·배송 완료 처리 |

### 4. 첫 랩
랩 목록은 `npm run lab`으로 봅니다. 처음이라면 이 순서를 권합니다.

| 순서 | 랩 | 결함 프로필 | 시간 |
|---|---|---|---|
| 1 | [쇼핑몰 규칙으로 테스트 케이스 설계하기](labs/test-design/shop-rules/README.md) (`test-design/shop-rules`) | intermediate | 120분 |
| 2 | [재현되는 결함 리포트 쓰기와 결함 지표 계산](labs/defect-management/defect-reports/README.md) (`defect-management/defect-reports`) | beginner | 90분 |
| 3 | [차터로 이끄는 탐색 세션과 결함 지도](labs/exploratory-testing/charter-sessions/README.md) (`exploratory-testing/charter-sessions`) | intermediate | 120분 |

더 해 볼 랩입니다 (앱의 결함 프로필과 소요 시간은 `npm run lab -- <slug>`가 알려 줍니다).

| 랩 | 다루는 것 | Docker |
|---|---|---|
| [`unit-integration-testing/cart-domain`](labs/unit-integration-testing/cart-domain/README.md) | 단위 테스트(AAA), 테스트 더블, 플래키 테스트 고치기 | 불필요 |
| [`structural-testing-practice/coverage-and-mutation`](labs/structural-testing-practice/coverage-and-mutation/README.md) | 커버리지 리포트 읽기, 뮤테이션으로 약한 테스트 찾기 | 불필요 |
| [`data-checking-sql-logs-analytics/sql-and-logs`](labs/data-checking-sql-logs-analytics/sql-and-logs/README.md) | SQL 정합성 쿼리, 로그 분석, 상관 ID | 필요 (DB) |
| [`api-contract-testing/shop-api-contract`](labs/api-contract-testing/shop-api-contract/README.md) | Postman 컬렉션(Newman)과 OpenAPI 대조로 API 계약 위반 찾기, 오퍼레이션·상태 코드 커버리지 | 필요 (앱) |
| [`api-testing-tools/swagger-and-traffic`](labs/api-testing-tools/swagger-and-traffic/README.md) | Swagger UI, OpenAPI→컬렉션→Newman, mitmproxy 애드온, 패킷 캡처(.pcap) 읽기 | 필요 (앱, mitmproxy) |
| [`ui-automation/shop-ui-flows`](labs/ui-automation/shop-ui-flows/README.md) | Playwright 로 구매 흐름 자동화, 화면 변형(v2)·불안정한 응답에서도 통과, fixture 로 테스트 데이터 준비 | 필요 (앱, 브라우저) |
| [`ui-automation-tools/selenium-shop-flow`](labs/ui-automation-tools/selenium-shop-flow/README.md) | 같은 시나리오를 Selenium WebDriver 로, 명시적 대기 | 필요 (앱, Chrome) |
| [`security-testing-tools/scanner-triage`](labs/security-testing-tools/scanner-triage/README.md) | 허가·범위 체크리스트, 스캐너 리포트 100건 분류(진짜·오탐·중복), (선택) SonarQube | 불필요 (선택 실습만) |
| [`ci-cd-continuous-testing/quality-gates`](labs/ci-cd-continuous-testing/quality-gates/README.md) | GitHub Actions 워크플로 규칙, 품질 게이트 스크립트, 불안정한 테스트 격리 | 불필요 |
| [`performance-testing-tools/locust-bottlenecks`](labs/performance-testing-tools/locust-bottlenecks/README.md) | Locust 부하 시나리오 작성, p95 로 병목 엔드포인트·원인 결함 찾기 | 필요 (앱, Locust 이미지) |

공통

```bash
npm run lab -- test-design/shop-rules
```

명령이 알려 주는 대로 랩 README를 읽고, 결함 프로필을 맞춘 뒤 과제를 풉니다. 채점은 `npm run check -- test-design/shop-rules`로 합니다.

---

## 자주 쓰는 명령

모든 명령은 macOS와 Windows에서 똑같이 `npm run`으로 실행합니다.

| 하고 싶은 일 | 명령 |
|---|---|
| 환경 점검 | `npm run doctor` |
| 기동 | `npm run up` |
| 결함 프로필을 정해서 기동 | `npm run up -- --profile beginner` |
| 중지 (데이터 유지) | `npm run down` |
| **데이터 초기화** 후 다시 기동 | `npm run reset` |
| API 로그 보기 | `npm run logs` |
| API 로그 계속 따라 보기 | `npm run logs -- --follow` |
| 랩 목록 / 시작 | `npm run lab` / `npm run lab -- <slug>` |
| 랩 채점 | `npm run check -- <slug>` |
| 막혔을 때 정답 위치 | `npm run solution -- <slug> --yes` (먼저 README의 힌트를 보세요) |

`npm run logs`는 `--lines 100`(줄 수), `--grep 주문`(문자열 필터) 옵션도 받습니다.

### 결함 프로필 바꾸기
랩마다 사용할 결함 수준(프로필)이 정해져 있습니다. 프로필은 `none`, `beginner`, `intermediate`, `advanced`입니다. 랩이 어떤 프로필을 쓰는지는 `npm run lab -- <slug>`가 알려 줍니다.

공통

```bash
npm run up -- --profile intermediate
```

프로필을 바꿔도 데이터는 유지됩니다. 데이터까지 처음으로 되돌리려면 `npm run reset`을 쓰세요.

직접 설정하고 싶다면 저장소 루트의 `.env` 파일에서 `DEFECT_PROFILE`을 바꾼 뒤 `npm run up`을 실행해도 됩니다.

macOS / Linux (터미널)

```bash
cp .env.example .env
```

Windows (PowerShell)

```powershell
Copy-Item .env.example .env
```

### 포트가 이미 사용 중이라면
`npm run up`이 충돌을 알려 줍니다. `.env`에서 `WEB_PORT`, `API_PORT`, `DB_PORT`를 바꾸면 됩니다. 어떤 프로그램이 포트를 쓰는지 직접 확인하는 방법은 다음과 같습니다.

macOS / Linux (터미널)

```bash
lsof -i :8080
```

Windows (PowerShell)

```powershell
Get-NetTCPConnection -LocalPort 8080
```

---

## 저장소 구조

```
apps/shop/        대상 앱 (api: Fastify + PostgreSQL, web: React)
  SPEC.md         제품 사양서 — 테스트의 기대 결과 근거
defects/          결함 주입 설정 (⚠️ 스포일러 포함 — 랩을 끝내기 전에는 열지 마세요)
labs/             랩 (labs/<QA-Lab 모듈 slug>/<랩 이름>/)
templates/        랩 README·lab.yaml 템플릿
scripts/          Node CLI(npm run 의 실체), 검증·인덱스 생성
data/             QA-Lab 모듈 목록 스냅샷 (원본 아님)
docs/             계획, 플랫폼 지원, 랩 작성 참조(LAB_SCHEMA.md)
```

## 라이선스
코드는 MIT, 문서는 CC BY 4.0입니다. 자세한 내용은 [LICENSE](LICENSE)를 보세요.
