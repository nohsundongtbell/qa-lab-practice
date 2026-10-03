# CLAUDE.md — qa-lab-practice 작업 기준

이 파일은 승인된 결정 사항의 요약이다(원본: `docs/PLAN.md` v0.3, 2026-10-02 승인 "추천안대로").
모델이 바뀌어도 이 기준으로 이어서 작업한다. 이 파일과 PLAN이 충돌하면 사용자에게 묻는다.

## 1. 저장소의 역할
- QA-Lab(https://qa-lab.pages.dev/) 강의의 **실습 저장소**다. 실행 방법·과제·대상 앱·채점만 담는다.
- **금지**: 강의 내용(개념 설명, 레슨 본문, 모듈 이름·설명) 복사. 개념은 레슨 URL 링크로 대신한다.
- **금지**: QA-Lab 저장소 직접 수정. 필요한 변경은 `docs/QA_LAB_INTEGRATION.md`에 제안서로만 쓴다.
- 불확실한 사실은 추측하지 않고 `TODO: verify`(Windows 미검증은 `TODO: verify-windows`)로 남긴다.
- 문서·에러 메시지는 한국어, 코드 식별자·명령어는 영어.

## 2. QA-Lab 참조 규칙
- 모듈 메타데이터 원본은 QA-Lab이다. 이 저장소는 `data/qa-lab-modules.snapshot.json`(스냅샷, **이름 필드 제외**)으로 slug만 검증한다.
- 연결 키는 `(moduleSlug, lessonSlug)`다. 레슨 slug는 모듈 안에서만 유일하다. 레슨 id·slug를 규칙이나 파일명에서 유도하지 않는다.
- 역링크는 `https://qa-lab.pages.dev` + 스냅샷의 `url`이다(끝 `/` 포함). **앵커(#) 링크는 금지**한다.
- 레슨이 없는 모듈(m59·m60·m62·m63·m65·m66)과 m55에는 랩을 연결하지 않는다(validate가 실패 처리).
- "다음 랩" 링크는 스냅샷 선수 관계를 따른다.

## 3. SUT (`apps/shop/`)
- 스택: **TypeScript / Node.js 24 LTS**, Fastify API(spec-first `apps/shop/api/openapi.yaml`), PostgreSQL 16, React + Vite 웹(nginx).
- 도메인: 쇼핑몰 하나(원 단위 정수 금액, 회원 등급, 쿠폰, 배송비, 영업일, 주문 상태 전이, 한글 입력). 제품 사양 = `apps/shop/SPEC.md`(학습자용 오라클 문서).
- DB 테이블명은 m61 레슨 스키마(`members`, `orders`, `order_items`, `coupons`)를 따른다. 컬럼은 레슨 DDL 확인 전까지 `TODO: verify`.
- 루트에서 `docker compose up` 한 번으로 db → seed → api → web까지 뜬다. 초기화는 `docker compose down -v`.
- 이미지는 amd64/arm64 멀티 아키텍처만 쓰고, 태그를 고정한다(가능하면 다이제스트까지).
- 비결정 요소: 시간은 `Clock`, 난수는 `Random`으로 주입한다. 로컬 전용 헤더 `X-QA-Lab-Now`로 현재 시각을 덮어쓸 수 있다.
- 환경 조건(`UI_VARIANT`, `LATENCY_PROFILE`)은 결함이 아니므로 카탈로그와 따로 관리한다.

## 4. 보안 안전 장치 (필수)
- 모든 포트는 **`127.0.0.1`에만 바인딩**한다(`0.0.0.0` 금지). 포트는 `.env`로 바꿀 수 있다.
- 루트 README 최상단에 "의도적 결함·취약점 포함 — 공개 서버 배포 금지" 경고를 둔다.
- 로컬 전용 기능(`/__admin/*`, `X-QA-Lab-Defects`, `X-QA-Lab-Now`)은 환경 변수 플래그가 켜졌을 때만 동작한다. compose의 로컬 기본값은 켜짐이다.
- 보안 랩은 로컬 SUT만 대상으로 하고, 시작할 때 허가·범위 체크리스트를 거친다.

## 5. 결함 주입
- 파일: `defects/catalog.yaml`(정의, 스포일러), `defects/ANSWERS.md`(정답표), `defects/profiles/*.yaml`.
- **ID 규칙**: `DF-001`처럼 순번만 쓰고 유형을 드러내지 않는다. 한 번 쓴 ID는 재사용하지 않는다.
- 코드는 `isDefectOn('DF-xxx')` **한 함수로만** 분기한다. 결함 하나는 분기 지점 하나에 둔다(독립적으로 켜고 끔).
- 프로필은 누적이다: `none` ⊂ `beginner` ⊂ `intermediate` ⊂ `advanced`. 지정은 `.env`의 `DEFECT_PROFILE` 또는 `npm run up -- --profile <p>`. 덮어쓰기는 `DEFECTS_ON`/`DEFECTS_OFF`.
- 요청별 덮어쓰기: 헤더 `X-QA-Lab-Defects: DF-003,DF-010`(빈 값 또는 `none`이면 결함 없음). 채점기의 결함 귀속에 쓴다.
- **정답표 분리**: `defects/ANSWERS.md`와 `defects/catalog.yaml`은 어떤 README에서도 링크하지 않는다.
- 결함마다 catalog의 `repro`(재현 DSL)로 "그 결함만 켜면 재현되고, 나머지를 모두 켜도 그 결함이 꺼져 있으면 재현되지 않는다"를 테스트로 보장한다.
- `advanced` 프로필 = 계약 위반 DF-013~017(openapi.yaml 과 다른 응답) + 성능 병목 DF-018~019(SPEC §9, repro 는 `expect.max_ms`). 새 결함은 **기존 repro 가 쓰는 필드·경로를 건드리지 않고**, 기존 랩 채점(intermediate 이하 목록)에 영향이 없도록 상위 프로필에만 넣는다. 성능 결함은 `pg_sleep` 으로 DB 연결을 붙잡아 동시 부하에서 대기열이 생기게 한다.

## 6. 랩 구조
- 경로: **`labs/<module-slug>/<lab-slug>/`**(2단). 1차는 모듈당 랩 1개, 랩 13개.
- 구성: `README.md`(`templates/LAB_README.md`를 따름), `starter/`, `solution/`(저장소 안), `check/`, `lab.yaml`.
- `lab.yaml` 스키마:
```yaml
module: test-design                 # 스냅샷에 존재해야 함
lessons: [boundary-value-analysis]  # 그 모듈의 레슨 slug
also_for: []                        # 선택: [{ module, lessons }]
title_ko: ...                       # 모듈 설명 복사 금지
level: beginner|intermediate|advanced   # 인덱스에서 입문|중급|고급으로 변환
est_minutes: 90
requires: [docker, node24]
platforms: [macos, windows, linux]  # 일부만 지원하면 notes에 사유
notes: ""
tools: [playwright]
sut_profile: none|beginner|intermediate|advanced
tasks:
  - id: t1
    goal: 행동 동사로 시작
    check: check/t1.mjs             # 또는 { unix: check/t1.sh, windows: check/t1.ps1 }
    pass: { min_defects: 2 }        # 관찰 가능한 통과 기준
status: planned|beta|ready
```
- `labs/index.json`(빌드 산출물)은 QA-Lab 연동안 S1(`content/labs.json`)과 같은 모양이다: `schemaVersion, repoUrl, ref, labs[{id, moduleSlug, lessonSlugs, title, path, status, estimatedMinutes, level, tools, platforms}]`. `also_for`는 모듈별 항목으로 펼친다.
- **채점 원칙**: "정답과 같은가"가 아니라 **관찰 가능한 결과**로 판정한다. 기본은 차등 오라클이다.
  1. 제출물이 `none`에서 통과해야 유효하다.
  2. 랩 프로필에서 실패하면 검출로 본다.
  3. 결함을 하나씩 켜서 어떤 결함을 잡았는지 귀속한다.
- 힌트는 README `<details>`로 힌트 1 → 힌트 2 → 정답 위치 순서로 연다.
- **README 링크 글자에는 QA-Lab 모듈·레슨 이름을 쓰지 않고 slug 를 쓴다** (예: ``[`test-design / boundary-value-analysis`](…/)``). 이름 복사 금지 원칙.
- `pass` 기준 키: `min_defects`(서로 다른 결함 수), `max_cases`(케이스 상한, 무작위 대입 방지), `beyond_profile`(그 프로필에 없는 결함만 셈). 채점기는 `lab.yaml` 에서 읽는다.
- 무효 케이스(결함 없는 버전에서도 기대와 다름)는 **실제 값을 숨기고** 사양서 절을 힌트로 준다. 지표 오답도 정답 값을 출력하지 않는다. 결함 ID 는 보여 줘도 되지만 카탈로그 내용은 출력하지 않는다.
- **뮤턴트 기반 채점**(단위·구조 테스트 랩): `scripts/lib/vitest-runner.mjs` 로 학습자 테스트를 `<랩>/.runs/`(git 무시)에서 정상 구현(`check/ref/src`)과 뮤턴트에 대해 실행한다. 뮤턴트는 `check/mutants.mjs` 에 `{ id, file, where, from, to }` 로 정의하고, 학습자에게는 id·파일·함수만 보여 준다(무엇을 바꿨는지는 답). 뮤턴트 처치 수는 `pass.min_killed`, 커버리지는 `min_line_pct`·`min_branch_pct`. **Stryker 는 Vitest 5.0.3 과 호환되지 않아 쓰지 않는다**(`docs/PLATFORM_SUPPORT.md`).
- **DB·로그 랩**(`data-checking-sql-logs-analytics/sql-and-logs`): 앱의 Postgres 에 **별도 스키마 `qa_lab_data`** 를 만들어 이상치를 심은 결정적 데이터(`setup/dataset.mjs`)를 넣는다(`setup/seed.mjs`, 멱등). 학습자·채점기는 읽기 전용 계정 `qa_reader`(SELECT 권한만, 앱의 public 스키마는 접근 불가)로 접속한다. 진짜 방어선은 **권한**이다(세션의 read-only 설정은 SET 으로 끌 수 있다). 채점기는 SQL 한 문장(SELECT/WITH)만 읽기 전용 트랜잭션 안에서 실행한다. 정답은 심은 값이 아니라 데이터에서 **독립적으로 다시 계산한 값**과 대조하는 테스트로 검증한다(로그도 `check/log-analysis.mjs` 가 텍스트를 파싱해 정답을 계산, 파이썬으로 교차 검증).
- **API 계약 랩**(`api-contract-testing/shop-api-contract`): 학습자 Postman 컬렉션을 **Newman 라이브러리**(`check/newman-lab.mjs`)로 실행하고, 채점기가 모든 요청에 `X-QA-Lab-Defects` 를 주입해(학습자 값은 덮어씀) none 에서 통과 → 결함 하나씩 켜 귀속한다. 코드 기반 t2 는 Vitest + Ajv(`starter/support/contract.mjs`, 채점기는 항상 starter 의 원본 사용). 귀속 대상은 카탈로그 `modules` 에 이 랩의 모듈이 있는 결함만. 실패 메시지에는 앱의 실제 값이 있으므로 **검증 이름만** 출력한다. 커버리지 기준은 `pass.min_operations`·`min_statuses`(OpenAPI 오퍼레이션과 문서화된 상태 코드 쌍).
- **API 도구 랩**(`api-testing-tools/swagger-and-traffic`, `sut_profile: none`): 답안 파일 방식(`check/answer-sheet.mjs`: text/number/set, 맞음·다름만 출력, 정답 비공개)으로 t1(Swagger UI 시나리오, 정답은 none 앱에 같은 절차를 직접 실행해 계산)·t4(합성 `.pcap`, 정답은 `check/pcap-analysis.mjs` 가 원본에서 계산, 골든값은 tshark 로 교차 확인). t2 는 OpenAPI→컬렉션(openapi-to-postmanv2)→Newman. t3 는 학습자 `addon.py` 를 **mitmproxy 컨테이너**(고정 태그+다이제스트, `--entrypoint mitmdump --user 1000:1000 --cap-drop ALL`, 호스트 포트 127.0.0.1)로 띄워 동작 4가지를 프록시·직접 호출 비교로 확인(`check/mitm-lab.mjs`; 클라이언트는 항상 `X-QA-Lab-Defects: none` 을 보내 프로필과 무관하게 한다). 합성 캡처는 `check/pcap-gen.mjs` 로 만들고 starter 사본이 생성기 출력과 같음을 테스트로 고정한다. 새 기준 키: `min_correct`, `min_assertions`.
- **UI 랩**(`ui-automation/shop-ui-flows` Playwright, `ui-automation-tools/selenium-shop-flow` Selenium, `sut_profile: none`): 학습자 테스트를 실제 브라우저에서 실행해 **조건**(화면 변형·지연·반복)으로 판정한다. 환경 조건은 결함이 아니다: `UI_VARIANT`(v1|v2, DOM 구조만 다름·글자/이름/역할/`data-testid` 같음)·`LATENCY_PROFILE`(none|slow|unstable)은 환경 변수 기본값 + 개발용 헤더(`X-QA-Lab-UI-Variant`, `X-QA-Lab-Latency`)로 요청별 덮어쓰기(웹은 시작 때 `/__qa/environment` 를 읽고 nginx 가 이 경로만 API 로 전달, `?ui=v2` 지원). fixture API `POST /__admin/fixtures/orders` 는 `ALLOW_DEV_TOOLS=1` 일 때만. 채점기는 설정 파일을 직접 만들어(`scripts/lib/playwright-runner.mjs`) 학습자 설정과 무관하게 실행하고(요청 헤더 `X-QA-Lab-Defects: none` 도 고정해 앱의 프로필과 무관하게 채점), `support/` 는 starter 원본을 쓰며, 실패 출력은 오류 **종류**만(실제 값 숨김). 정적 규칙(고정 대기 금지·페이지 객체·fixture 사용·expect 개수)은 `scripts/lib/ui-static-rules.mjs`. 새 기준 키: `min_tests`, `variants`, `latency`, `repeat`. 웹 주소는 `QA_LAB_WEB_URL`(WEB_PORT).
- **보안 랩**(`security-testing-tools/scanner-triage`, Docker 불필요): 안전 장치는 `docs/SECURITY_LAB_SAFETY.md`(S1~S8). 실행 중인 앱에 취약점을 넣지 않고, 분석 대상은 **실행되지 않는 샘플 코드**(`starter/scan-target/`, package.json 없음). 공격 트래픽 없음. 가짜 비밀 값은 실제 서비스 형식과 겹치지 않게(`qa-lab-fake-…`, 저장소 전체 검사 테스트). t1 허가·범위 체크리스트(`check/scope.mjs`, 루프백 주소·실습 경로만)가 통과해야 t2 를 채점. t2 리포트 100건은 `check/report-gen.mjs` 가 위치 표식으로 결정적 생성(정답 포함, 채점기 전용), 결과는 **집계만** 출력. 기준 키 `max_missed_tp`. SonarQube 는 선택·채점 안 함(개발 환경에서 ES 디스크 한도로 미검증, `TODO: verify`).
- **부하 랩**(`performance-testing-tools/locust-bottlenecks`): Locust 를 **고정 태그+다이제스트 컨테이너**(`scripts/lib/locust-runner.mjs`: `--cap-drop ALL`, 학습자 locustfile 읽기 전용 마운트, compose 네트워크의 `api` 서비스에만 닿고 호스트 포트 없음)로 실행. t1 은 학습자 시나리오가 세 엔드포인트를 실행·로그인 사용자당 1회·실패율 1% 미만인지, t2 는 채점기가 **기준 시나리오**(`check/ref/locustfile.py`)로 결함 없음 1회 + 결함 하나씩 직접 측정해 정답(엔드포인트별 ok/slow, 병목 결함 ID)을 만들어 답안과 비교(`check/perf-truth.mjs`). 결함 없는 상태에서 목표를 못 지키면 측정 환경 문제로 채점하지 않는다. 결함 후보는 `defectsForModule`(카탈로그 `modules`). 기준 키 `users`·`duration_s`·`min_requests`.
- **CI/CD 랩**(`ci-cd-continuous-testing/quality-gates`, Docker 불필요): t1 은 워크플로 YAML 을 `check/workflow-rules.mjs` 규칙 R1~R10 으로 **정적 검사**(규칙 하나를 망가뜨리면 그 규칙만 실패하는 테스트), t2 는 학습자 `gate.mjs` 를 시나리오 26개(경계값 포함)로 실행해 종료 코드(0 통과·1 차단)를 비교. 시나리오의 기대 판정은 손으로 정하고 기준 구현 `gate-ref.mjs` 와 서로 검증, 모범 답안을 한 줄씩 망가뜨린 게이트(뮤턴트)가 잡히는지도 테스트. 실제 GitHub 실행은 선택·미검증(`TODO: verify`).
- 공통 부품 추가: `scripts/lib/newman-runner.mjs`(컬렉션 읽기·결함 헤더 주입·실행), `openapi-ops.mjs`(오퍼레이션·커버리지·`secured`), `sut.mjs` 의 `resetSut`.
- `lab.yaml` 의 `setup`(랩 폴더 기준 .mjs, **멱등**)은 `npm run lab` 과 `npm run check` 가 실행하고 `QA_LAB_DB_URL`·`QA_LAB_BASE_URL` 을 받는다. `sut_profile: any` 는 앱의 결함 프로필과 무관한 랩(프로필 불일치 경고 없음).
- 새 랩은 `docs/CONTRIBUTING_LABS.md` 와 기준 샘플 랩 3개(`test-design/shop-rules`, `defect-management/defect-reports`, `exploratory-testing/charter-sessions`)를 따른다.
- 정답(`solution/`)으로는 check가 통과하고 `starter/`로는 실패해야 한다(CI 검증).
- 1차 랩별 도구: test-design(케이스 표), defect-management, exploratory-testing, unit-integration(Vitest), structural(Istanbul/Stryker), data(psql·로그), api-contract(**Newman**·OpenAPI·Pact), api-testing-tools(Swagger UI·mitmproxy·pcap), ui-automation(Playwright), ui-automation-tools(**Selenium**), ci-cd(GitHub Actions), performance(**Locust**, docker), security(**SonarQube + 스캐너 리포트 분류**).

## 7. 크로스 플랫폼 규칙 (macOS / Windows)
- 학습자 명령은 모두 `npm run <cmd>`이고, 각 npm 스크립트 본문은 `node scripts/cli.mjs <cmd>` **한 줄**이다(`&&`, `rm`, `cp`, `VAR=x` 금지). 명령: `up [--profile p]`, `down`, `reset`, `lab`, `check`, `solution`, `logs`, `doctor`, `validate`, `build-index`. `Makefile`은 macOS/Linux 선택 래퍼다.
- 채점기는 `.mjs`가 기본이다. 셸이 불가피하면 `.sh` + `.ps1` 쌍을 두고, CI에서 두 판정이 같은지 검증한다(1차 목표는 쌍 0개).
- 문서에서 OS별로 다른 명령은 "macOS / Linux (터미널)"과 "Windows (PowerShell)" 두 블록을 모두 쓴다. 같으면 "공통" 블록 하나. `cmd`는 쓰지 않는다.
- PowerShell 기준은 5.1이다(블록에서 `&&`/`||` 금지, `;` 사용). `.ps1`은 ASCII만 쓰고, 한국어 메시지는 Node에서 출력한다.
- Node 코드: 경로는 `path.join/resolve`, 자식 프로세스는 `spawn(cmd, args)`(셸 문자열 금지), 파일 조작은 `fs` API.
- `.gitattributes`: 기본 `eol=lf`, `*.ps1`만 `crlf`. UTF-8(BOM 없음). 한글 **파일명** 금지, 대소문자만 다른 파일명 금지, 경로는 저장소 루트 기준 120자 이하.
- Windows 검증: CI Windows 러너(Docker 없는 부분 + fixture 기반 채점기 테스트) + `docs/PLATFORM_SUPPORT.md` 수동 체크리스트.

## 8. 품질 기준
- 의존성 버전 고정(lockfile, 이미지 태그). 라이선스: 코드 MIT, 문서 CC BY 4.0.
- 스크립트·채점기·SUT 도메인 로직에는 단위 테스트를 둔다(테스트 교육 저장소의 모범).
- CI: `validate`(3 OS + api 잡), `lab-ci`(바뀐 랩만, up → starter 실패 → solution 통과, `QA_LAB_E2E_ONLY`), `nightly`(전체), `publish-index`, `codeql`(`scan-target/` 제외). 우리 워크플로도 랩 9 의 규칙을 지킨다(`scripts/ci/workflows.test.mjs`). 상세는 `docs/CI.md`.

## 9. 진행 단계와 권장 모델
1. 사전 작업·PLAN [Opus] — 완료
2. SUT 골격 + 결함 주입 + compose 동작 확인 [Opus] — 완료
3. Node CLI·랩 템플릿·`lab.yaml` 스키마·validate/build-index·`.gitattributes` [Sonnet] — 완료
4. 랩 1~3 `ready` [Opus] — 완료, `docs/CONTRIBUTING_LABS.md` 작성 완료 → **사용자 직접 풀이·피드백 대기** (피드백 반영 후 단계 5)
5. 랩 4~11 [Sonnet] (결함 카탈로그 검수, 보안 랩 안전 장치, 원인 불명 실패는 Opus) — 랩 4·5·6·7a·7b·8a·8b·9·10·11 완료(보안 랩 안전 검수 완료: `docs/SECURITY_LAB_SAFETY.md`), advanced 카탈로그(DF-013~019) 검수 완료, **단계 5 완료**
6. CI·인덱스 배포 [Sonnet] — 완료(`.github/workflows/`, `docs/CI.md`; 실제 GitHub 러너 실행은 미검증 `TODO: verify`)
7. QA-Lab 연동 제안서 [Sonnet] — 완료(`docs/QA_LAB_INTEGRATION.md`, 소비자 쪽 계약 검사 참고 구현 `scripts/lib/index-contract.mjs`). **1차 계획 단계 1~7 모두 완료. 남은 것: 사용자 피드백(랩 1~3 풀이), 실제 GitHub 러너·Windows·Mac 검증**

권장 모델이 바뀌는 지점에서 멈추고 다음 문구로 알린다:
`⏸ 다음 단계는 [Opus|Sonnet] 권장입니다. /model 로 전환한 뒤 "계속"이라고 입력해 주세요. (이유: ...)`

## 10. 공통 CLI (`scripts/`, 단계 3에서 완성)
- 진입점 `scripts/cli.mjs`, 명령은 `scripts/commands/<명령>.mjs`(`run(argv)` 가 종료 코드를 돌려줌), 공통 로직은 `scripts/lib/`.
- 순수 함수 + 의존성 주입으로 짜서 테스트한다(`scripts/**/*.test.mjs`, `npm test`). 새 규칙을 추가하면 **규칙을 망가뜨렸을 때 실패하는 테스트**를 함께 둔다.
- 랩 규약과 채점 스크립트 규약은 `docs/LAB_SCHEMA.md`, 템플릿은 `templates/`(`LAB_README.md`, `lab.yaml`).
- `npm run lab` 은 `starter/` 를 `work/`(git 무시)로 복사한다. `npm run check -- <slug> [--from starter|solution]` 가 채점하며 check 스크립트에는 `QA_LAB_*` 환경 변수로 입력을 넘긴다. CI 의 starter 실패/solution 통과 검증도 `--from` 을 쓴다.
- `npm run validate` 가 검사하는 것: lab.yaml 스키마·slug 존재(스냅샷), check 파일·문법, README 필수 절·힌트 1/2·레슨 링크·앵커 금지·OS 블록 쌍, 결함 카탈로그(모듈 slug, ANSWERS·프로필 대조), 정답표 링크 금지, 파일 이름(ASCII, 120자, 대소문자 충돌), 줄바꿈(LF), package.json 셸 문법 금지, `.sh`↔`.ps1` 쌍. 스냅샷이 없으면 통과시키지 않고 실패한다.
- `QA_LAB_ROOT` 환경 변수는 임시 저장소를 대상으로 CLI 를 돌리는 테스트용 훅이다.
- `labs/index.json` 은 `npm run build-index` 로 만들고 커밋한다(`--check` 로 최신 여부를 CI 에서 확인). 시각 정보는 넣지 않는다(결정적 출력).
- 채점 공통 부품: `lab-kit.mjs`(문맥·출력·통과 판정·repro 블록), `grading.mjs`(차등 오라클 + 귀속), `csv.mjs`(UTF-8/CP949), `markdown.mjs`. 재현 DSL 의 업무 동작(`quote`, `order`, `ship` …)은 `repro-runner.mjs` 의 `ACTIONS` 와 `docs/REPRO_DSL.md` 를 함께 고친다. 단계의 알 수 없는 키는 오류다(오타 방지).
- `npm test` 는 단위 테스트(스크립트 + `labs/**/check/*.test.mjs`), `npm run test:labs` 는 실행 중인 SUT 로 모든 ready 랩을 채점한다(solution 통과, starter 는 과제별 실패).

## 11. 개발 명령 (SUT)
- API 단위 테스트: `npm --prefix apps/shop/api test`
- API 통합 테스트: `docker compose up -d --wait db` 후 `npm --prefix apps/shop/api run test:integration` (DB를 초기화함)
- 결함 추가 절차: `apps/shop/api/README.md`
- 재현 DSL 실행기: `scripts/lib/repro-runner.mjs` (카탈로그 검증과 랩 채점기가 함께 씀)
- seed는 스키마가 없을 때만 실행된다. 초기화는 `docker compose down -v` 또는 `POST /__admin/reset`.
