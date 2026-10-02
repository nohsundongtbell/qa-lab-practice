# qa-lab-practice 구현 계획 (PLAN) — 초안 v0.2

> 상태: **승인 대기**. 이 문서가 승인되기 전에는 구현을 시작하지 않는다.
> 승인된 결정 사항은 루트 `CLAUDE.md`에 요약한다.
>
> v0.2 변경: 크로스 플랫폼(macOS/Windows) 전략 추가(§6), `lab.yaml`의 `platforms`·OS별 `check` 반영, CI OS 매트릭스 반영, 멀티 아키텍처 이미지 원칙 추가.

---

## 0. 사전 작업 결과와 제약

| 항목 | 결과 |
|---|---|
| 분석 리포트 `/Users/apple/qa-lab-practice-analysis/` | **없음**. 작업 환경이 클라우드 컨테이너(Linux)라서 로컬 Mac 경로에 접근할 수 없다. |
| `https://qa-lab.pages.dev/curriculum/` 크롤링 | **실패**. 환경의 네트워크 정책(egress proxy)이 `qa-lab.pages.dev`를 차단한다. (v0.2 작성 시 재확인, 여전히 차단) |
| `docs.github.com` (러너 제약 확인용) | **실패**. 같은 이유로 차단 → 러너 관련 사실은 `TODO: verify` |
| GitHub에 QA-Lab 소스 저장소가 있는지 | 이 세션에서 접근 가능한 저장소 중에는 없다. |

**그래서 이 초안에서는 다음을 확정하지 못했다.**
- 모듈 slug, 레슨 slug, 선수 관계 → 요청서 slug를 그대로 쓰고 모두 `TODO: verify`.
- 강의 기존 실습과의 중복 여부 → "신규 / 보강 / 제외" 판정 보류(§3).
- `data/qa-lab-modules.snapshot.json` → 원본이 없어 만들지 않았다(지어낸 데이터가 되므로).

**해제 방법 (택1):**
1. 클라우드 환경 설정 → Network access → Custom → Allowed domains에 `qa-lab.pages.dev`(가능하면 `docs.github.com`도) 추가 — https://code.claude.com/docs/en/cloud-environments#network-access
2. 분석 리포트(`00`~`05` md, `modules.json`)를 대화에 붙여 넣거나 임시 브랜치에 올리기

그 전까지 `scripts/validate`의 slug 존재 검증은 스냅샷이 없으면 **실패**한다(요구사항대로).

---

## 1. 대상 앱(SUT) 기술 스택

### 공통 도메인 (두 안 모두 같음)
작은 **쇼핑몰** 하나로 범위를 좁힌다(예약 도메인은 1차 제외).
- 회원(등급: 일반/실버/골드/VIP), 한글 이름·주소 입력
- 상품(원 단위 정수 금액, 재고), 장바구니, 주문(상태 전이: `PENDING → PAID → SHIPPED → DELIVERED`, `CANCELLED`, `REFUNDED`)
- 쿠폰(정액/정률, 최소 주문 금액, 중복 사용 불가, 유효기간)
- 배송비(예: 5만 원 이상 무료, 도서산간 추가 — 기준값은 구현 시 상수로 고정)
- 배송 예정일 = **영업일** 계산(주말 + 고정 공휴일 표. 대체공휴일 날짜는 `TODO: verify` 후 하드코딩)
- 결제는 가짜(fake) 게이트웨이. 외부 호출 없음

### 안 A — TypeScript 단일 언어 (**추천**)
| 층 | 선택 |
|---|---|
| 런타임 | Node.js 24 LTS (`TODO: verify` — 요청서 예시는 `node20`이나 Node 20은 2026-04 EOL. 22 LTS도 가능) |
| API | Fastify + **spec-first OpenAPI 3.1** (`apps/shop/api/openapi.yaml`이 계약 원본, 요청/응답 검증) |
| DB | PostgreSQL 16 (태그 + 다이제스트 고정), SQL 마이그레이션 + 시드 |
| Web | React + Vite 빌드 → nginx 정적 서빙, `/api` 리버스 프록시 |
| 도메인 로직 | `src/domain/`의 순수 함수(배송비, 쿠폰, 영업일). `Clock`/`Random` 주입 (단위 테스트 랩용) |
| 로그 | JSON 구조화 로그를 bind mount(`./var/logs`, compose 기준 상대 경로)에 기록 (데이터 점검 랩용) |

