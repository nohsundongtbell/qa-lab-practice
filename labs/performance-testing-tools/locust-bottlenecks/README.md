# Locust로 부하 시나리오를 작성하고 병목 엔드포인트 찾기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

> 부하 테스트는 **내가 띄운 이 실습 앱에만** 하세요. 허가받지 않은 서비스에 부하를 보내면 서비스 거부로 간주될 수 있습니다. 이 랩의 Locust는 Docker 컨테이너 안에서 실습 앱(`api` 서비스)에만 닿습니다.

## 목표
- **작성한다**: Locust로 사용자 행동(로그인 → 상품 보기 → 금액 확인 → 내 주문 보기)을 흉내 내는 부하 시나리오를 만든다.
- **읽는다**: 결과에서 평균이 아니라 p95를 읽어, 사양서의 응답 시간 목표와 비교한다.
- **좁힌다**: 결함을 하나씩 켜고 끄며 비교해, 병목이 되는 엔드포인트와 그 원인 결함을 찾아낸다.

## 선수 모듈
- QA-Lab 모듈 [`nonfunctional-testing`](https://qa-lab.pages.dev/module/nonfunctional-testing/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`performance-testing-tools / locust-python-load-testing`](https://qa-lab.pages.dev/lesson/performance-testing-tools/locust-python-load-testing/) — t1, t2

## 소요 시간
약 120분

## 준비물
- Docker Desktop, Node.js 24 LTS ([준비물 설치 안내](../../../README.md)). 호스트에 Python을 설치할 필요는 없습니다(Locust는 고정 태그 Docker 이미지로 실행됩니다. 처음 실행할 때 이미지를 받습니다).
- 이 랩이 쓰는 결함 프로필: `advanced`
- 이 랩에서만 Python 문법을 씁니다(`locustfile.py`는 Python입니다). 예시가 있으니 따라 쓰면 됩니다.

공통

```bash
npm run lab -- performance-testing-tools/locust-bottlenecks
npm run up -- --profile advanced
```

작업 폴더 `labs/performance-testing-tools/locust-bottlenecks/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `locustfile.py` | t1 답안. 예시 작업 하나가 들어 있는 부하 시나리오 |
| `result.yaml` | t2 답안. 질문과 빈칸 |

## 응답 시간 목표 (사양서 §9)
[QA 숍 사양서 §9](../../../apps/shop/SPEC.md): 동시 사용자 10명이 계속 요청할 때 응답 시간 **p95**가 아래 이하여야 합니다.

| API | p95 |
|---|---|
| `GET /api/products` | 100ms |
| `POST /api/quote` | 100ms |
| `GET /api/orders` (주문 10건 이하 회원) | 200ms |

## 내 시나리오 직접 실행해 보기
저장소 루트에서 실행합니다. Locust 컨테이너는 앱의 compose 네트워크 안에서 `http://api:3000`으로 요청합니다. 끝나면 마지막에 요청별 통계와 **응답 시간 백분위 표**(`95%` 열)가 출력됩니다. 환경 변수 `QA_LAB_DEFECTS`로 결함 집합을 정해 비교할 수 있습니다(`none` = 결함 없음, `DF-018` 처럼 ID를 쉼표로).

macOS / Linux (터미널)

```bash
docker run --rm --network qa-lab-shop_default -e QA_LAB_DEFECTS=none --mount type=bind,source="$(pwd)/labs/performance-testing-tools/locust-bottlenecks/work",target=/mnt/locust,readonly locustio/locust:2.46.6 -f /mnt/locust/locustfile.py --headless -u 10 -r 10 -t 15s --host http://api:3000 --only-summary
```

Windows (PowerShell)

```powershell
docker run --rm --network qa-lab-shop_default -e QA_LAB_DEFECTS=none --mount "type=bind,source=$PWD\labs\performance-testing-tools\locust-bottlenecks\work,target=/mnt/locust,readonly" locustio/locust:2.46.6 -f /mnt/locust/locustfile.py --headless -u 10 -r 10 -t 15s --host http://api:3000 --only-summary
```
<!-- TODO: verify-windows — 바인드 마운트 경로 형식, 컴포즈 네트워크 이름(qa-lab-shop_default) -->

- `-u 10 -r 10 -t 15s`: 동시 사용자 10명, 초당 10명씩 시작, 15초 실행.
- 웹 화면으로 보고 싶다면 `--headless … --only-summary` 대신 `-p 127.0.0.1:8089:8089`를 `docker run`에 더하고 `--headless -u -r -t`를 빼면 http://127.0.0.1:8089 에서 시작·관찰할 수 있습니다(호스트 포트는 `127.0.0.1`에만 여세요).

## 과제

### t1. 부하 시나리오 작성
- 할 일: `work/locustfile.py`를 완성합니다. 사용자 한 명이 하는 일:
  - 상품 목록 보기 `GET /api/products`
  - 금액 미리보기 `POST /api/quote` (로그인 필요)
  - 내 주문 목록 `GET /api/orders` (로그인 필요)
- 규칙: 로그인은 사용자당 **한 번**(`on_start`)만 합니다. 내 주문 목록은 주문 수에 따라 느려질 수 있으니, 회원에게 주문을 몇 건 만들어 두세요(시작 파일의 안내 참고). `QA_LAB_DEFECTS`가 있으면 헤더 `X-QA-Lab-Defects`로 보냅니다.
- 채점 중 대상 앱의 DB를 **초기화**하고, 내 시나리오를 결함 없는 앱에 동시 사용자 10명으로 15초 실행합니다.
- 기준: 세 엔드포인트가 각각 **5건 이상** 요청되고, 로그인이 사용자 수의 2배를 넘지 않고, 실패율 1% 미만
- 채점: `npm run check -- performance-testing-tools/locust-bottlenecks --task t1`

### t2. 병목 찾기
- 할 일: 내 시나리오로 위 "직접 실행"을 **결함 없이**(`none`) 한 번, 결함 하나씩(`DF-018`, `DF-019` 등) 켜서 한 번씩 실행해 p95를 비교하고 `work/result.yaml`을 채웁니다.
  - `products`·`quote`·`orders`: 어느 한 결함이라도 켰을 때 목표(p95)를 넘으면 `slow`, 아니면 `ok`
  - `bottleneck_defects`: 켜면 목표를 깨뜨리는 결함 ID 목록. 결함 후보는 앱의 `GET http://127.0.0.1:3000/__admin/defects`가 알려 주는 활성 목록입니다
- 정답은 채점기가 **기준 시나리오로 직접 측정해서** 만듭니다(내 시나리오·내 컴퓨터 상태와 무관). 결함이 없는 상태에서 목표를 못 지킬 만큼 컴퓨터가 바쁘면 채점하지 않고 알려 줍니다. 맞음/다름만 알려 줍니다.
- 채점 시간: 결함 없음 1회 + 결함별 1회, 각 약 15초(합쳐 1분 안팎)
- 기준: 4문제 모두 정답
- 채점: `npm run check -- performance-testing-tools/locust-bottlenecks --task t2`

## 완료 기준
- [ ] t1: 세 엔드포인트 각 5건 이상, 로그인 사용자당 한 번, 실패율 1% 미만
- [ ] t2: `result.yaml` 4문제 모두 정답

전체 채점:

공통

```bash
npm run check -- performance-testing-tools/locust-bottlenecks
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 방향</summary>

- 로그인 응답의 토큰은 `self.client.headers["Authorization"] = f"Bearer {토큰}"`으로 한 번 넣어 두면 그 사용자의 이후 모든 요청에 붙습니다.
- 평균은 느린 소수 요청을 감춥니다. 목표는 p95입니다. 출력의 `Response time percentiles` 표에서 `95%` 열을 보세요.
- 결함이 켜진 상태와 꺼진 상태를 **같은 시나리오로** 비교하세요. 시나리오를 바꾸면서 비교하면 무엇 때문에 달라졌는지 알 수 없습니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- 주문 목록에 주문이 없으면 응답이 빨라 병목이 드러나지 않습니다. `test_start` 이벤트에서(또는 `on_start`에서 몇 건만) 주문을 만들어 두세요. fixture API는 `requests.post(f"{environment.host}/__admin/fixtures/orders", json={...})`로 호출합니다.
- `bottleneck_defects`는 "결함을 켰더니 어느 엔드포인트의 p95가 목표를 넘었는가"로 정합니다. 서로 다른 엔드포인트가 느려지는 결함이 둘 있습니다.
- 일부 요청만 느려지는 결함은 동시 사용자가 늘수록 뒤의 요청이 줄 서서 기다려 더 느려질 수 있습니다. 사용자 수를 1명과 10명으로 바꿔 비교해 보세요.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- performance-testing-tools/locust-bottlenecks --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`performance-testing-advanced`](https://qa-lab.pages.dev/module/performance-testing-advanced/) (실습 랩 준비 중)
