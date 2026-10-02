# qa-lab-practice 구현 계획 (PLAN) — 초안 v0.1

> 상태: **승인 대기**. 이 문서가 승인되기 전에는 구현을 시작하지 않는다.
> 승인된 결정 사항은 루트 `CLAUDE.md`에 요약한다.

---

## 0. 사전 작업 결과와 제약

| 항목 | 결과 |
|---|---|
| 분석 리포트 `/Users/apple/qa-lab-practice-analysis/` | **없음**. 작업 환경이 클라우드 컨테이너(Linux)라서 로컬 Mac 경로에 접근할 수 없다. |
| `https://qa-lab.pages.dev/curriculum/` 크롤링 | **실패**. 환경의 네트워크 정책(egress proxy)이 `qa-lab.pages.dev`를 차단한다. |
| GitHub에 QA-Lab 소스 저장소가 있는지 | 이 세션에서 접근 가능한 저장소 중에는 없다(`qa-lab-practice`, `ai-qa-pipeline`만 있음). |

**그래서 이 초안에서는 다음을 확정하지 못했다.**
- 모듈 slug, 레슨 slug, 선수 관계 → 요청서에 적힌 slug를 그대로 쓰고 모두 `TODO: verify`로 표시했다.
- 강의에 이미 있는 실습 콘텐츠(`04-existing-practice-content.md`)와 겹치는지 → "신규 / 보강 / 제외" 판정을 보류했다(§3).
- `data/qa-lab-modules.snapshot.json` → 원본이 없어서 만들지 않았다. 지금 만들면 지어낸 데이터가 되기 때문이다.