Vitest + Stryker, Playwright(TS), Newman, Pact JS, k6(JS) 모두 JS/TS → 학습자는 **언어 하나**만 알면 된다. 채점기·CLI도 Node라서 **크로스 플랫폼 실행 계층(§6)과 같은 툴체인**이 된다.

### 안 B — Python
| 층 | 선택 |
|---|---|
| API | FastAPI(OpenAPI 자동 생성) + SQLAlchemy |
| DB | PostgreSQL 16 |
| Web | Jinja2 서버 렌더링 |
| 테스트 | pytest, coverage.py, mutmut, Playwright for Python, Locust |

장점: 입문자 진입장벽이 낮고, 데이터 랩에서 pandas를 쓸 수 있다.
단점: OpenAPI가 코드에서 생성되어 "구현이 계약을 어기는" 결함을 심기 어색하다. Newman·Pact·k6는 결국 JS라서 **언어가 둘**이 되고, 학습자 PC에 Python까지 설치하게 된다. Windows에서는 venv 활성화와 실행 정책이 추가 장벽이다(§12-3 표 항목이 늘어남).

### 추천: 안 A
(1) spec-first 계약이 계약 테스트 랩의 오라클이 된다. (2) 13개 랩 중 9개 이상이 JS 도구를 쓴다. (3) 호스트에 **Node + Docker만** 있으면 되므로 OS별 설치 안내가 최소화된다.

### 컨테이너 구성 (`docker compose up` 한 번)
| 서비스 | 기본 바인딩 | 비고 |
|---|---|---|
| `web` | `127.0.0.1:8080` | 학습자 진입점 |
| `api` | `127.0.0.1:3000` | `/openapi.yaml`, `/docs` |
| `db` | `127.0.0.1:55432` | 로컬 Postgres와 충돌을 피해 55432 |
| `seed` | (일회성) | 마이그레이션 + 시드 후 종료 |

- **모든 포트는 `127.0.0.1`에만 바인딩**한다. README 최상단에 "의도적 결함/취약점 포함 — 공개 서버 배포 금지" 경고를 둔다.
- 포트는 `.env`(`WEB_PORT`, `API_PORT`, `DB_PORT`)로 바꿀 수 있다. `npm run up`이 기동 전에 포트를 점검하고, 충돌하면 OS별 확인 명령(§12-3)을 한국어로 안내한다.
- **이미지는 amd64/arm64 멀티 아키텍처만** 쓴다. `node`, `postgres`, `nginx` 공식 이미지는 멀티 아키텍처로 알려져 있으나 단계 2에서 `docker buildx imagetools inspect`로 확인해 `docs/PLATFORM_SUPPORT.md`에 기록한다. k6/ZAP/SonarQube 이미지의 arm64 지원은 `TODO: verify`(지원하지 않으면 `platform:` 지정 + 에뮬레이션 성능 저하를 문서화).
- 초기화: `npm run reset`(= `docker compose down -v` 후 재기동). 실행 중 상태 초기화는 `POST /__admin/reset`(로컬 전용 플래그가 켜졌을 때만).
- 컨테이너 안 셸 스크립트(entrypoint 등)는 Linux 기준이며 **LF 고정**(§6-4).

---

## 2. 결함 주입 시스템

### 파일
```
defects/
  catalog.yaml          # 결함 정의 (스포일러 — README에서 링크하지 않음)
  ANSWERS.md            # 정답표 (README에서 링크하지 않음)
  profiles/
    none.yaml  beginner.yaml  intermediate.yaml  advanced.yaml
```

