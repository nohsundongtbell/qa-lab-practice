# QA-Lab 연동 제안서

이 문서는 **제안서**입니다. 이 저장소(`qa-lab-practice`)는 QA-Lab 저장소를 수정하지 않습니다. QA-Lab 쪽에서 바꿔야 할 것을 한곳에 모아, QA-Lab을 관리하는 사람이 판단하고 가져갈 수 있게 합니다.

> QA-Lab 내부 구조에 대한 서술은 계획 단계의 분석 리포트에서 가져왔습니다. 확인하지 못한 것은 `TODO: verify`로 표시했습니다.

## 1. 한 줄 요약
QA-Lab이 **빌드할 때** 이 저장소의 `labs/index.json`을 받아 `content/labs.json`으로 두고(vendoring), 레슨·모듈 페이지가 `(moduleSlug, lessonSlug)`로 연결된 **실습 카드**를 보여 줍니다. 카드의 링크는 이 저장소의 랩 폴더로 갑니다. 동기화는 QA-Lab 쪽의 예약 작업이 **자동 PR**로 올립니다(사람이 검토 후 병합).

## 2. 왜 이 방식인가
- QA-Lab은 **정적 내보내기** 사이트입니다. 서버가 없으므로 연동은 빌드 시점의 JSON과 일반 링크로만 할 수 있습니다.
- 두 저장소를 한 곳에 합치거나(모노레포) 서브모듈로 묶으면, 한쪽의 도구(Docker, Node 24, Playwright 등)와 CI가 다른 쪽을 무겁게 만듭니다. JSON 한 장으로 느슨하게 잇는 편이 경계가 깨끗합니다.
- 이 저장소는 강의 내용을 복사하지 않습니다(모듈·레슨 이름도 쓰지 않습니다). 화면에 이름이 필요하면 QA-Lab이 자기 데이터에서 `slug`로 찾아 보여 주면 됩니다.

| 대안 | 평가 |
|---|---|
| **S1 + 자동 PR** (제안) | 빌드는 항상 재현 가능(커밋된 JSON). 변경은 PR로 검토. 구현이 가장 작다 |
| 런타임에 브라우저가 JSON을 직접 가져옴 | 정적 사이트에서도 가능하지만 검색 엔진·접근성·로딩 깜박임이 나빠지고, 저장소가 잠시 죽으면 화면이 깨진다 |
| 모노레포·서브모듈 | 위의 이유로 비추천 |
| 동기화 없이 레슨마다 링크를 손으로 | 랩이 늘면 낡는다. `lessonSlugs`가 바뀌어도 알 수 없다 |

## 3. 데이터 계약: `labs/index.json`
- 위치: 이 저장소의 **`labs/index.json`** (main). 루트 `labs-index.json`이 아닙니다 — 동기화 스크립트에 이 경로를 넘겨 주세요.
- 만드는 법: `npm run build-index`. 검증을 모두 통과해야 만들어지고, `--check`로 최신 여부를 확인합니다. `publish-index` 워크플로가 main에서 이를 확인하고 산출물로 보관합니다.
- **결정적 출력**: 같은 입력이면 같은 바이트입니다(시각 정보 없음). 그래서 동기화 PR의 diff가 "실제로 바뀐 것"만 보여 줍니다.

```jsonc
{
  "schemaVersion": 1,
  "repoUrl": "https://github.com/nohsundongtbell/qa-lab-practice",
  "ref": "main",
  "snapshot": { "source": "…", "generatedAt": "2026-10-02" },   // 이 저장소가 어느 시점의 QA-Lab 구조를 기준으로 검증했는지
  "labs": [
    {
      "id": "test-design/shop-rules",          // 랩 폴더 경로. 안정적인 식별자
      "moduleSlug": "test-design",
      "lessonSlugs": ["boundary-value-analysis", "…"],
      "title": "…",                            // 이 저장소가 쓴 랩 제목 (QA-Lab 이름을 복사하지 않음)
      "path": "labs/test-design/shop-rules",   // 저장소 안의 상대 경로
      "status": "ready",                       // planned | beta | ready
      "estimatedMinutes": 120,
      "level": "중급",                          // 입문 | 중급 | 고급
      "tools": ["csv"],
      "platforms": ["macos", "windows", "linux"]
    }
  ]
}
```

