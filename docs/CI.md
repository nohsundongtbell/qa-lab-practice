# CI (GitHub Actions)

워크플로는 `.github/workflows/`에 있고, **저장소 설정이나 비밀 값(secrets)이 필요 없습니다.** 모두 `permissions: contents: read`로 시작하고(CodeQL만 `security-events: write`), 액션은 `@v4` 같은 버전으로 고정하며, 모든 잡에 `timeout-minutes`가 있습니다. 이 규칙들은 랩 9가 가르치는 것과 같고, `scripts/ci/workflows.test.mjs`가 우리 워크플로에도 적용되는지 검사합니다.

| 워크플로 | 언제 | 어디서 | 무엇을 |
|---|---|---|---|
| `validate` | PR, main 푸시, nightly가 재사용 | ubuntu · macOS · Windows | `npm run validate`, `npm run build-index -- --check`, `npm test`. 별도 잡 `api`(ubuntu): API 타입 검사·단위 테스트·통합 테스트(결함마다 단독 재현·독립성 포함) |
| `lab-ci` | PR, 수동 | ubuntu | 바뀐 랩만 골라(`scripts/ci/select-labs.mjs`) 앱을 띄우고 **starter는 과제마다 실패, solution은 통과**하는지 확인. 앱·결함·공통 스크립트·의존성이 바뀌면 모든 랩 |
| `nightly` | 매일 03:17(KST), 수동 | ubuntu 등 | `validate` 전체 + 모든 랩 E2E |
| `publish-index` | main 푸시, 수동 | ubuntu | `validate` → `labs/index.json`이 최신인지 확인 → 산출물로 보관. QA-Lab 동기화가 main의 이 파일을 읽습니다 |
| `codeql` | PR, main 푸시, 매주 수요일 | ubuntu | CodeQL 코드 스캐닝. 보안 랩의 분석용 샘플 코드(`scan-target/`)는 일부러 취약하므로 제외 |

## 로컬에서 같은 것 돌려 보기
`validate` 잡이 하는 일:

공통

```bash
npm ci
npm run validate
npm run build-index -- --check
npm test
```

`api` 잡이 하는 일:

공통

```bash
npm --prefix apps/shop/api ci
npm --prefix apps/shop/api run typecheck
npm --prefix apps/shop/api test
docker compose up -d --wait db
npm --prefix apps/shop/api run test:integration
docker compose down -v
```

`lab-ci`가 한 랩에 하는 일(랩 하나만 확인):

macOS / Linux (터미널)

```bash
npm run up -- --profile advanced
QA_LAB_E2E_ONLY=api-contract-testing/shop-api-contract npm run test:labs
npm run down
```

Windows (PowerShell)

```powershell
npm run up -- --profile advanced
$env:QA_LAB_E2E_ONLY = "api-contract-testing/shop-api-contract"; npm run test:labs
npm run down
```

`QA_LAB_E2E_ONLY`는 쉼표로 여러 랩을, `QA_LAB_E2E_SKIP`은 건너뛸 랩을 받습니다. 이 목록에 맞는 랩이 하나도 없으면 "No test found"로 실패합니다(오타를 조용히 넘기지 않기 위해).

## 저장소 설정 권장
- main 브랜치 보호 (2026-10-04 설정): PR 로만 합치기(승인 수 0 — 혼자 쓰는 저장소), 관리자에게도 적용, 강제 push·삭제 금지, 최신 main 포함은 요구하지 않음. 필수 체크: `validate (ubuntu-latest)`, `validate (macos-latest)`, `validate (windows-latest)`, `api (단위·통합, 결함 독립성)`, `analyze`(CodeQL), `lab-ci 결과`. `lab-ci`의 랩 잡 이름은 PR 마다 달라서(`<모듈>/<랩>`) 필수로 걸 수 없으므로, 고른 랩이 모두 통과했는지(고른 랩이 없으면 통과) 판정하는 `lab-ci 결과` 잡을 필수 체크로 쓴다. 잡 이름을 바꾸면 보호 규칙의 필수 체크도 함께 바꿔야 한다.
- **CodeQL 기본 설정(default setup)을 이미 켰다면** `codeql.yml`과 충돌합니다. 둘 중 하나만 쓰세요. 기본 설정을 쓸 거라면 `codeql.yml`을 지우고, 저장소 설정의 코드 스캐닝에서 `labs/security-testing-tools/scanner-triage/starter/scan-target`를 제외하세요.
- 포크에서 온 PR에서는 `GITHUB_TOKEN`이 읽기 전용이라 이 워크플로들이 그대로 돕니다(`pull_request_target`은 쓰지 않습니다).

## 알려진 한계 (`TODO: verify`)
- 2026-10-03 `main` push 로 `validate`(ubuntu·macOS·Windows 러너의 `npm test` 포함, `api` 잡), `publish-index`, `codeql` 이 처음 실행되어 모두 성공했습니다. CodeQL default setup 과의 충돌은 없었습니다.
- `lab-ci` 는 2026-10-04 PR #1·#2 에서 처음 끝까지 돌아 모든 랩이 통과했습니다(첫 실행에서 랩 고르기 `--base` 옵션 버그와, Docker 가 필요 없는 랩을 앱 없이 채점하지 못하던 문제를 고침). `nightly` 는 2026-10-03 예약 실행과 2026-10-04 수동 실행(랩 14개, 약 10분) 모두 성공했습니다.
- 워크플로의 액션은 Node.js 24 를 쓰는 버전으로 고정합니다: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `github/codeql-action/*@v4` (2026-10-04 올림. 이전 v4·v3 은 Node.js 20 이라 지원 종료 경고가 났음).
- GitHub 의 `ubuntu-latest` 는 2026-10-19 부터 Ubuntu 26 으로 바뀝니다. 그 뒤 첫 `nightly` 에서 Playwright 브라우저 설치(`--with-deps`)·Docker·Selenium 이 깨지지 않는지 확인하세요(`TODO: verify`).
- `lab-ci`/`nightly`의 UI 랩은 `npx playwright install --with-deps chromium`과 러너의 Chrome(Selenium Manager가 chromedriver를 받음)에 기댑니다. 개발 환경에서는 사전 설치된 Chromium으로 대신 확인했습니다.
- 앱 이미지를 빌드하고 Locust·mitmproxy 이미지를 받으므로 `lab-ci`/`nightly`는 몇 분 이상 걸립니다. Docker Hub 요청 제한에 걸리면 재시도하세요.