### 규칙
- **ID는 의미가 드러나지 않게**: `DF-001`, `DF-002` … (유형을 ID에 넣지 않는다. 소스·로그에서 ID만 보고 정답을 알 수 없게)
- `catalog.yaml` 항목: `id, type(boundary|state-transition|concurrency|data-integrity|security|performance|accessibility|validation|i18n), severity(S1~S4), surface(api|web|db|log), modules[] (QA-Lab slug), repro(재현 DSL), introduced_in(코드 위치)`
- 코드에서는 `isDefectOn('DF-007')` **한 함수**로만 분기하고, 결함 하나는 분기 지점 하나에만 둔다 → 독립적으로 켜고 끌 수 있다.
- 활성 집합 = 프로필(none|beginner|intermediate|advanced) + `DEFECTS_ON`/`DEFECTS_OFF` 덮어쓰기.
- **프로필 지정 방법 (OS 문법 차이를 학습자에게 노출하지 않음)**:
  1. 기본: `npm run up -- --profile beginner` (CLI가 `.env`에 기록하고 compose에 전달)
  2. 또는 `.env` 파일에 `DEFECT_PROFILE=beginner`
  3. 셸 환경 변수 직접 지정(`VAR=x cmd` / `$env:VAR="x"`)은 문서 부록에만 OS별로 적는다.
- 프로필은 **누적**: `beginner ⊂ intermediate ⊂ advanced`.
- **요청 단위 덮어쓰기**: `ALLOW_DEFECT_OVERRIDE=1`(로컬 compose 기본값)일 때 헤더 `X-QA-Lab-Defects: DF-003,DF-010`로 요청 하나의 활성 집합을 바꾼다. 채점기의 결함 귀속(§4)에 쓴다.
- 초기 규모(안): beginner 6 / intermediate +6 / advanced +8 = **약 20개**. 유형별 목록은 스포일러라서 이 문서에 적지 않는다.

### 독립성 검증 (CI)
- PR: 결함마다 "그 결함만 켜면 자신의 repro가 재현되고, `none`에서는 재현되지 않는다" 매트릭스.
- nightly: "X만 켰을 때 다른 결함 Y의 repro가 재현되지 않는다"(N×N 교차).

---

## 3. 모듈별 신규 / 보강 / 제외 — **판정 보류**

데이터가 없어 판정할 수 없다. 아래는 **요청서 slug 목록**이며 모두 `TODO: verify`.

| # | 요청서 slug | 판정 | 비고 |
|---|---|---|---|
| 1 | `test-design` | 보류 | |
| 2 | `defect-management` | 보류 | |
| 3 | `exploratory-testing` | 보류 | |
| 4 | `unit-integration-testing` | 보류 | |
| 5 | `structural-testing-practice` | 보류 | slug에 "practice"가 있어 강의 쪽 실습과 겹칠 가능성 → 우선 확인 |
| 6 | `data-checking-sql-logs-analytics` | 보류 | |
| 7a | `api-contract-testing` | 보류 | |
| 7b | `api-testing-tools` | 보류 | |
| 8a | `ui-automation` | 보류 | |
| 8b | `ui-automation-tools` | 보류 | |
| 9 | `ci-cd-continuous-testing` | 보류 | |
| 10 | `performance-testing-tools` | 보류 | |
| 11 | `security-testing-tools` | 보류 | |

판정 기준: 강의에 실행 가능한 실습이 **없으면 신규**, 개념 예시만 있고 대상 앱·채점이 없으면 **보강**(`lessons:`로 링크하고 설명은 쓰지 않음), 강의 실습만으로 충분하면 **제외**.

---

## 4. 채점 방식 — "관찰 가능한 결과"

### 핵심: 차등 오라클 + 결함 귀속
학습자는 정답 문장이 아니라 **실행 가능한 산출물**(케이스 표, 재현 절차, 테스트 코드)을 제출한다. 공통 엔진(`scripts/lib/`, Node)이 실행해 판정한다.

1. **유효성**: 제출물을 `none`에서 실행 → 통과해야 한다. 실패하면 "기대값 오류(거짓 양성)" 힌트.
2. **검출**: 랩의 `sut_profile`에서 실행 → 실패한 케이스는 무언가를 검출한 것.
3. **귀속**: 실패한 케이스를 `X-QA-Lab-Defects`로 결함 하나씩만 켜서 재실행 → **어떤 결함 ID를 잡았는지** 판정. 학습자는 ID를 몰라도 된다.
4. 점수 = 귀속된 **서로 다른 결함 ID 수**. 기준은 task별 `pass: { min_defects: N }`.