| 필드 | 뜻과 약속 |
|---|---|
| `schemaVersion` | 정수. **필드를 추가하는 것은 호환**(모르는 필드는 무시), 필드를 없애거나 뜻을 바꾸면 올린다 |
| `repoUrl`, `ref` | 랩 링크의 기준. 동기화할 때 `ref`를 **커밋 SHA로 고정**하기를 권장한다(§4) |
| `labs[].id` | 랩 폴더 경로 `<모듈 slug>/<랩 slug>`. 한 번 정하면 바꾸지 않는다 |
| `labs[].moduleSlug`, `lessonSlugs` | **조회 키는 `(moduleSlug, lessonSlug)`**. 레슨 slug는 모듈 안에서만 유일하다 |
| `status` | `planned`면 링크 없이 "준비 중"으로 보여 준다. `beta`는 베타 배지 |
| 한 랩이 여러 모듈에 걸칠 때 | 같은 `id`로 `moduleSlug`만 다른 항목을 **펼쳐서** 담는다(예: 랩 하나가 두 모듈의 레슨에 연결). 소비자는 `id`가 아니라 `(moduleSlug, id)`로 유일성을 본다 |
| `platforms` | 확장 필드. 모르면 무시해도 된다 |

### 3-1. 현재 내용 (ready 13개 랩)
| 랩 `id` | 모듈 slug | 레슨 수 | 수준 | 분 | 도구 |
|---|---|---|---|---|---|
| `test-design/shop-rules` | `test-design` | 3 | 중급 | 120 | csv |
| `defect-management/defect-reports` | `defect-management` | 3 | 입문 | 90 | markdown, csv |
| `exploratory-testing/charter-sessions` | `exploratory-testing` | 6 | 중급 | 120 | markdown |
| `exploratory-testing/charter-sessions` | `test-design` | 1 | 중급 | 120 | markdown |
| `unit-integration-testing/cart-domain` | `unit-integration-testing` | 4 | 중급 | 100 | vitest |
| `structural-testing-practice/coverage-and-mutation` | `structural-testing-practice` | 3 | 고급 | 100 | vitest, istanbul |
| `data-checking-sql-logs-analytics/sql-and-logs` | `data-checking-sql-logs-analytics` | 4 | 중급 | 120 | sql, psql, logs |
| `api-contract-testing/shop-api-contract` | `api-contract-testing` | 4 | 중급 | 120 | newman, openapi |
| `api-testing-tools/swagger-and-traffic` | `api-testing-tools` | 4 | 중급 | 150 | swagger-ui, openapi-to-postman, newman, mitmproxy, wireshark |
| `ui-automation/shop-ui-flows` | `ui-automation` | 6 | 입문 | 180 | playwright |
| `ui-automation-tools/selenium-shop-flow` | `ui-automation-tools` | 1 | 입문 | 90 | selenium-webdriver |
| `ci-cd-continuous-testing/quality-gates` | `ci-cd-continuous-testing` | 3 | 입문 | 120 | github-actions |
| `performance-testing-tools/locust-bottlenecks` | `performance-testing-tools` | 1 | 고급 | 120 | locust |
| `security-testing-tools/scanner-triage` | `security-testing-tools` | 2 | 고급 | 150 | sonarqube, report-triage |

(`exploratory-testing/charter-sessions`가 두 줄인 것이 위의 "펼친 항목"입니다. 이 표가 `labs/index.json`과 같은지는 `scripts/lib/index-contract.test.mjs`가 확인합니다.)

### 3-2. 참고 구현: 계약 검사
`scripts/lib/index-contract.mjs`에 **의존성 없는 순수 함수**가 있습니다. QA-Lab이 그대로 복사해 동기화 스크립트와 테스트에 쓸 수 있습니다.
- `validateIndexContract(index, snapshot)`: 스키마, 필드 타입, 허용 값(`status`·`level`·`platforms`), `path`에 앵커·`..` 없음, `(moduleSlug, id)` 유일, 모든 `moduleSlug`·`lessonSlug`가 QA-Lab 모듈 스냅샷에 있는지(그 모듈의 레슨인지까지). 모르는 필드는 거절하지 않습니다.
- `labsForLesson(index, moduleSlug, lessonSlug)`: 레슨 페이지가 쓸 조회.
- `labUrl(index, lab)`, `lessonUrls(lab, snapshot)`: 링크 만들기.

