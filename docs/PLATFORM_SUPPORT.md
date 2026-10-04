# 플랫폼 지원 (macOS / Windows / Linux)

## 컨테이너 이미지 아키텍처
`docker buildx imagetools inspect`로 확인했다(2026-10-02). 모두 멀티 아키텍처 인덱스 다이제스트로 고정했다.

| 이미지 | 사용처 | linux/amd64 | linux/arm64 | 고정 |
|---|---|---|---|---|
| `postgres:16-alpine` | `compose.yaml` db | ✅ | ✅ (v8) | `@sha256:721873c3…` |
| `node:24-alpine` | api·web 빌드, api 실행 | ✅ | ✅ (v8) | `@sha256:ebfe2f90…` |
| `nginx:1.27-alpine` | web 실행 | ✅ | ✅ (v8) | `@sha256:65645c7b…` |
| `locustio/locust:2.46.6` | 랩 `performance-testing-tools/locust-bottlenecks` (채점기가 실행) | ✅ | ✅ | `@sha256:d4361622…` |
| `mitmproxy/mitmproxy:12.2.3` | 랩 `api-testing-tools/swagger-and-traffic` t3 (채점기가 실행) | ✅ | ✅ | `@sha256:00b77b5d…` |

랩용 도구 이미지(Locust, SonarQube 등)는 해당 랩을 만들 때 추가한다. `TODO: verify`

호스트에 설치하는 도구: Newman·Ajv·Vitest·openapi-to-postmanv2·Playwright(`@playwright/test`)·selenium-webdriver 는 npm 의존성(`npm ci`)이다. Playwright 브라우저는 학습자가 `npx playwright install chromium` 으로, Selenium 은 Chrome 설치 + Selenium Manager 의 chromedriver 자동 다운로드(Windows 확인 2026-10-03, `TODO: verify` macOS)에 기댄다. Wireshark(`tshark`)는 랩 `api-testing-tools/swagger-and-traffic` t4 에서 학습자가 직접 설치한다(Windows 설치는 `TODO: verify-windows`).
mitmproxy 이미지의 기본 진입점은 root 권한이 필요해, 채점기는 진입점을 `mitmdump` 로 바꾸고 `--user 1000:1000 --cap-drop ALL` 로 실행한다. (기본 진입점 + `--cap-drop ALL` 은 `usermod`/`gosu` 에서 실패한다.)

## 검증 현황
| 항목 | Linux | macOS | Windows |
|---|---|---|---|
| `docker compose up -d --wait` → 웹·API·DB 기동 | ✅ (개발 환경, x86_64) | `TODO: verify` (Apple Silicon) | ✅ (2026-10-03) |
| `docker compose down -v` 초기화 | ✅ | `TODO: verify` | ✅ (2026-10-03) |
| 로그 파일 bind mount(`./var/logs`) 쓰기 | ✅ | `TODO: verify` | ✅ (2026-10-03) |
| API 단위·통합 테스트 | ✅ | `TODO: verify` | ✅ (2026-10-03) (단위 94 · 통합 81) |
| `npm test` (CLI·검증기·채점 도구 테스트) | ✅ | `TODO: verify` | ✅ (2026-10-03) |
| `npm run doctor` / `up` / `reset` / `down` / `logs` | ✅ | `TODO: verify` | ✅ (2026-10-03) |
| `npm run validate` | ✅ | `TODO: verify` | ✅ (2026-10-03) |

## GitHub Codespaces
`.devcontainer/devcontainer.json`(Node 24, docker-in-docker, Playwright chromium). 2026-10-04 2-core Codespace 에서 확인: `npm run doctor`, `npm run up`, `npm test` 637개, Selenium 랩 채점(Chrome 별도 설치 없이), 웹·Swagger UI(포트 전달 주소), 포트 기본 Private. 다른 랩 채점은 미확인 `TODO: verify`. 학습자 안내는 위키 Codespaces 페이지.

## GitHub Actions 러너 제약
- GitHub-hosted Windows 러너는 Linux 컨테이너를 실행할 수 없고, macOS(arm64) 러너에는 Docker가 없는 것으로 알고 있다. `TODO: verify` — 공식 문서 확인 필요(작성 환경에서 docs.github.com 접근 불가).
- 그래서 Docker 기반 통합 검증은 Ubuntu 러너에서만 하고(`lab-ci`, `nightly`, `validate` 의 `api` 잡), macOS·Windows 러너에서는 Docker 없이 되는 검사(`validate`: 규칙 검사, 인덱스 최신 여부, 채점기 단위 테스트)만 한다. 구성은 `docs/CI.md`.

## Windows 수동 확인 체크리스트
아래 항목은 CI로 검증할 수 없다. Windows 사용자가 확인하면 날짜와 환경을 적고 `TODO`를 지운다.