### 재현 DSL (`repro.yaml`) — 랩 1~3 공용, OS 무관
```yaml
steps:
  - http: { method: POST, path: /api/cart/items, json: { productId: 3, qty: 1 } }
    expect: { status: 200, json: { "$.total": 50000 } }
  - ui: { goto: /checkout }          # Playwright로 실행하는 최소 UI 단계
  - ui: { fill: { label: "쿠폰 코드", value: "WELCOME10" } }
  - ui: { expectText: "10% 할인" }
```
- 셸 명령 단계는 DSL에 **넣지 않는다** → 재현 절차가 OS에 따라 달라지지 않는다.
- `test-design`: 케이스 표(CSV/YAML) → `http` 단계로 변환해 실행
- `defect-management`: 리포트 템플릿의 "재현 절차" 블록 → 자동 재현기가 그대로 실행해 **재현되는지** 확인. 심각도는 카탈로그 값 ±1 등급이면 통과, 근거가 비어 있으면 실패. 우선순위는 정답이 하나가 아니므로 자가 평가 체크리스트
- `exploratory-testing`: 세션 노트의 "발견 버그" 블록 → 같은 엔진으로 매칭
- 이후 랩 예: 단위 테스트 랩은 "결함 구현에서 실패/정상 구현에서 통과", 구조 테스트 랩은 "Stryker 생존 뮤턴트 ≤ N", CI 랩은 "게이트 위반 시 워크플로 실패"

### 정답(solution)과 힌트
| 방식 | 장점 | 단점 |
|---|---|---|
| **트리 내 `solution/` (추천)** | starter 실패/solution 통과를 같은 커밋에서 CI 검증 가능, 오프라인 열람 가능 | 폴더를 열면 보인다 (의도적 행동이므로 허용) |
| `solutions` 별도 브랜치 | 우연한 스포일러 적음 | main과 동기화 비용, CI가 두 브랜치를 합쳐야 함 |

- `npm run solution -- <slug>`는 스포일러 경고 후 경로를 출력한다.
- 힌트: 랩 README의 `<details>` 접기로 "힌트 1 → 힌트 2 → 정답 위치".
- `defects/ANSWERS.md`는 어떤 README에서도 링크하지 않는다(validate가 검사).

---

## 5. 1차 범위

**랩 13개 = 모듈 slug 13개 × 랩 1개.** (7, 8번은 모듈이 둘이라 디렉터리를 각각 둔다 — slug 1:1 원칙)

| 순서 | 랩 디렉터리 | sut_profile | 과제(안) | 주요 도구 | 채점 근거 | platforms |
|---|---|---|---|---|---|---|
| 1 | `test-design` | beginner | 4 (동등분할/경계값/결정표/상태전이) | 케이스 표 | 귀속된 결함 수 | 전체 |
| 2 | `defect-management` | beginner | 3 | 리포트 템플릿 | 자동 재현 + 심각도 범위 | 전체 |
| 3 | `exploratory-testing` | intermediate | 2 (차터 2개) | 세션 노트 | 매칭된 결함 수 | 전체 |
| 4 | `unit-integration-testing` | none | 3 | Vitest, fake timer | 결함 구현 실패/정상 구현 통과 | 전체 |
| 5 | `structural-testing-practice` | none | 2 | c8, Stryker | 커버리지 기준 + 생존 뮤턴트 수 | 전체 |
| 6 | `data-checking-sql-logs-analytics` | intermediate | 3 | `psql`(컨테이너 안), 로그 | 찾은 이상 레코드 ID 집합 | 전체 (로그 명령 OS별 표기) |
| 7a | `api-contract-testing` | intermediate | 2 | OpenAPI 검증, (선택) Pact | 계약 위반 검출 | 전체 |
| 7b | `api-testing-tools` | beginner | 2 | Postman/Newman(`npx`) | 컬렉션 실행 결과 | 전체 |
| 8a | `ui-automation` | beginner | 3 | Playwright POM/로케이터/대기 | 통과 + 10회 반복 안정 | 전체 |
| 8b | `ui-automation-tools` | beginner | 2 | Playwright codegen/trace | 산출물 + 통과 | 전체 |
| 9 | `ci-cd-continuous-testing` | beginner | 2 | GitHub Actions | 게이트 위반 시 실패 | 전체 (로컬 실행기 `act`는 선택, `TODO: verify`) |
| 10 | `performance-testing-tools` | advanced | 2 | k6 | 병목 결함 ID 식별 + 임계값 | 전체 (k6 설치 OS별 + docker 대안) |
| 11 | `security-testing-tools` | advanced | 2 | ZAP baseline, (선택) SonarQube | 결과 → 티켓 변환 + 허가·범위 체크리스트 | 전체 (arm64 이미지 `TODO: verify`) |