## 4. 동기화 (QA-Lab 쪽에 만들 것)
1. **동기화 스크립트** — 예: QA-Lab의 `scripts/sync-labs.mjs`.
   1. 이 저장소의 main 최신 **커밋 SHA**를 알아낸다.
   2. 그 SHA의 `labs/index.json`을 받는다 (`https://raw.githubusercontent.com/nohsundongtbell/qa-lab-practice/<SHA>/labs/index.json`).
   3. `ref`를 그 SHA로 바꿔 쓴다. (이렇게 하면 QA-Lab 빌드가 가리키는 랩 폴더가 그 시점의 것으로 **고정**되어, 나중에 main에서 랩이 이동·삭제되어도 이미 배포된 링크가 깨지지 않는다.)
   4. §3-2의 `validateIndexContract`로 검사한다. 실패하면 **쓰지 않고** 오류를 낸다.
   5. `content/labs.json`에 쓴다. 바뀐 것이 없으면 아무것도 하지 않는다.
2. **예약 작업 + 자동 PR** (후보 B) — QA-Lab의 GitHub Actions가 하루 한 번(또는 수동) 스크립트를 돌리고, 바뀌었으면 PR을 만든다. 사람이 PR의 diff(어떤 랩이 추가·변경·삭제되었는지)를 보고 병합한다. 병합되면 QA-Lab이 평소대로 빌드·배포된다.
   - 이 저장소가 QA-Lab에 이벤트를 쏘는 방식(`repository_dispatch`)도 가능하지만 **QA-Lab 저장소에 쓸 수 있는 토큰**을 이 저장소가 가져야 하므로 권하지 않는다. 예약 작업(풀 방식)은 이 저장소에 비밀 값이 필요 없다.
3. **빌드 시 검사** — QA-Lab의 기존 링크·slug 검사에 "`content/labs.json`의 모든 `(moduleSlug, lessonSlug)`가 QA-Lab의 모듈 데이터에 있다"를 더한다(§3-2의 함수). 레슨 slug가 바뀌면 빌드가 이 지점에서 바로 알려 준다.

```text
참고(예시 의사코드, QA-Lab 쪽에 둘 파일)
sha  = GET api.github.com/repos/<repo>/commits/main → sha
json = GET raw.githubusercontent.com/<repo>/<sha>/labs/index.json
json.ref = sha
problems = validateIndexContract(json, modulesSnapshot)
if problems: print + exit 1
if JSON.stringify(json, null, 2) != read(content/labs.json): write
```

## 5. QA-Lab 화면 제안
- **레슨 페이지**: `labsForLesson(index, 모듈 slug, 레슨 slug)`가 돌려준 랩마다 "실습" 카드. 제목, 수준, 예상 시간, 도구, 지원 OS와, 링크는 `labUrl()`(저장소의 랩 폴더 README가 열린다).
  - `status: planned` → 링크 없이 "준비 중". `beta` → 베타 배지. `ready` → 일반.
  - 같은 레슨에 랩이 여럿이면 목록으로, 없으면 카드 자체를 그리지 않는다.
- **모듈 페이지**: 그 모듈의 `moduleSlug`로 필터한 랩 목록(수준·시간 포함).
- **링크 문구**: 카드 제목은 `title`(이 저장소가 쓴 랩 제목)을 쓰고, QA-Lab의 모듈·레슨 이름은 QA-Lab이 자기 데이터로 표시한다. 랩 README는 레슨을 `module-slug / lesson-slug` 글자로 링크하고, QA-Lab의 레슨 주소는 **끝 `/`를 포함하고 앵커(`#`)를 쓰지 않는다**(`lessonUrls`가 만드는 형식).
- **접근성·국제화**: `title`은 한국어 문장입니다. `platforms`는 아이콘이면 대체 텍스트를 함께 두세요.

