# QA 숍 API — 개발 안내

> 학습자는 이 문서를 읽을 필요가 없습니다. SUT를 고치거나 결함을 추가하는 기여자용입니다.

## 구조
| 경로 | 내용 |
|---|---|
| `openapi.yaml` | API 계약 원본 (spec-first). 응답은 통합 테스트에서 이 명세로 검증된다 |
| `src/domain/` | 업무 규칙 (금액·쿠폰·배송·영업일·상태 전이·입력 검증). 결함 분기는 여기 대부분 있다 |
| `src/routes/` | HTTP 라우트 |
| `src/defects/registry.ts` | `isDefectOn(id)` — 결함 분기의 유일한 진입점, 프로필 해석, 요청별 덮어쓰기 |
| `src/context.ts`, `src/lib/clock.ts` | 요청 문맥(AsyncLocalStorage): 결함 집합, `X-QA-Lab-Now` 시각 |
| `db/schema.sql`, `src/db/` | 스키마, 시드, 초기화 |

## 로컬 개발

API 단위 테스트는 DB가 필요 없습니다.

공통

```bash
cd apps/shop/api
npm ci
npm test
```

통합 테스트는 PostgreSQL 16이 필요합니다. compose의 db만 띄워서 쓰는 방법:

공통

```bash
docker compose up -d --wait db
cd apps/shop/api
npm run test:integration
```

`DATABASE_URL` 기본값은 `postgres://shop:shop@127.0.0.1:55432/shop`입니다. 통합 테스트는 이 DB를 **초기화**합니다.

## 결함 추가 절차
1. `defects/catalog.yaml`에 다음 순번 ID(`DF-###`)로 항목을 추가한다. `repro`에는 SPEC대로의 기대 동작을 쓴다.
2. 코드에서 `isDefectOn('DF-###')`로 **한 곳에서만** 분기한다.
3. `defects/profiles/<프로필>.yaml` 하나에만 ID를 추가한다.
4. `defects/ANSWERS.md`에 증상과 근거를 적는다.
5. `npm run test:integration`을 실행한다. `test/integration/defects.test.ts`가 결함마다 다음 세 가지를 검증한다.
   - `none`에서 repro가 통과한다.
   - 그 결함만 켜면 실패한다(재현).
   - 그 결함만 끄고 나머지를 모두 켜면 통과한다(독립성).

## 로컬 전용 기능 (`ALLOW_DEV_TOOLS=1`일 때만)
| 기능 | 설명 |
|---|---|
| `POST /__admin/reset` | 스키마를 다시 만들고 시드를 넣는다 |
| `GET /__admin/defects` | 현재 프로필과 활성 결함 ID |
| 헤더 `X-QA-Lab-Defects: DF-001,DF-003` | 이 요청에만 적용할 결함 집합 (`none` = 결함 없음) |
| 헤더 `X-QA-Lab-Now: 2026-10-07T15:00:00+09:00` | 이 요청의 "현재 시각" |
