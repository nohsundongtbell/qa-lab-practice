# 랩 작성 가이드

새 랩은 이 가이드와 **기준 샘플 랩 3개**를 보고 같은 형식으로 만듭니다.

| 샘플 | 보여 주는 패턴 |
|---|---|
| [`labs/test-design/shop-rules`](../labs/test-design/shop-rules/) | **케이스 표(CSV)** → 행마다 재현 절차로 변환 → 차등 오라클 채점. 과제마다 열이 다르다 |
| [`labs/defect-management/defect-reports`](../labs/defect-management/defect-reports/) | **문서 산출물 + repro 블록**(결함 리포트) 채점, 판단 검사(심각도), **데이터 계산**(지표) 채점 |
| [`labs/exploratory-testing/charter-sessions`](../labs/exploratory-testing/charter-sessions/) | 여러 문서 간 연결(차터 ↔ 세션), `beyond_profile`, 관찰 증거(X-Request-Id) |

참조 문서: [`LAB_SCHEMA.md`](LAB_SCHEMA.md)(폴더·`lab.yaml`·채점 스크립트 규약), [`REPRO_DSL.md`](REPRO_DSL.md)(재현 절차), 루트 [`CLAUDE.md`](../CLAUDE.md)(전체 규칙).

---

## 1. 원칙
1. **개념을 쓰지 않는다.** 개념은 QA-Lab 레슨 링크로 대신한다. README에는 할 일, 형식, 채점 기준, 힌트만 쓴다. 채점에 꼭 필요한 **운영 정의**(예: 이 랩의 지표 계산 규칙, 팀 심각도 기준)는 쓴다.
2. **QA-Lab 이름을 복사하지 않는다.** 링크 글자는 slug로 쓴다. 예: ``[`test-design / boundary-value-analysis`](https://qa-lab.pages.dev/lesson/test-design/boundary-value-analysis/)``. 앵커(#)는 쓰지 않는다.
3. **관찰 가능한 결과로 채점한다.** "정답 파일과 같은가"가 아니다. 학습자의 산출물을 **실행해서** 결함을 잡았는지(차등 오라클 + 귀속), 계산값이 맞는지, 기준을 지켰는지를 본다.
4. **오라클이 답을 대신 알려 주지 않는다.** 무효 케이스는 실제 값을 숨긴다(`formatCaseResult`가 처리). 지표가 틀려도 정답 값을 출력하지 않는다. 결함 **ID**는 보여 줘도 되지만, 카탈로그의 **내용**(유형, 위치, 설명)은 출력하지 않는다.
5. **starter는 유효하지만 통과하지 못한다.** 예시 한 줄이나 빈 템플릿을 두어 형식을 보여 주되, 그것만으로는 어떤 과제도 통과하지 않아야 한다(E2E가 과제별로 검사한다).
6. **두 OS에서 똑같이.** 채점기는 `.mjs`, 경로는 `path.join`, 파일 이름은 ASCII. README에서 OS마다 다른 명령은 두 블록으로 쓴다.

## 2. 순서

1. **범위 정하기**
   - `data/qa-lab-modules.snapshot.json`에서 모듈과 레슨 slug를 고르고, `docs/PLAN.md` §3의 연결 레슨·제외 목록을 따른다.
   - 레슨이 없는 모듈이나 미추적 모듈은 고를 수 없다.
2. **결함 확인·추가**
   - 랩이 노리는 결함이 기존 프로필에 있는지 본다.
   - 없으면 [`apps/shop/api/README.md`](../apps/shop/api/README.md)의 "결함 추가 절차"를 따른다. 카탈로그, 한 곳에서만 분기, 프로필 하나, ANSWERS, 독립성 테스트까지다.
   - 결함 추가와 카탈로그 검수는 Opus 권장이다.
3. **뼈대 만들기**
   - `labs/<module>/<lab-name>/`에 `templates/LAB_README.md`와 `templates/lab.yaml`을 복사한다. `status: planned`로 시작한다.
4. **과제와 기준 정하기**
   - 과제는 레슨과 1:1 또는 1:N. `goal`은 행동 동사로 쓴다.
   - 기준은 `pass`(`min_defects`, `max_cases`, `beyond_profile`)로 `lab.yaml`에만 둔다. 채점기는 `loadLabContext()`로 읽는다.
5. **채점기 만들기** (`check/`)
   - `t1.mjs` … 는 얇게 두고, 랩 공통 로직은 `check/<이름>.mjs`에 둔다.
   - 공통 부품을 쓴다(§3).
6. **solution 만들기** — 모든 과제를 통과하는 모범 답안.
   - `solution/README.md`에는 해설(설계 포인트, 함정)을 쓴다.
   - 숨은 결함의 내용은 적지 않는다. 결함 지도처럼 "어떤 방향이 어떤 종류로 이어지는가" 수준까지만 쓴다.
7. **starter 만들기** — 형식만 보여 주는 시작 파일.
8. **테스트 쓰기** — 랩 고유 로직(행 변환, 문서 파싱, 계산)의 단위 테스트를 `check/*.test.mjs`에 둔다. `npm test`가 함께 돌린다.
9. **검증하기** (§5 체크리스트) → `status: ready` → `npm run build-index`.

## 3. 공통 부품 (`scripts/lib/`)

| 모듈 | 쓰임 |
|---|---|
| `lab-kit.mjs` | `loadLabContext()`: 환경 변수, `lab.yaml`, 과제, `pass`, 랩 결함 ID 목록을 읽는다<br>`formatCaseResult()`: 케이스 한 줄 출력<br>`evaluatePass()`: 통과 판정. `noun`으로 "케이스/리포트/버그"를 바꾼다<br>`reproFromBlock()`: repro 블록 파싱 |
| `grading.mjs` | `gradeCases()`: 차등 오라클 + 귀속<br>`groupByDefect()`: 중복 찾기 |
| `repro-runner.mjs` | 재현 DSL 실행. 업무 동작을 새로 추가하면 `ACTIONS`와 `docs/REPRO_DSL.md`를 함께 고친다 |
| `csv.mjs` | `readCsvTable()`: UTF-8과 CP949를 모두 읽는다(Windows Excel 저장본 대응) |
| `markdown.mjs` | `sections()`, `findSection()`, `fencedBlocks()`, `metaList()`, `hasText()` |
| `check-kit.mjs` | `finish()`: `[통과]`/`[실패]` 출력과 종료 코드 |
| `defects.mjs` | `profileDefects()`, `loadCatalog()`(채점기 내부 전용) |

채점 흐름의 기본형은 이렇다.

```js
const ctx = loadLabContext()
const cases = /* 학습자 산출물 → [{ id, label, repro, reset }] */
const graded = await gradeCases(cases, { baseUrl: ctx.baseUrl, defectIds: ctx.defectIds })
for (const r of graded.results) console.log(formatCaseResult(r))
const verdict = evaluatePass(graded, ctx.pass, { repoRoot: ctx.repoRoot })
finish({ passed: verdict.passed, message: verdict.summary, details: verdict.reasons, hints })
```

## 4. 채점기 작성 규칙
- **상태에 기대는 케이스는 `reset: true`.** 주문·쿠폰·재고처럼 DB 상태가 결과를 바꾸면, 실행마다 초기화한다. README에 "채점 중 DB 초기화"를 알린다. 순수 계산 API만 쓰는 과제는 `reset: false`(더 빠름).
- **결함 집합은 헤더로 정한다.** 채점기는 `X-QA-Lab-Defects`로 결함을 켜고 끄므로, 학습자가 띄운 프로필과 상관없이 같은 결과가 나온다.
- **형식 오류는 먼저, 친절하게.** 몇 번째 줄·어느 파일·무엇이 문제인지 한국어로 알린다. 채점을 시작하기 전에 형식부터 검사한다.
- **힌트는 해당할 때만.** 무효 케이스가 있을 때만 "기대값은 사양대로"를, 검출이 모자랄 때만 "README의 막혔을 때"를 보여 준다.
- **무작위 대입을 막는다.** 케이스 표 과제에는 `max_cases`를 둔다.
- **기준값은 원본에서 계산한다.** 데이터 과제는 랩의 `data/` 원본으로 기준값을 계산한다. 학습자 작업 폴더의 사본을 믿지 않는다.
- **시간 예산**: 랩 전체 채점이 1분 안팎이 되게 한다. 귀속 실행은 "전체 결함에서 실패한 케이스"만 하므로, 케이스 수와 결함 수를 적당히 유지한다.

## 5. `ready` 체크리스트

공통

```bash
npm run validate
npm test
npm run up -- --profile <sut_profile>
npm run check -- <module>/<lab> --from solution
npm run check -- <module>/<lab> --from starter
npm run test:labs
npm run build-index
```

- [ ] `validate` 통과 (스키마, slug, README 필수 절·힌트 1/2·레슨 링크, OS 블록 쌍)
- [ ] solution: 모든 과제 통과 / starter: **과제 하나하나** 실패 (`test:labs`)
- [ ] 흔한 실수를 직접 넣어 보고 메시지가 무엇을 고쳐야 하는지 알려 주는지 확인 (형식 오류, 사양과 다른 기대값, 재현 안 되는 절차, 중복)
- [ ] 무효 케이스·지표 오답에서 **정답 값이 출력되지 않음**
- [ ] README에 QA-Lab 이름 복사 없음(링크 글자는 slug), 개념 설명 없음, 정답표 링크 없음
- [ ] 다음 랩 링크가 스냅샷의 선수 관계를 따름 (랩이 없으면 QA-Lab 모듈 페이지)
- [ ] `labs/index.json` 갱신·커밋