## 6. 선행 조건
1. **QA-Lab의 slug 보호 스냅샷을 갱신**해야 합니다. 계획 단계의 분석에서 그 스냅샷이 낡아 있었습니다(그때 기준으로 미등록 레슨이 많았음). QA-Lab에서 `npm run content:snapshot`을 실행한 결과를 먼저 반영해야, 우리 랩의 `lessonSlugs`가 QA-Lab의 빌드 검사에 걸리지 않습니다. 이 저장소는 그 명령을 대신 실행하지 않습니다. `TODO: verify` — 현재 상태를 QA-Lab에서 다시 확인해야 합니다.
2. **이 저장소는 public이어야** 합니다(raw 파일을 인증 없이 받으므로). 현재 public으로 확인했습니다.
3. **레슨이 없는 모듈에는 랩을 연결하지 않습니다.** 이 저장소의 `validate`가 막습니다(QA-Lab에서 `coming-soon`이거나 레슨 폴더가 추적되지 않는 모듈).
4. 이 저장소의 스냅샷(`data/qa-lab-modules.snapshot.json`, 이름 없는 slug 사본) 갱신은 QA-Lab에서 받은 `modules.json`으로 `npm run snapshot:update -- <경로>`를 실행합니다. 바뀐 slug는 diff로 보고되고, 우리 랩이 쓰는 slug가 사라지면 `validate`가 실패합니다.

## 7. 깨지는 경우와 대응
| 상황 | 누가 알게 되나 | 대응 |
|---|---|---|
| QA-Lab에서 레슨 slug를 바꾼다 | 이 저장소: `snapshot:update` 후 `validate` 실패. QA-Lab: 다음 동기화 PR의 §4-3 검사 | 이 저장소의 `lab.yaml`·README 링크를 새 slug로 고치고 `build-index` |
| 랩을 이동·삭제한다 | QA-Lab: 동기화 PR의 diff에서 항목이 사라짐 | 병합 전에 검토. 이미 배포된 링크는 `ref`가 SHA로 고정되어 있어 유지된다 |
| 인덱스 스키마를 바꾼다 | 두 곳 모두: `schemaVersion` 불일치로 §4-1 검사 실패 | 이 저장소가 `schemaVersion`을 올리고, 이 문서와 `index-contract.mjs`를 함께 갱신. QA-Lab은 새 버전을 지원한 뒤 병합 |
| 이 저장소가 일시적으로 내려감 | QA-Lab의 동기화 작업 실패 | 커밋된 `content/labs.json`으로 빌드는 계속된다. 다음 날 다시 시도 |
| 낡은 인덱스가 main에 있음 | 이 저장소의 `publish-index` 실패 | `npm run build-index` 후 커밋 |

## 8. 롤아웃 제안
1. (QA-Lab) 선행 조건 §6-1: 스냅샷 갱신.
2. (QA-Lab) `content/labs.json`을 이 저장소의 현재 인덱스로 **수동으로** 한 번 넣고, `labsForLesson`으로 레슨 한두 개에 카드를 붙여 화면을 확인한다(예: `test-design`).
3. (QA-Lab) §4의 동기화 스크립트와 예약 자동 PR을 추가한다.
4. (QA-Lab) 모든 레슨·모듈 페이지로 확대하고 빌드 시 검사(§4-3)를 켠다.
5. 이후 이 저장소는 2차 랩(결함 카탈로그 확장, 한 모듈에 랩 여러 개 등)을 같은 계약으로 추가한다. 소비자 쪽 변경은 필요 없다.

## 9. 아직 정해지지 않은 것 (`TODO: verify`)
- QA-Lab 사이트 프레임워크와 `content/` 디렉터리의 실제 구조, 레슨 페이지가 데이터를 읽는 방식.
- 동기화 PR을 만드는 데 쓸 토큰/권한(QA-Lab 저장소의 `GITHUB_TOKEN`으로 PR 생성이 가능한지는 저장소 설정에 따른다).
- 카드의 디자인(문구, 배지 색, OS 아이콘)은 QA-Lab의 디자인 시스템에 맡긴다.
- 랩 진행도(어디까지 풀었는지)를 QA-Lab에 가져오는 기능은 이 제안의 범위 밖이다. 이 저장소의 채점은 로컬에서만 동작하고 서버로 아무것도 보내지 않는다.
