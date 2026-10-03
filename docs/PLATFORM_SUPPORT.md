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

호스트에 설치하는 도구: Newman·Ajv·Vitest·openapi-to-postmanv2·Playwright(`@playwright/test`)·selenium-webdriver 는 npm 의존성(`npm ci`)이다. Playwright 브라우저는 학습자가 `npx playwright install chromium` 으로, Selenium 은 Chrome 설치 + Selenium Manager 의 chromedriver 자동 다운로드(`TODO: verify-windows`, `TODO: verify` macOS)에 기댄다. Wireshark(`tshark`)는 랩 `api-testing-tools/swagger-and-traffic` t4 에서 학습자가 직접 설치한다(Windows 설치는 `TODO: verify-windows`).
mitmproxy 이미지의 기본 진입점은 root 권한이 필요해, 채점기는 진입점을 `mitmdump` 로 바꾸고 `--user 1000:1000 --cap-drop ALL` 로 실행한다. (기본 진입점 + `--cap-drop ALL` 은 `usermod`/`gosu` 에서 실패한다.)

## 검증 현황
| 항목 | Linux | macOS | Windows |
|---|---|---|---|
| `docker compose up -d --wait` → 웹·API·DB 기동 | ✅ (개발 환경, x86_64) | `TODO: verify` (Apple Silicon) | `TODO: verify-windows` |
| `docker compose down -v` 초기화 | ✅ | `TODO: verify` | `TODO: verify-windows` |
| 로그 파일 bind mount(`./var/logs`) 쓰기 | ✅ | `TODO: verify` | `TODO: verify-windows` |
| API 단위·통합 테스트 | ✅ | `TODO: verify` | `TODO: verify-windows` |
| `npm test` (CLI·검증기·채점 도구 테스트 145개) | ✅ | `TODO: verify` | `TODO: verify-windows` |
| `npm run doctor` / `up` / `reset` / `down` / `logs` | ✅ | `TODO: verify` | `TODO: verify-windows` |
| `npm run validate` | ✅ | `TODO: verify` | `TODO: verify-windows` |

## GitHub Actions 러너 제약
- GitHub-hosted Windows 러너는 Linux 컨테이너를 실행할 수 없고, macOS(arm64) 러너에는 Docker가 없는 것으로 알고 있다. `TODO: verify` — 공식 문서 확인 필요(작성 환경에서 docs.github.com 접근 불가).
- 그래서 Docker 기반 통합 검증은 Ubuntu 러너에서만 하고(`lab-ci`, `nightly`, `validate` 의 `api` 잡), macOS·Windows 러너에서는 Docker 없이 되는 검사(`validate`: 규칙 검사, 인덱스 최신 여부, 채점기 단위 테스트)만 한다. 구성은 `docs/CI.md`.

## Windows 수동 확인 체크리스트
아래 항목은 CI로 검증할 수 없다. Windows 사용자가 확인하면 날짜와 환경을 적고 `TODO`를 지운다.

- [ ] Docker Desktop(WSL 2 백엔드)에서 `docker compose up -d --wait` 성공
- [ ] 저장소를 Windows 파일 시스템(`C:\...`)에 두었을 때 bind mount(`./defects`, `./var/logs`) 동작과 속도
- [ ] `git clone` 후 `.sh`·`Dockerfile`·`*.yaml`이 LF로 체크아웃되는지 (`.gitattributes`)
- [ ] PowerShell 5.1에서 README의 PowerShell 블록 실행
- [ ] Node가 출력하는 한국어 메시지가 PowerShell/Windows Terminal에서 깨지지 않는지
- [ ] `npm run doctor` 출력(한국어)과 Docker 미실행 시 안내 문구
- [ ] `npm run up -- --profile beginner`, `npm run lab -- <slug>`처럼 `--` 뒤 인자가 PowerShell에서 그대로 전달되는지
- [ ] `npm run logs -- --follow`가 동작하고 Ctrl+C로 끝나는지 (로그 파일을 Node가 읽으므로 `Get-Content -Wait` 불필요)
- [ ] `npm test`, `npm run validate` 통과
- [ ] winget 패키지 ID (`Docker.DockerDesktop`, `OpenJS.NodeJS.LTS`, `Git.Git`)

## 알려진 사항
- 저장소 위치(Windows 파일 시스템 또는 WSL 내부)에 따라 bind mount 성능이 다를 수 있다. 정확한 권장 사항은 Docker 공식 문서를 확인해 적는다. `TODO: verify`

## 알려진 도구 제약
| 항목 | 내용 |
|---|---|
| Stryker × Vitest | 이 저장소의 Vitest 5.0.3 과 Stryker(`@stryker-mutator/core` · `vitest-runner` 10.0.0) 조합에서, 뮤턴트가 코드에 반영되지 않아 모든 뮤턴트가 "생존"으로 나오는 것을 확인했다(2026-10-03, Linux). 그래서 구조 기반 테스트 랩은 미리 정의한 뮤턴트로 채점하고 Stryker 는 의존성에 넣지 않았다. `TODO: verify` — 호환되는 버전 조합이 확인되면 선택 과제로 추가한다. |

## UI 랩 개발 환경 메모 (검증 방법)
- Playwright 랩(`ui-automation/shop-ui-flows`)은 사전 설치된 Chromium 으로 검증했다: `QA_LAB_CHROMIUM_PATH=<chrome 경로>` 로 채점기 설정에 실행 파일을 넘기고 `--no-sandbox` 를 쓴다(컨테이너 root 환경). 학습자 환경에서는 필요 없다.
- Selenium 랩(`ui-automation-tools/selenium-shop-flow`)은 개발 환경에서 chromedriver 를 내려받을 수 없어(외부 다운로드 차단), PATH 의 chromedriver 147 + Chromium 141 을 `--disable-build-check` 로 연결해 검증했다. `support/driver.mjs` 의 진단용 환경 변수 `QA_LAB_CHROME_PATH`, `QA_LAB_NO_SANDBOX=1`, `QA_LAB_DRIVER_PATH`, `QA_LAB_DRIVER_ARGS` 가 그 용도다. 정식 조합(Chrome 과 맞는 chromedriver)은 CI 의 Ubuntu 러너에서 확인한다. `TODO: verify`