- **랩 1~3을 먼저 `ready`로** 만들고 직접 풀어 본 피드백을 받는다(macOS 직접, Windows는 CI).
- 호스트 설치를 줄이려고, 가능한 도구는 **docker 이미지 또는 `npx`**로 실행하는 방법을 기본으로 하고, 요청서대로 OS별 설치 방법도 함께 제시한다(예: k6).
- 보안 랩 대상은 `127.0.0.1`의 로컬 SUT뿐. 시작할 때 "허가·범위 확인" 체크리스트에 답해야 check가 진행된다.

---

## 6. 크로스 플랫폼 전략 (macOS / Windows)

### 6-1. 명령 실행 계층: Node CLI (`scripts/cli.mjs`)
- 학습자가 쓰는 명령은 **모두 `npm run <cmd>`**이고, 각 npm 스크립트는 **`node scripts/cli.mjs <cmd>` 한 줄**뿐이다.
  - 이유: npm은 스크립트를 macOS에서는 `sh`, Windows에서는 기본으로 `cmd.exe`로 실행한다. 스크립트 본문에 `&&`, `rm`, `VAR=x` 같은 셸 문법이 있으면 OS마다 동작이 달라지므로, 본문을 Node 호출 하나로 고정해 차이를 원천 차단한다.
- 명령: `up [--profile <p>]`, `down`, `reset`, `lab -- <slug>`, `check -- <slug>`, `solution -- <slug>`, `logs [--follow]`, `validate`, `build-index`, `doctor`
  - `doctor`: Node/Docker/compose 버전, Docker 데몬 실행 여부, 포트 충돌, 저장소 줄바꿈 상태(CRLF로 체크아웃된 `.sh` 감지)를 점검하고 한국어로 해결책을 안내한다. 학습자 문의를 줄이는 1차 방어선.
  - `logs`: Node로 로그 파일을 따라 읽는다 → `tail -f`/`Get-Content -Wait` 차이가 학습 목표가 아닌 랩에서는 이것을 쓴다.
- 구현 규칙: 경로는 `path.join/resolve`, 자식 프로세스는 `spawn(cmd, args)`(셸 문자열 금지), 파일 조작은 `fs` API(외부 `rm`/`cp` 금지), 의존성은 최소화하되 필요하면 `cross-spawn` 정도만.
- `Makefile`은 macOS/Linux 편의용 선택 래퍼(`make up` → `npm run up`). 문서는 항상 `npm run`을 기준으로 쓰고, Windows 학습자에게 make를 요구하지 않는다.

### 6-2. 셸 스크립트가 필요한 곳의 처리
| 위치 | 처리 |
|---|---|
| 컨테이너 내부(entrypoint, seed) | Linux `sh` 하나만. OS 분기 불필요. **LF 고정**, `doctor`와 validate가 CRLF를 검사 |
| 채점기(`check/`) | **`.mjs` 기본.** 1차 범위 13개 랩 모두 `.mjs`만으로 작성하는 것이 목표 (`.sh`/`.ps1` 쌍 0개) |
| 불가피한 셸 채점 | `.sh` + `.ps1` 쌍. CI에서 같은 입력에 대해 두 스크립트의 **종료 코드와 판정 JSON이 같은지** 비교 |
| 학습 목표 자체가 셸 명령인 경우 (예: 데이터 랩의 로그 검색) | 문서에 §12-2 형식으로 **두 OS 블록 모두** 작성. 채점은 명령이 아니라 **결과물**(찾은 레코드 ID 등)로 한다 |