확인 환경(2026-10-03): Windows 11 Pro 10.0.26200, Windows PowerShell 5.1.26100, Docker Desktop(엔진 28.5.1, Compose v2.40.3, WSL 2), Node.js 24.11.1, npm 11.6.2, Chrome 154.0.8037.95, Git `core.autocrlf=true`, 저장소 위치 `C:\Users\…\Documents\`.

- [x] Docker Desktop(WSL 2 백엔드)에서 `docker compose up -d --wait` 성공 (`npm run up -- --profile advanced` 로 db·seed·api·web 모두 healthy, 포트는 127.0.0.1 에만)
- [x] 저장소를 Windows 파일 시스템(`C:\...`)에 두었을 때 bind mount(`./defects`, `./var/logs`) 동작 — 로그가 쓰이고 `npm run logs` 로 읽힌다. 속도 문제는 체감하지 못했다. 참고: `Get-ChildItem` 에는 `var/logs/app.log` 크기가 0 으로 보일 수 있지만 내용은 정상이다
- [x] `git clone` 후 `.sh`·`Dockerfile`·`*.yaml`이 LF로 체크아웃되는지 (`.gitattributes`) — `core.autocrlf=true` 에서도 `git ls-files --eol` 의 `w/crlf` 0개, `npm run doctor` 줄바꿈 OK
- [x] PowerShell 5.1에서 README의 PowerShell 블록 실행 — sql-and-logs(로그 보기), quality-gates(`$LASTEXITCODE`), locust·mitmproxy `docker run --mount`. psql 접속·SonarQube 블록은 아래 랩별 항목
- [ ] Node가 출력하는 한국어 메시지가 PowerShell/Windows Terminal에서 깨지지 않는지 — 파이프로 받은 출력은 정상. 콘솔 화면 표시는 `TODO: verify-windows`
- [x] `npm run doctor` 출력(한국어)과 Docker 미실행 시 안내 문구 (안내 문구는 단위 테스트로 확인)
- [x] `npm run up -- --profile beginner`, `npm run lab -- <slug>`처럼 `--` 뒤 인자가 PowerShell에서 그대로 전달되는지
- [x] `npm run logs -- --follow`가 새 줄을 따라 읽는지(`--grep` 도 확인). Ctrl+C 키 입력은 사람이 확인 `TODO: verify-windows`
- [x] `npm test`, `npm run validate` 통과 — 단, 커밋되지 않았던 랩 파일 문제가 있었다(아래 "알려진 사항")
- [x] winget 패키지 ID (`Docker.DockerDesktop`, `OpenJS.NodeJS.LTS`(24.x), `Git.Git`) — `winget show --id <ID> --exact` 로 확인

랩별 항목 (각 랩 README 의 `TODO: verify-windows` 주석과 1:1):
- [x] `npm run test:labs` 전체 통과 (앱을 `npm run up -- --profile advanced` 로 띄운 뒤, 2026-10-03. 접근성 랩은 2026-10-04 따로 통과). 랩 하나만은 `$env:QA_LAB_E2E_ONLY = "<모듈>/<랩>"; npm run test:labs`
- [x] `data-checking-sql-logs-analytics/sql-and-logs`: README 의 PowerShell 블록(로그 파일 보기), `docker compose exec db psql -U qa_reader -d shop` 접속(조회 가능, 쓰기는 읽기 전용 트랜잭션으로 거부)
- [ ] `api-contract-testing/shop-api-contract`: Postman 앱에서 컬렉션 가져오기·내보내기 `TODO: verify-windows`. 확인함: README 의 `npx newman run …` 명령(한국어 검증 이름도 정상 출력), 채점기의 Newman 실행(`test:labs`)
- [ ] `api-testing-tools/swagger-and-traffic`: `tshark` 가 PATH 에 잡히는지 `TODO: verify-windows`. 확인함: winget ID(`WiresharkFoundation.Wireshark`), mitmproxy `docker run --mount "type=bind,source=$PWD\…"` 경로 형식, 네트워크 이름 `qa-lab-shop_default`. 호스트 포트 8081 을 다른 프로그램이 쓰고 있으면 `-p 127.0.0.1:<다른 포트>:8080` 으로 바꾼다
- [x] `ui-automation/shop-ui-flows`: 브라우저가 없는 새 PC 에서 `npx playwright install chromium` 이 내려받는지 — 2026-10-04: 브라우저가 없는 상태(`PLAYWRIGHT_BROWSERS_PATH` 를 빈 폴더로)에서 `npx playwright install chromium` 이 Chrome for Testing 153 등 약 310MB 를 41초에 내려받았고, 그 브라우저로 Playwright 랩·접근성 랩 E2E 10개 통과. 빈 폴더 상태로 채점하면 "브라우저가 설치되어 있지 않습니다 … install chromium" 안내가 나옴. Node·npm·Windows 시스템 라이브러리가 이미 있는 PC 에서의 재현이다. 그 밖에 확인함: 헤드리스 실행, `npx playwright install chromium` 명령(이미 설치된 PC 에서 정상 종료), README 의 `$env:UI_VARIANT`·`$env:LATENCY` 블록(v2 · unstable 에서 정답 테스트 8개 통과)
- [x] `ui-automation-tools/selenium-shop-flow`: 설치된 Chrome 을 찾고 Selenium Manager 가 chromedriver 를 받는지(진단용 환경 변수 없이) — Chrome 154 용 드라이버를 `%USERPROFILE%\.cache\selenium` 에 받음
- [x] `performance-testing-tools/locust-bottlenecks`: Locust `docker run --mount` 경로 형식, 채점기의 결과 폴더 쓰기(Windows 에서 `chmod` 는 의미 없음)
- [ ] `security-testing-tools/scanner-triage`: (선택) SonarQube 스캐너 `-v "${PWD}\…"` 경로 형식
- [x] `ci-cd-continuous-testing/quality-gates`: README 의 `$LASTEXITCODE` 블록
- [x] `usability-accessibility-testing/shop-a11y-audit` (2026-10-04): axe 스캔 실행(README 의 `npx playwright test` 명령, 결과 파일 6개), README 의 PowerShell 블록(결과 파일은 ASCII 라 `Get-Content` 로 깨지지 않음), 분류표·점검표·보고서 CSV 를 UTF-8·CP949·UTF-8(BOM, Excel 의 "CSV UTF-8") 세 형식으로 저장해 t2~t4 채점 통과, 랩 E2E(`test:labs`) 5개 통과. 브라우저가 없는 새 PC 의 `npx playwright install chromium` 도 확인(위 Playwright 랩 항목과 같은 방법)
- [x] 한국어 파일 내용(CSV)을 CP949 로 저장한 뒤 채점 — `test-design/shop-rules` t1 정답 CSV 를 CP949·CRLF(Excel 의 일반 "CSV" 저장과 같은 형식)로 저장해 "CP949 로 읽었습니다"와 함께 UTF-8 과 같은 결과(통과). Excel·메모장 화면에서 직접 저장하는 것과 YAML 은 `TODO: verify-windows`

## 알려진 사항
- (2026-10-03 Windows 확인 중 발견, OS 와 무관) `.gitignore` 의 `*.log`·`reports/` 규칙 때문에 `sql-and-logs/starter/data/*.log` 와 `defect-reports/starter/reports/_TEMPLATE.md`·`solution/reports/*.md` 가 커밋되지 않았다. 작성 환경에는 파일이 남아 있어 테스트가 통과했지만 새로 clone 하면 실패한다. `.gitignore` 에 예외를 추가했고 로그는 `setup/logs.mjs` 로 다시 만들었다. 리포트 템플릿과 모범 리포트 4개는 작성 환경에서 원본을 커밋했다(1abb564). 앱을 띄운 Windows 에서 `npm test` 600개 전부 통과, 결함 리포트 랩 E2E 통과(2026-10-03).
- (같은 날 발견, OS 와 무관) Playwright 랩 t2 정답 테스트가 상품 목록의 같은 이름 수량 입력란을 잡는 경합이 있어 빠른 PC 에서 매번 실패했다. 장바구니 행(`cart-row`) 안으로 범위를 좁혀 고쳤다. 채점기가 "값이 다름"을 "시간 초과"로 안내하던 오류 분류도 고쳤다.
- 저장소 위치(Windows 파일 시스템 또는 WSL 내부)에 따라 bind mount 성능이 다를 수 있다. 정확한 권장 사항은 Docker 공식 문서를 확인해 적는다. `TODO: verify`

## 알려진 도구 제약
| 항목 | 내용 |
|---|---|
| Stryker × Vitest | 이 저장소의 Vitest 5.0.3 과 Stryker(`@stryker-mutator/core` · `vitest-runner` 10.0.0) 조합에서, 뮤턴트가 코드에 반영되지 않아 모든 뮤턴트가 "생존"으로 나오는 것을 확인했다(2026-10-03, Linux). 그래서 구조 기반 테스트 랩은 미리 정의한 뮤턴트로 채점하고 Stryker 는 의존성에 넣지 않았다. `TODO: verify` — 호환되는 버전 조합이 확인되면 선택 과제로 추가한다. |

## UI 랩 개발 환경 메모 (검증 방법)
- Playwright 랩(`ui-automation/shop-ui-flows`)은 사전 설치된 Chromium 으로 검증했다: `QA_LAB_CHROMIUM_PATH=<chrome 경로>` 로 채점기 설정에 실행 파일을 넘기고 `--no-sandbox` 를 쓴다(컨테이너 root 환경). 학습자 환경에서는 필요 없다.
- Selenium 랩(`ui-automation-tools/selenium-shop-flow`)은 개발 환경에서 chromedriver 를 내려받을 수 없어(외부 다운로드 차단), PATH 의 chromedriver 147 + Chromium 141 을 `--disable-build-check` 로 연결해 검증했다. `support/driver.mjs` 의 진단용 환경 변수 `QA_LAB_CHROME_PATH`, `QA_LAB_NO_SANDBOX=1`, `QA_LAB_DRIVER_PATH`, `QA_LAB_DRIVER_ARGS` 가 그 용도다. 정식 조합(Chrome 과 맞는 chromedriver)은 CI 의 Ubuntu 러너에서 확인한다. `TODO: verify`
