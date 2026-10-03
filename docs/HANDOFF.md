# 작업 인계서 (HANDOFF)

> **다른 컴퓨터·다른 Claude 세션이 이 저장소 작업을 이어받을 때 가장 먼저 읽는 문서입니다.**
> 규칙의 원본은 루트 [`CLAUDE.md`](../CLAUDE.md)(자동으로 읽힘)와 [`PLAN.md`](PLAN.md)입니다. 이 문서는 그 규칙이 *어떻게 적용되어 지금 상태가 되었는지*와 *다음에 할 일*을 적습니다.
> 작성: 2026-10-03, 클라우드 세션에서 인계. 마지막 커밋은 아래 `git log`로 확인하세요.

---

## 0. 이어받는 Claude 에게 (먼저 할 일)
1. `CLAUDE.md` → 이 문서 → 할 일에 맞는 문서(§6 표) 순서로 읽습니다.
2. 아래 명령으로 상태를 확인합니다. 모두 통과해야 정상입니다.

공통

```bash
git checkout claude/affectionate-faraday-amipy5
git pull
npm ci
npm run doctor
npm run validate
npm run build-index -- --check
npm test
```

3. 지금 할 일은 **§5 남은 일**을 보고 정합니다.
4. 사용자에게는 한국어로, 쉬운 말로 답합니다. 커밋 메시지에는 모델 이름을 넣지 않습니다.
5. **브랜치 흐름**: 작업은 `claude/affectionate-faraday-amipy5` 에서 하고 push 도 이 브랜치에 합니다. `main` 에는 **직접 push 하지 않고 PR 로 합칩니다**. PR 은 사용자가 원할 때만 만듭니다. `main` 은 2026-10-03 에 만들었고, CI(`validate`·`publish-index`·`codeql`)는 `main` push 와 PR 에서 돕니다.