### 6-3. PowerShell 기준과 알려진 함정
- Windows 문서 기준 셸은 **Windows PowerShell 5.1**(기본 설치)로 맞추고 PowerShell 7에서도 동작하게 쓴다. 따라서 PowerShell 블록에서는 `&&`/`||`(7 전용)를 쓰지 않고 `;`로 구분한다. CI Windows 잡도 `shell: powershell`(5.1)로 실행한다. `TODO: verify-windows`
- **`.ps1`의 한글 문제**: Windows PowerShell 5.1은 BOM 없는 UTF-8 `.ps1`을 시스템 코드페이지로 읽어 한글 문자열이 깨질 수 있다(`TODO: verify-windows`). 요구사항 §12-4의 "UTF-8 BOM 없음"과 충돌하므로 → **`.ps1`은 ASCII만 쓰고, 한국어 메시지는 Node 쪽에서 출력**하는 것을 제안한다. (대안: `.ps1`만 UTF-8 BOM 예외 허용)
- Node가 콘솔에 출력하는 한국어는 Windows Terminal/PowerShell에서 정상 표시될 것으로 예상하나 `TODO: verify-windows`.
- 실행 정책: `.ps1`을 쓰지 않는 것이 기본이라 대부분의 학습자는 실행 정책 문제를 만나지 않는다.

### 6-4. 저장소 설정
- `.gitattributes`: `* text=auto eol=lf`를 기본으로 하고 `*.ps1 text eol=crlf`, 바이너리(`*.png` 등)는 `binary`. → 학습자의 `core.autocrlf` 설정과 무관하게 `.sh`/`Dockerfile`/`*.yaml`/`entrypoint*`가 LF로 체크아웃된다.
- `.editorconfig`: UTF-8, LF(`.ps1`만 CRLF), 끝 줄바꿈.
- 파일명: 대소문자만 다른 이름 금지, 저장소 루트 기준 경로 **120자 이하**(Windows 260자 제한에 사용자 홈 경로 여유를 둠) — validate가 검사.
- 한글 **파일명**은 쓰지 않는다(macOS NFD/Windows NFC 정규화 차이로 git에서 문제가 생길 수 있음). 한글은 파일 **내용**(테스트 데이터, 문서)에만 쓴다.

### 6-5. Windows 검증 방법
개발자는 macOS만 쓸 수 있으므로 Windows는 다음 세 겹으로 검증한다.
1. **CI Windows 러너 (자동)**: `npm ci`, `npm run validate`, `npm run doctor`(Docker 미가용을 올바르게 안내하는지), 스크립트·채점기 단위 테스트, 경로/줄바꿈 처리 테스트, `.sh`↔`.ps1` 판정 일치(쌍이 있을 때).
2. **채점기를 Docker 없이 테스트 가능하게 설계**: 채점 엔진은 SUT 응답을 받는 부분을 주입 가능하게 만들어, Windows/macOS 러너에서는 녹화된 응답(fixture)으로 starter 실패/solution 통과를 검증한다. 실제 SUT를 띄우는 통합 검증은 Ubuntu에서만 한다.
3. **수동 체크리스트**: GitHub-hosted Windows 러너는 Linux 컨테이너를 실행할 수 없고, macOS(arm64) 러너에는 Docker가 없는 것으로 알고 있다(`TODO: verify` — 공식 문서 확인 필요). 그래서 "Windows + Docker Desktop(WSL2)에서 `npm run up` → 랩 1 완료"는 CI로 검증할 수 없다. 이 항목을 `docs/PLATFORM_SUPPORT.md`의 **Windows 수동 확인 체크리스트**로 모으고, 확인 전에는 문서에 `<!-- TODO: verify-windows -->`를 남긴다. (장기 대안: Windows 자원봉사 테스터, 또는 self-hosted 러너)
- WSL2 백엔드 전제와 "저장소를 Windows 파일시스템에 둘지 WSL 안에 둘지"에 따른 bind mount 성능 차이는 공식 문서를 확인해 `PLATFORM_SUPPORT.md`에 적는다(`TODO: verify`).

### 6-6. 문서 규칙 요약
- 터미널 명칭: macOS "터미널(zsh)", Windows "PowerShell". `cmd`는 쓰지 않는다.
- OS별로 다른 명령은 §12-2 형식(두 블록)으로, 같으면 "공통" 블록 하나.
- validate 검사: OS 블록 쌍 누락, `package.json` 스크립트의 셸 의존 명령(`&&`, `rm`, `cp`, `export`, `VAR=` 등) 정적 검사, `.sh`↔`.ps1` 쌍, 줄바꿈 정책, 경로 길이·대소문자 충돌.
- `templates/LAB_README.md`에 "OS별 명령 표" 자리를 포함한다.

