# 결함 프로필과 환경 조건

## 결함 프로필
대상 앱에는 실습용 결함이 들어 있고, **프로필**로 한꺼번에 켭니다. 프로필은 누적입니다.

`none` ⊂ `beginner` ⊂ `intermediate` ⊂ `advanced`

| 프로필 | 쓰는 곳 |
|---|---|
| `none` | 결함 없음. 내 기대값이 맞는지 확인할 때, 그리고 UI·API 도구 랩 |
| `beginner` | 입문 랩 |
| `intermediate` | 중급 랩 |
| `advanced` | API 계약·부하 랩 등 |

랩이 쓰는 프로필은 `npm run lab -- <랩>` 이 알려 줍니다.

공통

```bash
npm run up -- --profile intermediate
```

- 프로필을 바꿔도 데이터는 유지됩니다. 처음으로 되돌리려면 `npm run reset`.
- **어떤 결함이 있는지는 일부러 알려 주지 않습니다.** 찾는 것이 실습입니다. 저장소의 `defects/` 폴더에는 정답이 들어 있으니 랩을 끝내기 전에는 열지 마세요.
- 결함 없는 앱(`none`)에서 내 테스트가 통과하는지 먼저 확인하는 습관을 들이세요. 거기서 실패하면 결함이 아니라 내 기대값이 틀린 것입니다.

## 환경 조건 (결함이 아님)
앱이 놓인 **상황**을 바꾸는 장치입니다. UI 랩이 주로 씁니다.

| 조건 | 값 | 뜻 | 바꾸는 법 |
|---|---|---|---|
| 화면 변형 | `v1`(기본), `v2` | 같은 화면을 다른 DOM 구조로 그린다. 보이는 글자, 접근 가능한 이름, 역할, `data-testid` 는 같다 | 주소에 `?ui=v2` (예: http://127.0.0.1:8080/?ui=v2), 또는 헤더 `X-QA-Lab-UI-Variant: v2` |
| 응답 지연 | `none`(기본), `slow`, `unstable` | API 응답이 느려지거나 들쭉날쭉해진다 | 헤더 `X-QA-Lab-Latency: unstable` |

`.env` 의 `UI_VARIANT`, `LATENCY_PROFILE` 로 기본값을 바꿀 수도 있습니다.

## 로컬 전용 기능
아래는 실습 편의를 위한 기능이라 **내 컴퓨터의 실습 앱에서만** 켜져 있습니다.
- 요청 헤더 `X-QA-Lab-Defects: DF-003,DF-010` (그 요청에만 결함 집합을 정함, `none` = 결함 없음), `X-QA-Lab-Now` (그 요청의 "현재 시각")
- `POST /__admin/reset` (DB 초기화), `POST /__admin/fixtures/orders` (테스트 데이터 만들기)