**해제 방법 (택1):**
1. 클라우드 환경 설정 → Network access → Custom → Allowed domains에 `qa-lab.pages.dev` 추가 (https://code.claude.com/docs/en/cloud-environments#network-access)
2. 또는 분석 리포트 폴더(`00`~`05` md, `modules.json`)를 이 저장소의 임시 브랜치에 올리거나 대화에 붙여 넣기

둘 중 하나가 되면 §3 표와 slug를 교정한다. 그 전까지 `scripts/validate`의 slug 존재 검증은 스냅샷이 없으면 **실패**하게 둔다(요구사항대로, 통과시키지 않음).

---

## 1. 대상 앱(SUT) 기술 스택

### 공통 도메인 (두 안 모두 같음)
작은 **쇼핑몰** 하나로 범위를 좁힌다. 예약 도메인은 1차에서 제외한다.
- 회원(등급: 일반/실버/골드/VIP), 한글 이름·주소 입력
- 상품(원 단위 정수 금액, 재고), 장바구니, 주문(상태 전이: `PENDING → PAID → SHIPPED → DELIVERED`, `CANCELLED`, `REFUNDED`)
- 쿠폰(정액/정률, 최소 주문 금액, 중복 사용 불가, 유효기간)
- 배송비(예: 5만 원 이상 무료, 도서산간 추가 — 실제 기준값은 구현 시 상수로 고정)
- 배송 예정일 = **영업일** 계산(주말 + 고정 공휴일 표; 대체공휴일은 `TODO: verify` 후 표에 하드코딩)
- 결제는 가짜(fake) 게이트웨이. 외부 호출 없음

### 안 A — TypeScript 단일 언어 (**추천**)
| 층 | 선택 |
|---|---|
| 런타임 | Node.js 24 LTS (`TODO: verify` — 요청서 예시는 `node20`이지만 Node 20은 2026-04 EOL. 22 LTS도 가능) |
| API | Fastify + **spec-first OpenAPI 3.1** (`apps/shop/api/openapi.yaml`이 계약 원본, 요청/응답 검증) |
| DB | PostgreSQL 16 (이미지 태그 다이제스트까지 고정), SQL 마이그레이션 + 시드 스크립트 |
| Web | React + Vite 빌드 → nginx 정적 서빙, `/api` 리버스 프록시 |
| 도메인 로직 | `src/domain/`의 순수 함수(배송비, 쿠폰, 영업일). `Clock`/`Random`을 주입받는다 (단위 테스트 랩용) |
| 로그 | JSON 구조화 로그를 볼륨(`./var/logs`)에 기록 (데이터 점검 랩용) |

랩 도구와 잘 맞는다: Vitest + **Stryker**(뮤테이션), Playwright(TS), Newman, Pact JS, k6(JS 스크립트) 모두 JS/TS라서 학습자가 **언어 하나**만 알면 된다. 채점기와 스크립트도 Node로 통일해 Windows에서도 그대로 돈다.

### 안 B — Python
| 층 | 선택 |
|---|---|
| API | FastAPI (OpenAPI 자동 생성) + SQLAlchemy |
| DB | PostgreSQL 16 |
| Web | Jinja2 서버 렌더링 + 약간의 JS |
| 테스트 | pytest, coverage.py, mutmut, Playwright for Python, Locust |

장점: 입문자에게 문법 진입장벽이 낮고, 데이터 랩(SQL/로그 분석)에서 pandas를 쓸 수 있다.
단점: OpenAPI가 **코드에서 생성**되어 계약 원본이 구현을 따라가므로, "구현이 계약을 어기는" 결함을 심기 어색하다. UI 자동화·k6·Newman·Pact는 결국 JS라서 **언어가 둘**이 된다.

### 추천: 안 A
이유: (1) spec-first 계약이 계약 테스트 랩의 오라클이 된다. (2) 13개 랩 중 9개 이상이 JS 생태계 도구를 쓴다. (3) 채점기, SUT, 랩 코드가 한 툴체인이라 CI와 lockfile 관리가 단순하다.

### 컨테이너 구성 (`docker compose up` 한 번)
| 서비스 | 바인딩 | 비고 |
|---|---|---|
| `web` | `127.0.0.1:8080` | 학습자 진입점 |
| `api` | `127.0.0.1:3000` | `/openapi.yaml`, `/docs` |
| `db` | `127.0.0.1:55432` | 로컬 Postgres 충돌을 피해 55432 |
| `seed` | (일회성) | 마이그레이션 + 시드 후 종료 |

- **모든 포트는 `127.0.0.1`에만 바인딩**한다. README 최상단에 "의도적 결함/취약점 포함 — 공개 서버 배포 금지" 경고를 둔다.
- 초기화: `docker compose down -v`. 실행 중 상태 초기화는 `POST /__admin/reset`(로컬 전용 플래그가 켜졌을 때만).
- k6, ZAP, SonarQube는 필요한 랩에서만 고정 태그 docker 이미지로 실행한다(compose profile `tools`).

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
- **ID는 의미가 드러나지 않게** 만든다: `DF-001`, `DF-002` … (유형을 ID에 넣지 않는다. 소스나 로그에서 ID만 보고 정답을 알 수 없게 하려는 것)
- `catalog.yaml` 항목: `id, type(boundary|state-transition|concurrency|data-integrity|security|performance|accessibility|validation|i18n), severity(S1~S4), surface(api|web|db|log), modules[] (QA-Lab slug), repro(재현 DSL), introduced_in(코드 위치)`
- 코드에서는 `isDefectOn('DF-007')` **한 함수**로만 분기한다. 결함 하나는 분기 지점 하나에만 둔다 → 서로 독립적으로 켜고 끌 수 있다.
- 활성 집합 = `DEFECT_PROFILE`(none|beginner|intermediate|advanced) + `DEFECTS_ON`/`DEFECTS_OFF`(쉼표 목록 덮어쓰기).
- 프로필은 **누적**한다: `beginner ⊂ intermediate ⊂ advanced`.
- **요청 단위 덮어쓰기**: `ALLOW_DEFECT_OVERRIDE=1`(로컬 compose 기본값)일 때 헤더 `X-QA-Lab-Defects: DF-003,DF-010`로 해당 요청의 활성 집합을 바꿀 수 있다. 채점기가 결함 귀속(attribution)에 쓴다(§4).
- 초기 카탈로그 규모(안): beginner 6 / intermediate +6 / advanced +8 = **약 20개**. 유형별 목록은 스포일러라서 이 문서에는 적지 않고 `catalog.yaml`과 `ANSWERS.md`에만 둔다.

### 독립성 검증 (CI)
- 결함마다 "그 결함만 켜면 자신의 repro가 재현되고, `none`에서는 재현되지 않는다"를 매트릭스로 검증한다 (PR CI).
- "결함 X만 켰을 때 다른 결함 Y의 repro가 재현되지 않는다"(N×N 교차) 검증은 비용이 커서 nightly에서 돌린다.

---

## 3. 모듈별 신규 / 보강 / 제외 — **판정 보류**

`04-existing-practice-content.md`(또는 사이트 크롤링)가 없어서 판정할 수 없다. 아래는 **요청서의 slug 목록**일 뿐이며, 모두 `TODO: verify`다.

| # | 요청서 slug | 판정 | 비고 |
|---|---|---|---|
| 1 | `test-design` | 보류 | |
| 2 | `defect-management` | 보류 | |
| 3 | `exploratory-testing` | 보류 | |
| 4 | `unit-integration-testing` | 보류 | |
| 5 | `structural-testing-practice` | 보류 | slug 이름에 이미 "practice"가 있어 강의 쪽 실습과 겹칠 가능성이 높다 → 우선 확인 |
| 6 | `data-checking-sql-logs-analytics` | 보류 | |
| 7a | `api-contract-testing` | 보류 | |
| 7b | `api-testing-tools` | 보류 | |
| 8a | `ui-automation` | 보류 | |
| 8b | `ui-automation-tools` | 보류 | |
| 9 | `ci-cd-continuous-testing` | 보류 | |
| 10 | `performance-testing-tools` | 보류 | |
| 11 | `security-testing-tools` | 보류 | |

판정 기준(데이터를 받으면 적용): 강의에 실행 가능한 실습이 **없으면 신규**, 개념 예시만 있고 대상 앱/채점이 없으면 **보강**(그 레슨을 `lessons:`로 링크하고 중복 설명은 쓰지 않음), 강의 실습만으로 충분하면 **제외**.

---

## 4. 채점 방식 — "관찰 가능한 결과"

### 핵심 아이디어: 차등 오라클 + 결함 귀속
학습자가 제출하는 것은 정답 문장이 아니라 **실행 가능한 산출물**(테스트 케이스 표, 재현 절차, 테스트 코드)이다. 공통 채점 엔진(`scripts/lib/`)이 이를 실행해 판정한다.

1. **유효성**: 제출한 케이스/절차를 `none` 프로필에서 실행한다 → 통과해야 한다. 실패하면 "기대값이 틀렸음(거짓 양성)"으로 보고 힌트를 출력한다.
2. **검출**: 같은 케이스를 랩의 `sut_profile`에서 실행한다 → 실패한 케이스는 "무언가를 검출함"이다.
3. **귀속**: 실패한 케이스를 `X-QA-Lab-Defects` 헤더로 결함 하나씩만 켜서 다시 실행해 **어떤 결함 ID를 잡았는지** 알아낸다. 학습자는 ID를 몰라도 된다.
4. 점수 = 귀속된 **서로 다른 결함 ID 수**. 통과 기준은 `lab.yaml`의 task별 `pass: { min_defects: N }` 형태로 둔다.

### 재현 DSL (`repro.yaml`) — 랩 1~3 공용
```yaml
steps:
  - http: { method: POST, path: /api/cart/items, json: { productId: 3, qty: 1 } }
    expect: { status: 200, json: { "$.total": 50000 } }
  - ui: { goto: /checkout }          # Playwright로 실행하는 최소 UI 단계
  - ui: { fill: { label: "쿠폰 코드", value: "WELCOME10" } }
  - ui: { expectText: "10% 할인" }
```
- `test-design`: 케이스 표(CSV/YAML) → 내부적으로 `http` 단계로 바꿔 실행
- `defect-management`: 결함 리포트 템플릿의 "재현 절차" 블록이 이 DSL → 자동 재현기가 리포트대로 실행해 **재현되는지** 확인. 심각도는 카탈로그 값 ±1 등급 안이면 통과로 보고, 근거 문장이 비어 있으면 실패. 우선순위는 자동 채점하지 않고 체크리스트(자가 평가)로 둔다 — 정답이 하나가 아니기 때문
- `exploratory-testing`: 세션 노트 템플릿의 "발견 버그" 블록 → 같은 엔진으로 매칭
- 이후 랩: 랩 성격에 맞는 관찰 결과로 채점한다 (예: 단위 테스트 랩은 "결함 주입한 구현에서 실패하고 정상 구현에서 통과", 구조 테스트 랩은 "Stryker 생존 뮤턴트 수 ≤ N", CI 랩은 "워크플로가 품질 게이트 위반 시 실패")

### 정답(solution)과 힌트
| 방식 | 장점 | 단점 |
|---|---|---|
| **트리 내 `solution/` (추천)** | CI에서 starter 실패/solution 통과를 같은 커밋에서 검증하기 쉽다. 오프라인에서도 볼 수 있다 | 학습자가 폴더를 열면 바로 보인다 (의도적 행동이라 허용) |
| `solutions` 별도 브랜치 | 우연한 스포일러가 적다 | main과 동기화 비용이 크고, CI가 두 브랜치를 합쳐야 한다 |

- 추천: 트리 내 `solution/` + `npm run solution <slug>`가 경고 후 경로를 출력한다.
- 힌트: 랩 README에 `<details>` 접기로 "힌트 1 → 힌트 2 → 정답 위치" 순서로 둔다.
- `defects/ANSWERS.md`는 어떤 README에서도 링크하지 않는다(validate가 링크를 검사).

### 채점기 실행 형식 — 요청서와 다른 점
- 요청서 예시는 `check/t1.sh`인데, **Windows에서 bash가 기본으로 없다.** 그래서 채점기는 `check/t1.mjs`(Node)로 쓰고 `npm run check <slug>`로 실행하는 것을 제안한다. 결과는 한국어로 통과/실패와 다음 힌트를 출력하고 종료 코드(0/1)를 돌려준다.
- `make`도 Windows 기본이 아니라서 **`npm run`을 1차 인터페이스**로 두고, `Makefile`은 같은 명령을 감싸는 얇은 래퍼로 둔다.
  - `up`, `down`, `reset`, `lab <slug>`, `check <slug>`, `solution <slug>`

---

## 5. 1차 범위

**랩 13개 = 모듈 slug 13개 × 랩 1개.** (7, 8번은 모듈이 둘이라 각각 별도 디렉터리 — slug 1:1 원칙)

| 순서 | 랩 디렉터리 | sut_profile | 과제 수(안) | 주요 도구 | 채점 근거 |
|---|---|---|---|---|---|
| 1 | `test-design` | beginner | 4 (동등분할/경계값/결정표/상태전이) | 케이스 표 | 귀속된 결함 수 |
| 2 | `defect-management` | beginner | 3 | 리포트 템플릿 | 자동 재현 성공 + 심각도 범위 |
| 3 | `exploratory-testing` | intermediate | 2 (차터 2개) | 세션 노트 | 매칭된 결함 수 |
| 4 | `unit-integration-testing` | none | 3 | Vitest, fake timer | 결함 구현에서 실패/정상 구현에서 통과 |
| 5 | `structural-testing-practice` | none | 2 | c8, Stryker | 커버리지 기준 + 생존 뮤턴트 수 |
| 6 | `data-checking-sql-logs-analytics` | intermediate | 3 | psql, 로그 | 찾아낸 이상 레코드 ID 집합 |
| 7a | `api-contract-testing` | intermediate | 2 | OpenAPI 검증, (선택) Pact | 계약 위반 검출 |
| 7b | `api-testing-tools` | beginner | 2 | Postman/Newman | 컬렉션 실행 결과 |
| 8a | `ui-automation` | beginner | 3 | Playwright POM/로케이터/대기 | 테스트 통과 + 플래키 재실행 10회 안정 |
| 8b | `ui-automation-tools` | beginner | 2 | Playwright codegen/trace | 산출물 존재 + 통과 |
| 9 | `ci-cd-continuous-testing` | beginner | 2 | GitHub Actions(act로 로컬 검증 `TODO: verify`) | 게이트가 위반 시 실패 |
| 10 | `performance-testing-tools` | advanced | 2 | k6 | 병목 결함 ID 식별 + 임계값 스크립트 |
| 11 | `security-testing-tools` | advanced | 2 | ZAP baseline, (선택) SonarQube | 결과를 티켓으로 변환 + 허가·범위 체크리스트 |

- **랩 1~3을 먼저 `ready`로** 만들고 직접 풀어 본 피드백을 받는다. 이 3개가 이후 랩의 기준 샘플이다.
- SonarQube는 메모리를 2GB 이상 쓰므로 선택 과제로 둔다.
- 보안 랩: 대상은 `127.0.0.1`의 로컬 SUT뿐. 시작할 때 "허가·범위 확인" 체크리스트에 서명해야 check가 진행된다.

---

## 6. 저장소 구조와 공통 스크립트

요청서 §9 구조를 따른다. 추가 사항만 적는다.
```
scripts/
  build-index.mjs   validate.mjs   lab.mjs (lab/check/solution 진입점)
  lib/ repro-runner, attribution, schema, report  (+ *.test.mjs, Vitest)
data/qa-lab-modules.snapshot.json   # "스냅샷, 원본 아님" 명시. 원본 확보 후 생성
```
- `lab.yaml`은 요청서 스키마를 따르되 다음을 바꾸거나 추가한다: `requires`의 `node20` → `node24`(§1), task에 `pass:` 기준 필드, `check:`는 `.mjs`.
- `labs/index.json`은 빌드 산출물이며 CI에서 생성·배포한다.

## 7. CI (`.github/workflows/`)
| 워크플로 | 트리거 | 내용 |
|---|---|---|
| `validate` | PR | 스키마, slug 존재, README 필수 섹션, ANSWERS 링크 금지, 스크립트 단위 테스트 |
| `lab-ci` | PR (변경된 랩만), 매트릭스 | 새 러너에서 `up → starter check(실패해야 함) → solution check(통과해야 함)`, 결함별 단독 재현 |
| `nightly` | 매일 | 전체 랩, 결함 N×N 교차 독립성, OS 매트릭스(ubuntu/macos/windows 중 docker 가능한 조합 `TODO: verify`) |

## 8. 라이선스
코드 MIT, 문서 CC BY 4.0 (요청서 제안대로). 문서와 코드의 경계(`labs/**/README.md`, `docs/**` = 문서)는 `LICENSE` 파일에 적는다.

---

## 9. 승인이 필요한 결정

1. **SUT 스택**: 안 A(TypeScript, 추천) / 안 B(Python)
2. **도메인 범위**: 쇼핑몰만(추천) / 쇼핑+예약
3. **정답 방식**: 트리 내 `solution/`(추천) / `solutions` 브랜치
4. **채점기 형식**: Node `.mjs` + `npm run`(추천) / 요청서대로 `.sh` + `make`
5. **Node 버전**: 24 LTS(추천) / 22 LTS / 요청서대로 20
6. **1차 범위**: 위 13개 랩, 랩 1~3 먼저
7. **QA-Lab 데이터 확보 방법**: 도메인 허용 / 리포트 업로드 — slug 교정과 §3 판정은 이것이 해결된 뒤 확정한다