## 1. 이 저장소는 무엇인가 (요약)
- QA-Lab(https://qa-lab.pages.dev/) 강의와 짝을 이루는 **한국어 QA 실습 저장소**입니다. 강의 내용은 복사하지 않고(모듈·레슨 이름도 쓰지 않음, slug 만), 실행 환경·과제·대상 앱·자동 채점만 담습니다.
- **대상 앱(SUT) "QA 숍"**: `apps/shop/` — Fastify + PostgreSQL + React(nginx), `docker compose`로 `127.0.0.1`에만 뜹니다. 의도적 결함 DF-001~019 를 프로필(`none` ⊂ `beginner` ⊂ `intermediate` ⊂ `advanced`)과 요청 헤더로 켜고 끕니다.
- **랩 13개(모두 `ready`)**: `labs/<모듈 slug>/<랩>/` — README, starter, solution, check(채점기), lab.yaml.
- **학습자 명령**은 모두 `npm run <cmd>`(→ `node scripts/cli.mjs <cmd>`). macOS·Windows·Linux 공통이 목표입니다.

## 2. 진행 단계 (CLAUDE.md §9)
| 단계 | 상태 |
|---|---|
| 1 PLAN | 완료 (v0.3, 사용자 승인 "추천안대로") |
| 2 SUT + 결함 주입 + compose | 완료 |
| 3 Node CLI·스키마·validate/build-index | 완료 |
| 4 랩 1~3 | 완료 — **사용자 직접 풀이·피드백 대기** |
| 5 랩 4~13 | 완료 (결함 카탈로그 확장·보안 랩 안전 검수 포함) |
| 6 CI | 완료 — 2026-10-03 `main` push 로 첫 실행: `validate`(ubuntu·macos·windows·api), `publish-index`, `codeql` 모두 성공. `lab-ci`·`nightly` 는 아직 실행 전 |
| 7 QA-Lab 연동 제안서 | 완료 |

### 커밋 흐름 (오래된 것 → 최신)
```
853cb40 PLAN 초안 → 2929227 v0.2(크로스 플랫폼) → e373a56 v0.3(분석 리포트 반영)
e0244d6 PLAN 승인·CLAUDE.md·스냅샷
1539339 SUT 골격 + 결함 주입 + compose
84c4b4a Node CLI·lab.yaml 스키마·validate/build-index·템플릿
ba5c4d4 랩 1~3 · 4acdb7f 빈 repro 블록 메시지
08a6b6a 랩 4 · 79f44c0 랩 5 · 5917f63 랩 6(+setup 훅)
84ca152 advanced 결함 DF-013~019 (Opus 검수)
f816070 랩 7a · 15d8372 랩 7b
f7dd299 랩 8a·8b + 환경 조건(UI_VARIANT·LATENCY_PROFILE)·fixture API
1a6390d 랩 11 + 보안 랩 안전 검수 (Opus)
3847130 랩 10·9
eed5621 CI 워크플로 · 309da89 연동 제안서 · cad76e1 Windows 체크리스트 보강
```

## 3. 랩 목록과 채점 방식
| 랩 | 채점 방식 (핵심) | Docker |
|---|---|---|
| `test-design/shop-rules` | 케이스 표(CSV) → 재현 절차로 실행, 차등 오라클 + 결함 귀속 | 필요 |
| `defect-management/defect-reports` | 결함 리포트의 repro 블록 실행, 심각도 판단, 지표 계산 | 필요 |
| `exploratory-testing/charter-sessions` | 차터↔세션 연결, `beyond_profile`, X-Request-Id 증거 | 필요 |
| `unit-integration-testing/cart-domain` | 학습자 Vitest 테스트를 뮤턴트로 채점 | 불필요 |
| `structural-testing-practice/coverage-and-mutation` | 커버리지 + 뮤턴트 + 정의-사용 쌍 | 불필요 |
| `data-checking-sql-logs-analytics/sql-and-logs` | 읽기 전용 계정 `qa_reader`로 학습자 SQL 실행, 로그 분석 답 | 필요(DB) |
| `api-contract-testing/shop-api-contract` | Postman 컬렉션을 Newman 으로 실행(결함 헤더 주입), Ajv 계약 테스트, 오퍼레이션 커버리지 | 필요 |
| `api-testing-tools/swagger-and-traffic` | Swagger 시나리오 답, OpenAPI→컬렉션, **mitmproxy 컨테이너**로 애드온 동작 확인, 합성 `.pcap` 분석 | 필요 |
| `ui-automation/shop-ui-flows` | Playwright 를 화면 변형 v1/v2·지연 unstable·반복으로 실행 | 필요 |
| `ui-automation-tools/selenium-shop-flow` | 같은 시나리오를 Selenium 으로, v1/v2 × unstable × 3회 | 필요 + Chrome |
| `ci-cd-continuous-testing/quality-gates` | 워크플로 YAML 정적 규칙 R1~R10, 게이트 스크립트 26 시나리오 | 불필요 |
| `performance-testing-tools/locust-bottlenecks` | **Locust 컨테이너**로 학습자 시나리오 실행, 채점기가 기준 시나리오로 직접 측정해 병목 정답 생성 | 필요 |
| `security-testing-tools/scanner-triage` | 허가·범위 체크리스트(관문) → 스캐너 리포트 100건 TP/FP/DUP 분류(집계만 출력) | 불필요 |

공통 원칙: 정답과 같은지가 아니라 **관찰 가능한 결과**로 판정. 실패 출력에는 앱의 실제 값·정답을 숨깁니다(정답을 알려 주지 않기 위해). 학습자가 바꿀 수 없게 채점기는 `starter/`의 원본 도우미(`support/` 등)를 씁니다.

## 4. 꼭 알아야 할 결정과 이유
- **슬러그만 쓴다**: 모듈·레슨 이름은 강의 내용이라 복사 금지. 스냅샷(`data/qa-lab-modules.snapshot.json`)에도 이름이 없습니다.
- **결함은 `isDefectOn('DF-xxx')` 한 곳에서만 분기**하고, 결함마다 "단독으로 켜면 재현, 나머지를 다 켜도 그것만 끄면 재현 안 됨"을 통합 테스트(`apps/shop/api/test/integration/defects.test.ts`)가 보장합니다. 새 결함은 기존 repro 가 쓰는 필드·경로를 건드리지 않고 상위 프로필에만 넣습니다.
- **채점기는 요청 헤더로 결함을 고정**(`X-QA-Lab-Defects`)해서, 학습자가 띄운 프로필과 무관하게 같은 결과가 나옵니다. UI 랩도 `none`으로 고정합니다(한 번 이것 때문에 E2E 가 실패했었음).
- **보안 랩**: 실행 중인 앱에 취약점을 넣지 않고, 분석 대상은 실행되지 않는 샘플 코드(`scan-target/`). 가짜 비밀 값은 실제 서비스 형식과 겹치지 않게. 상세 `docs/SECURITY_LAB_SAFETY.md`.
- **외부 도구 컨테이너**(mitmproxy, Locust): 태그+다이제스트 고정, `--cap-drop ALL`, 학습자 파일은 읽기 전용 마운트, 호스트 포트는 `127.0.0.1`만(Locust 는 아예 없음).
- **Stryker 는 쓰지 않음**: Vitest 5.0.3 과 호환되지 않아 뮤턴트를 미리 정의해 채점합니다.
- **모델 전환 규칙**: CLAUDE.md §9. Opus 는 되돌리기 비싼 결정(결함 카탈로그, 보안 안전 장치, 원인 불명 실패)에만. 전환 지점에서는 정해진 문구로 멈춥니다.

## 5. 남은 일 (우선순위 순)
1. **Windows 확인** — **2026-10-03 로컬 Windows 에서 대부분 확인 완료**(`npm test` 600개, `test:labs` 전체, API 단위·통합). 남은 것은 GUI·사람 확인(Postman 앱, Wireshark 화면, 콘솔의 한국어 표시, Ctrl+C)과 PLATFORM_SUPPORT.md 체크리스트의 체크 안 된 항목뿐입니다. 목록: [`docs/PLATFORM_SUPPORT.md`](PLATFORM_SUPPORT.md)의 "Windows 수동 확인 체크리스트"(공통 10 + 랩별 10). 진행 방식:
   1. §0 의 기본 명령을 PowerShell 5.1 에서 실행(한국어 출력 깨짐, LF 체크아웃 확인).
   2. Docker Desktop 실행 후 `npm run up -- --profile advanced`, `npm run logs -- --follow`.
   3. `npm run test:labs`(전체, 수십 분). 막히면 `$env:QA_LAB_E2E_ONLY = "<모듈>/<랩>"; npm run test:labs` 로 랩 하나씩.
   4. 각 랩 README 의 PowerShell 블록(특히 `docker run --mount "type=bind,source=$PWD\…"` 경로 형식, 네트워크 이름 `qa-lab-shop_default`).
   5. 통과 항목은 날짜·환경을 적고 해당 `TODO: verify-windows` 를 지움. 실패는 고쳐서 커밋·push.
   - GUI 가 필요한 것(Postman 앱, Wireshark 화면)은 사용자에게 확인 방법을 안내. **winget 설치는 실행 전에 사용자에게 묻기.**
2. **CI** — `validate`·`publish-index`·`codeql` 은 첫 실행 성공(2026-10-03, CodeQL default setup 충돌 없음). 남은 것: `lab-ci`(랩을 바꾼 PR 에서 돎)·`nightly` 첫 실행 확인, `main` 브랜치 보호 규칙(`docs/CI.md`).
3. **GitHub 기본 브랜치를 `main` 으로** — 2026-10-03 현재 기본 브랜치는 아직 작업 브랜치일 수 있다. `git ls-remote --symref origin HEAD` 로 확인. 바꾸기는 사용자가 한다(웹 Settings → General → Default branch, 또는 `gh repo edit --default-branch main`).
4. **위키** — `docs/wiki/` 의 9개 페이지를 2026-10-03 위키에 게시했다(https://github.com/nohsundongtbell/qa-lab-practice/wiki). 원본은 `docs/wiki/` 이고, 고치면 같은 방법(`docs/wiki/README.md`)으로 다시 올린다.
5. **사용자 피드백**: 랩 1~3 직접 풀이 결과 → 반영 후 같은 기준을 다른 랩에도.
6. **macOS 확인**(`TODO: verify`), SonarQube 선택 실습 검증(클라우드에서는 ES 디스크 한도로 실패), m61 레슨 DDL 로 DB 컬럼 확인(`TODO: verify`).

## 6. 어떤 문서를 읽을까
| 하려는 일 | 문서 |
|---|---|
| 규칙 전체 | `CLAUDE.md`, `docs/PLAN.md` |
| 새 랩 만들기 | `docs/CONTRIBUTING_LABS.md`, `docs/LAB_SCHEMA.md`, `templates/` |
| 결함 추가 | `apps/shop/api/README.md`(결함 추가 절차), `docs/REPRO_DSL.md` |
| 플랫폼·Windows | `docs/PLATFORM_SUPPORT.md` |
| CI | `docs/CI.md` |
| 보안 랩 | `docs/SECURITY_LAB_SAFETY.md` |
| QA-Lab 연동 | `docs/QA_LAB_INTEGRATION.md` |
| 제품 사양(기대 결과) | `apps/shop/SPEC.md`, `apps/shop/api/openapi.yaml` |

정답표 `defects/ANSWERS.md`·`defects/catalog.yaml`은 스포일러입니다. 어떤 README 에서도 링크하지 않습니다.

## 7. 클라우드 개발 환경에서만 쓴 우회 (로컬에서는 보통 필요 없음)
클라우드 컨테이너에는 외부 다운로드 제한이 있어 아래처럼 검증했습니다. **로컬 Windows·Mac 에서는 쓰지 말고** 정식 방법(학습자와 같은 방법)으로 확인하세요.
- Docker 데몬을 손으로 띄움(`dockerd &`), 이미지 빌드는 프록시 CA 를 주입한 복사본으로(저장소 Dockerfile 은 그대로).
- Playwright: `QA_LAB_CHROMIUM_PATH=/opt/pw-browsers/chromium`(채점기가 `--no-sandbox` 와 함께 사용). 로컬은 `npx playwright install chromium`.
- Selenium: `QA_LAB_CHROME_PATH`, `QA_LAB_NO_SANDBOX=1`, `QA_LAB_DRIVER_PATH`, `QA_LAB_DRIVER_ARGS=--disable-build-check`(드라이버·브라우저 버전 불일치 우회). 로컬은 이 변수 없이 Selenium Manager 가 드라이버를 받는지 확인해야 합니다.
- SonarQube: `vm.max_map_count` 를 올려도 세션 디스크 한도 때문에 Elasticsearch 가 멈춰 검증 못 함.

## 8. 마지막으로 확인된 상태
로컬 Windows 11 (2026-10-03): `npm run validate` 통과, `npm test` 600개 통과(앱 실행 중), API 단위 94 + 통합 81, `npm run test:labs` 전체 통과(Playwright t2 경합 수정 후). GitHub 러너: `validate`·`publish-index`·`codeql` 성공.

클라우드, Linux:
- `npm run validate` 통과(랩 13개), `npm run build-index -- --check` 최신, `npm test` 598개 통과.
- API: 단위 94 + 통합 81 통과.
- 랩 E2E(`npm run test:labs`, 앱 `advanced`): 51개 중 UI 랩 2개가 처음에 실패 → 결함 헤더 고정으로 수정 후 두 랩 solution 통과 확인. 전체를 한 번에 다시 돌리지는 않았습니다(로컬에서 첫 번째 확인 대상).
