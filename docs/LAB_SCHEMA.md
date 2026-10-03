# 랩 구조와 `lab.yaml` 참조

랩을 만드는 사람을 위한 참조 문서다. 처음 만드는 랩은 [`templates/`](../templates/)를 복사해 시작한다.
만드는 순서와 패턴은 [`CONTRIBUTING_LABS.md`](CONTRIBUTING_LABS.md)를 따른다.

## 폴더

```
labs/<module-slug>/<lab-name>/
  README.md     # templates/LAB_README.md 를 따른다
  lab.yaml      # 아래 필드
  starter/      # 시작 파일. `npm run lab` 이 work/ 로 복사한다
  solution/     # 정답 (저장소 안)
  check/        # 채점 스크립트 (t1.mjs …), 랩 공통 로직, 단위 테스트(*.test.mjs)
  data/         # (선택) 채점 기준값을 계산하는 원본 데이터 — starter 에는 사본을 둔다
  work/         # 학습자의 작업 폴더 (자동 생성, git 무시)
```

- `<module-slug>`는 QA-Lab 모듈 slug와 **정확히** 같아야 한다 (`data/qa-lab-modules.snapshot.json`에 있어야 함).
- `<lab-name>`은 소문자·숫자·하이픈. 한 번 정하면 바꾸지 않는다(QA-Lab 링크에 박힌다).
- 레슨이 없는 모듈(coming-soon)과 QA-Lab에서 아직 커밋되지 않은 모듈에는 랩을 연결할 수 없다.

## `lab.yaml` 필드

| 필드 | 필수 | 설명 |
|---|---|---|
| `module` | ✅ | QA-Lab 모듈 slug |
| `lessons` | | 연결할 레슨 slug 목록. README에 각 레슨 URL을 링크해야 한다 |
| `also_for` | | `[{ module, lessons }]` — 같은 랩이 다른 모듈에도 걸릴 때. `labs/index.json`에서는 모듈별 항목으로 펼쳐진다 |
| `title_ko` | ✅ | 랩 제목 (모듈 설명 복사 금지) |
| `level` | ✅ | `beginner` \| `intermediate` \| `advanced` (인덱스에서는 입문·중급·고급) |
| `est_minutes` | ✅ | 1 이상의 정수 |
| `requires` | ✅ | 필요한 도구 (예: `docker`, `node24`) |
| `platforms` | ✅ | `macos`, `windows`, `linux`. 일부만이면 `notes`에 사유·대안 필수 |
| `notes` | | 문자열 |
| `tools` | | 사용하는 도구 이름 (인덱스에 표시) |
| `sut_profile` | ✅ | `none` \| `beginner` \| `intermediate` \| `advanced`. 앱의 결함 프로필과 무관한 랩(DB·파일만 쓰는 랩)은 `any` — 프로필 불일치 경고를 하지 않는다 |
| `setup` | | 랩 폴더 기준 Node 스크립트(`setup/seed.mjs`). `npm run lab`·`npm run check` 가 실행하며 **여러 번 실행해도 안전(멱등)** 해야 한다. 환경 변수 `QA_LAB_DB_URL`(앱의 로컬 DB)·`QA_LAB_BASE_URL` 을 받는다 |
| `tasks` | ✅ | 아래 |
| `status` | ✅ | `planned`(준비 중, 링크 없음) \| `beta` \| `ready`. `planned`가 아니면 `starter/`, `solution/`, `check/`가 있어야 한다 |

알 수 없는 필드는 오류다(오타 방지).

### `tasks[]`
| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✅ | `t1`, `t2` … 랩 안에서 유일 |
| `goal` | ✅ | 행동 동사로 시작하는 한 문장 |
| `check` | ✅ | `check/t1.mjs`(OS 공통, 기본) 또는 `{ unix: check/t1.sh, windows: check/t1.ps1 }` 쌍 |
| `pass` | | 관찰 가능한 통과 기준 (아래). 채점 스크립트가 `lab.yaml`에서 읽는다 — 기준값은 한 곳에만 둔다 |

`pass` 기준:

| 키 | 뜻 |
|---|---|
| `min_defects` | 귀속된 **서로 다른** 결함 ID 수의 최소값 |
| `max_cases` | 제출 케이스 수 상한 (무작위 대입이 아니라 기법으로 설계하도록) |
| `min_killed` | 처치한 **뮤턴트**(일부러 고장 낸 구현) 수의 최소값 — 단위·구조 테스트 랩 |
| `min_operations` | API 랩: 학습자 테스트가 실제로 호출한 OpenAPI **오퍼레이션**(메서드+경로) 수의 최소값 |
| `min_statuses` | API 랩: 호출해서 **문서화된 상태 코드**를 실제로 받아 본 (오퍼레이션, 상태 코드) 쌍의 최소값 |
| `min_correct` | 답안 파일 랩: 맞은 질문(또는 확인 항목) 수의 최소값 |
| `min_assertions` | 학습자 컬렉션이 통과시킨 검증(pm.test) 수의 최소값 |
| `min_tests` | UI 랩: 통과해야 하는 테스트 수의 최소값 (건너뛴 테스트는 세지 않음) |
| `variants` | UI 랩: 테스트를 실행할 화면 변형 목록 (`v1`, `v2`). 기본 `[v1]`. 모두 통과해야 함 |
| `latency` | UI 랩: API 응답 지연 프로필 (`none` · `slow` · `unstable`). 기본 `none` |
| `repeat` | UI 랩: 같은 테스트를 반복 실행하는 횟수(1~50). 한 번이라도 실패하면 불안정으로 봄. 기본 1 |
| `max_missed_tp` | 보안 리포트 분류: 진짜 취약점(TP)을 놓친 수의 최대값 |
| `min_line_pct`, `min_branch_pct` | 대상 파일 **각각**의 줄·분기 커버리지 최소값(%) |
| `beyond_profile` | 이 프로필에 **없는** 결함만 `min_defects`로 센다 (예: `beginner` → 더 깊은 결함을 찾았는지) |

## 채점 스크립트 규약

`npm run check -- <slug>`는 과제마다 `check` 스크립트를 실행한다.

- **종료 코드**: 0 = 통과, 그 밖 = 실패.
- **출력**: 한국어. 통과·실패와 실패했을 때의 힌트를 stdout에 쓴다. [`scripts/lib/check-kit.mjs`](../scripts/lib/check-kit.mjs)의 `finish()`를 쓰면 형식이 통일된다.
- **입력**: 환경 변수로만 받는다.

| 변수 | 값 |
|---|---|
| `QA_LAB_BASE_URL` | 대상 앱 API 주소 (예 `http://127.0.0.1:3000`) |
| `QA_LAB_WEB_URL` | 대상 앱 웹(화면) 주소 (예 `http://127.0.0.1:8080`) |
| `QA_LAB_DB_URL` | 대상 앱의 로컬 DB 주소 (`postgres://shop:shop@127.0.0.1:<DB_PORT>/shop`, 127.0.0.1 전용) |
| `QA_LAB_WORK_DIR` | 채점할 폴더. 기본은 `work/`, `--from starter\|solution`이면 그 폴더 |
| `QA_LAB_LAB_DIR` | 랩 폴더 |
| `QA_LAB_REPO_ROOT` | 저장소 루트 |
| `QA_LAB_TASK_ID` | 지금 채점하는 과제 id |
| `QA_LAB_TARGET` | `work` \| `starter` \| `solution` |

- **원칙**: 정답과 같은지가 아니라 **관찰 가능한 결과**로 판정한다. 결함 귀속은 [`scripts/lib/repro-runner.mjs`](../scripts/lib/repro-runner.mjs)와 헤더 `X-QA-Lab-Defects`를 쓴다.
- **품질 기준**: `solution/`으로는 통과하고 `starter/`로는 실패해야 한다. CI가 `npm run check -- <slug> --from solution|starter`로 검증한다.
- 셸 스크립트 쌍(`.sh` + `.ps1`)은 꼭 필요할 때만 쓴다. 두 파일은 항상 함께 있어야 하고 판정이 같아야 한다.

## 검증과 인덱스

| 명령 | 하는 일 |
|---|---|
| `npm run test:labs` | 실행 중인 앱으로 모든 ready/beta 랩 채점 (solution 통과, starter 과제별 실패) |
| `npm run validate` | `lab.yaml` 스키마, slug 존재, check 파일, README 필수 절·OS 블록 쌍·레슨 링크, 결함 카탈로그, 파일 이름·줄바꿈 규칙 |
| `npm run build-index` | `labs/index.json` 생성 (검증을 통과해야 함). `--check`는 최신인지만 확인 |
| `npm run snapshot:update -- <modules.json>` | QA-Lab 스냅샷 갱신 (slug 삭제 시 경고) |