---

## 7. 저장소 구조와 공통 스크립트

요청서 §9 구조를 따른다. 추가·구체화한 부분만 적는다.
```
scripts/
  cli.mjs                    # 모든 npm run 명령의 단일 진입점
  commands/ up, down, reset, lab, check, solution, logs, doctor, validate, build-index
  lib/ repro-runner, attribution, schema, report, platform  (+ *.test.mjs, Vitest)
data/qa-lab-modules.snapshot.json   # "스냅샷, 원본 아님" 명시. 원본 확보 후 생성
docs/PLATFORM_SUPPORT.md            # 러너 제약, 이미지 아키텍처, Windows 수동 체크리스트
```

### `lab.yaml` (요청서 스키마 + 변경점)
```yaml
module: test-design            # TODO: verify (스냅샷 확보 후 validate가 존재 검증)
lessons: []
title_ko: ...
level: beginner
est_minutes: 60
requires: [docker, node24]     # 요청서 예시 node20 → node24 (§1, 승인 필요)
platforms: [macos, windows, linux]
notes: ""                      # 일부 OS만 지원하면 사유
sut_profile: beginner
tasks:
  - id: t1
    goal: 경계값 분석으로 배송비 계산 케이스를 설계한다
    check: check/t1.mjs        # 기본. 셸이 필요하면 { unix: check/t1.sh, windows: check/t1.ps1 }
    pass: { min_defects: 2 }   # 추가 필드: 관찰 가능한 통과 기준
status: draft
```
- `labs/index.json`(빌드 산출물): 모듈 slug → 랩, 레슨 slug → 랩 링크, `status`, `platforms`.

## 8. CI (`.github/workflows/`)
| 워크플로 | 트리거 | OS | 내용 |
|---|---|---|---|
| `validate` | PR | ubuntu, macos, windows | `npm ci`, `validate`, 스크립트·채점기 단위 테스트(fixture 기반 starter 실패/solution 통과 포함), 경로·줄바꿈 테스트, `.sh`↔`.ps1` 판정 일치 |
| `lab-ci` | PR(변경된 랩만), 매트릭스 | ubuntu | 새 러너에서 `up → starter check(실패해야 함) → solution check(통과해야 함)`, 결함별 단독 재현, 멀티 아키텍처 이미지 확인 |
| `nightly` | 매일 | ubuntu (+ validate는 3 OS) | 전체 랩, 결함 N×N 교차 독립성, fixture 갱신 여부 확인(실제 SUT 응답과 녹화본 비교) |

## 9. 라이선스
코드 MIT, 문서 CC BY 4.0. 경계(`labs/**/README.md`, `docs/**`, `templates/**` = 문서)는 `LICENSE`에 적는다.

---

## 10. 승인이 필요한 결정

1. **SUT 스택**: 안 A(TypeScript, 추천) / 안 B(Python)
2. **도메인 범위**: 쇼핑몰만(추천) / 쇼핑+예약
3. **정답 방식**: 트리 내 `solution/`(추천) / `solutions` 브랜치
4. **Node 버전**: 24 LTS(추천) / 22 LTS / 요청서대로 20
5. **1차 범위**: 위 13개 랩, 랩 1~3 먼저
6. **크로스 플랫폼**:
   - 6a. `npm run` → `node scripts/cli.mjs` 단일 진입점 + `doctor` 명령 (추천)
   - 6b. 1차 범위 채점기를 모두 `.mjs`로 작성(`.sh`/`.ps1` 쌍 0개 목표)
   - 6c. PowerShell 기준 버전 5.1, `.ps1`은 ASCII만 쓰기(대안: BOM 예외)
   - 6d. 한글 파일명 금지, 경로 120자 제한
   - 6e. Windows 검증 = CI(Docker 없는 부분 + fixture 기반 채점기 테스트) + 수동 체크리스트
7. **QA-Lab 데이터 확보 방법**: 도메인 허용 / 리포트 업로드 — slug 교정과 §3 판정은 이것이 해결된 뒤 확정
