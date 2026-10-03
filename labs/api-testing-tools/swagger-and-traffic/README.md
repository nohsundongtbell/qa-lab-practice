# Swagger UI·mitmproxy·패킷 캡처로 API 트래픽 들여다보기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
- **호출한다**: Swagger UI에서 토큰 인증과 요청 본문 입력이 필요한 API를 직접 호출해 응답을 읽는다.
- **연결한다**: OpenAPI 명세에서 Postman 컬렉션을 만들고, 인증과 검증을 더해 Newman으로 끝까지 실행한다.
- **가로챈다**: mitmproxy 애드온으로 요청을 바꾸고, 응답을 가로채 직접 돌려주고, 상태를 가진 프록시를 만든다.
- **읽는다**: 패킷 캡처 파일에서 평문으로 노출된 정보, 서버 오류, 느린 요청, TCP 재전송을 찾는다.

## 선수 모듈
- QA-Lab 모듈 [`api-contract-testing`](https://qa-lab.pages.dev/module/api-contract-testing/) — 실습: [QA 숍 API의 계약을 컬렉션과 명세로 점검하기](../../api-contract-testing/shop-api-contract/README.md)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`api-testing-tools / swagger-ui-hands-on`](https://qa-lab.pages.dev/lesson/api-testing-tools/swagger-ui-hands-on/) — t1
- [`api-testing-tools / swagger-and-postman-workflow`](https://qa-lab.pages.dev/lesson/api-testing-tools/swagger-and-postman-workflow/) — t2
- [`api-testing-tools / charles-proxy-in-practice`](https://qa-lab.pages.dev/lesson/api-testing-tools/charles-proxy-in-practice/) — t3 (이 랩은 같은 개념을 오픈소스 mitmproxy로 연습합니다)
- [`api-testing-tools / wireshark-tcpdump-packet-analysis`](https://qa-lab.pages.dev/lesson/api-testing-tools/wireshark-tcpdump-packet-analysis/) — t4

## 소요 시간
약 150분 (과제당 30~45분)

## 준비물
- Docker Desktop, Node.js 24 LTS ([준비물 설치 안내](../../../README.md))
- 이 랩이 쓰는 결함 프로필: `none` (결함 없는 앱에서 확인합니다)
- t3: Python 문법을 아주 조금 씁니다(애드온은 Python 파일). 호스트에 Python을 설치할 필요는 없습니다. mitmproxy는 고정 태그 Docker 이미지(`mitmproxy/mitmproxy:12.2.3`)로 실행되며, 처음 채점할 때 이미지를 받느라 시간이 걸릴 수 있습니다.
- t4: [Wireshark](https://www.wireshark.org/)(GUI와 `tshark` 명령 포함) 또는 `tcpdump`

Wireshark 설치:

macOS / Linux (터미널)

```bash
# macOS
brew install --cask wireshark
# Linux (Debian / Ubuntu)
sudo apt install tshark
```

Windows (PowerShell)

```powershell
winget install -e --id WiresharkFoundation.Wireshark
```
<!-- TODO: verify-windows — tshark 가 PATH 에 잡히는지 확인 (winget ID 는 확인함) -->

시작하기:

공통

```bash
npm run lab -- api-testing-tools/swagger-and-traffic
npm run up -- --profile none
```

작업 폴더 `labs/api-testing-tools/swagger-and-traffic/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `t1-scenario.yaml` | t1 답안. 질문과 빈칸 |
| `addon.py` | t3 답안. 아무 일도 하지 않는 mitmproxy 애드온 뼈대 |
| `capture.pcap` | t4 자료. 합성한 HTTP 트래픽 캡처(실제 서비스를 캡처한 것이 아닙니다) |
| `t4-answers.yaml` | t4 답안. 질문과 빈칸 |

## 과제

### t1. Swagger UI로 시나리오 풀기
- 할 일: 브라우저에서 http://127.0.0.1:3000/docs 를 열고, `work/t1-scenario.yaml`의 질문 6개에 답합니다. 로그인(`POST /api/auth/login`)으로 받은 토큰을 오른쪽 위 **Authorize**에 넣으면 이후 요청에 붙습니다. 시드 계정과 비밀번호는 [루트 README](../../../README.md)에 있습니다.
- 정답은 채점기가 결함 없는 앱에 같은 절차를 직접 실행해서 만듭니다. 틀린 답의 정답은 알려 주지 않고 맞음/다름만 알려 줍니다.
- 기준: 6문제 모두 정답
- 채점: `npm run check -- api-testing-tools/swagger-and-traffic --task t1`

### t2. OpenAPI → 컬렉션 → Newman 파이프라인
- 할 일: 저장소 루트에서 변환 명령으로 명세를 컬렉션으로 바꿉니다.

공통

```bash
npx openapi2postmanv2 -s apps/shop/api/openapi.yaml -o labs/api-testing-tools/swagger-and-traffic/work/api.collection.json -p
```

  그리고 변환된 컬렉션을 **끝까지 실행되게** 고칩니다.
  1. 변환기는 인증이 필요한 요청에 `Bearer {{bearerToken}}`을 넣어 줍니다. `bearerToken`을 채우도록 로그인 요청을 고치세요(요청 본문의 예시 값을 실제 계정으로, Tests에서 컬렉션 변수에 저장). 로그인이 다른 요청보다 먼저 실행되어야 합니다.
  2. 검증(`pm.test`)을 더합니다. 모든 요청에 같은 검증을 한 번에 적용하는 방법이 있습니다.
- 컬렉션 실행: `npx newman run labs/api-testing-tools/swagger-and-traffic/work/api.collection.json`. Postman 앱으로 열어 고친 뒤 **Export → Collection v2.1**로 같은 파일에 저장해도 됩니다.
- 채점 규칙(결함 없는 앱에서 실행):
  - 명세의 오퍼레이션 **21개를 모두 호출**하고, 검증이 **21번 이상 실행**되어 모두 통과해야 합니다.
  - 인증이 필요한 오퍼레이션이 **401을 받으면 안 됩니다**(토큰이 실린 것으로 봅니다). 이 과제에서는 일부러 토큰을 빼고 보내는 요청을 넣지 마세요.
- 채점: `npm run check -- api-testing-tools/swagger-and-traffic --task t2`

### t3. mitmproxy 애드온 만들기
- 할 일: `work/addon.py`에 애드온을 작성합니다. 채점기가 이 파일로 mitmproxy를 앱 앞에 세우고(리버스 프록시), 프록시 주소로 요청을 보내 아래 4가지를 확인합니다.
  1. **응답에 헤더 추가**: 모든 응답에 `X-Proxied-By: qa-lab`을 붙이고 본문은 그대로 둡니다.
  2. **요청 변조**: 상품 상세 `GET /api/products/<숫자>` 요청에 헤더 `X-QA-Lab-Defects: DF-013`을 넣습니다. 앱은 이 헤더로 그 요청에만 결함을 켭니다. 클라이언트가 이미 같은 헤더를 보냈다면 덮어씁니다.
  3. **응답 가로채기**: 결제 요청 `POST /api/orders/<id>/pay`는 앱에 보내지 않고, 상태 `503`과 본문 `{"code": "PAYMENT_GATEWAY_DOWN"}`으로 직접 답합니다. (그 주문은 `PENDING`으로 남아야 합니다.)
  4. **상태 유지**: 프록시를 지나간 요청 수를 응답 헤더 `X-Proxy-Count`에 적습니다(요청마다 1씩 늘어남).
- 채점 중 앱에 주문 하나가 만들어집니다(채점 전후로 DB 초기화). 컨테이너는 채점이 끝나면 자동으로 지워집니다.
- 직접 띄워 보기(선택): 저장소 루트에서 아래를 실행하고 http://127.0.0.1:8081 로 요청을 보내 봅니다. 앱이 먼저 떠 있어야 합니다.

macOS / Linux (터미널)

```bash
docker run --rm -p 127.0.0.1:8081:8080 --network qa-lab-shop_default --user 1000:1000 --env HOME=/tmp --tmpfs /tmp --entrypoint mitmdump --mount type=bind,source="$(pwd)/labs/api-testing-tools/swagger-and-traffic/work",target=/addon,readonly mitmproxy/mitmproxy:12.2.3 --mode reverse:http://api:3000 --listen-host 0.0.0.0 --listen-port 8080 -s /addon/addon.py
```

Windows (PowerShell)

```powershell
docker run --rm -p 127.0.0.1:8081:8080 --network qa-lab-shop_default --user 1000:1000 --env HOME=/tmp --tmpfs /tmp --entrypoint mitmdump --mount "type=bind,source=$PWD\labs\api-testing-tools\swagger-and-traffic\work,target=/addon,readonly" mitmproxy/mitmproxy:12.2.3 --mode reverse:http://api:3000 --listen-host 0.0.0.0 --listen-port 8080 -s /addon/addon.py
```

- 기준: 4가지 모두 구현
- 채점: `npm run check -- api-testing-tools/swagger-and-traffic --task t3`

### t4. 패킷 캡처 읽기
- 할 일: `work/capture.pcap`을 Wireshark나 `tshark`·`tcpdump`로 열어 `work/t4-answers.yaml`의 항목 6개를 채웁니다. 질문은 그 파일 위쪽 주석에 있습니다.
- 시간은 "요청을 **처음** 보낸 패킷부터 응답의 첫 패킷까지"로 잽니다.
- 정답은 채점기가 원본 캡처에서 직접 계산합니다. 틀린 답의 정답은 알려 주지 않고 맞음/다름만 알려 줍니다.
- 기준: 6문제 모두 정답
- 채점: `npm run check -- api-testing-tools/swagger-and-traffic --task t4`

## 완료 기준
- [ ] t1: 질문 6개 모두 정답
- [ ] t2: 오퍼레이션 21개 호출, 검증 21번 이상 실행·모두 통과, 인증이 필요한 요청에 401 없음
- [ ] t3: 애드온 동작 4가지 모두 확인됨
- [ ] t4: 질문 6개 모두 정답

전체 채점:

공통

```bash
npm run check -- api-testing-tools/swagger-and-traffic
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 방향</summary>

- t1: Authorize에는 토큰 값만 넣습니다(앞에 `Bearer`를 쓰지 않습니다). 사용자를 바꾸면 다시 Authorize 하세요. 요청 본문이 필요한 API는 **Try it out** 후 본문을 직접 고칩니다.
- t2: 변환된 컬렉션을 실행했을 때 `401`이 나오는 요청을 먼저 보세요. 변수 `bearerToken`이 언제 채워지는지가 핵심입니다.
- t3: mitmproxy의 `request` 훅은 요청이 앱으로 가기 **전**, `response` 훅은 응답이 돌아온 **뒤**에 불립니다. 훅 안에서 `flow.request` 와 `flow.response` 를 다룹니다.
- t4: Wireshark의 표시 필터로 원하는 패킷만 좁히세요. 필터 이름은 Wireshark의 필터 입력란에서 자동 완성됩니다.

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- t1: 오류 응답의 `code`는 응답 본문의 필드입니다(상태 코드 숫자가 아닙니다). 재고 부족 오류는 **재고를 넘는 수량**으로 담을 때 나옵니다.
- t2: 컬렉션(또는 폴더)의 **Tests**에 쓴 스크립트는 그 아래 모든 요청 뒤에 실행됩니다. 변환기가 만든 폴더 순서 때문에 로그인이 뒤에 있을 수 있으니 맨 앞으로 옮기세요.
- t3: 요청을 앱에 보내지 않으려면 `request` 훅에서 `flow.response = http.Response.make(상태, 본문, 헤더)`를 채웁니다. 이렇게 만든 응답에도 `response` 훅이 불리는지 직접 확인해 보세요. 요청 수는 애드온 객체의 속성으로 셉니다.
- t4: `http.response.code >= 500`, `tcp.analysis.retransmission`, `http.time` 필터·필드를 써 보세요. 비밀번호는 로그인 요청 패킷의 내용(Follow TCP Stream 또는 `tcpdump -A`)에 보입니다.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- api-testing-tools/swagger-and-traffic --yes`

## 다음 랩
- QA-Lab 선수 관계상 `api-testing-tools`를 선수로 갖는 모듈은 아직 없습니다.
- 복습: 선수 실습인 [QA 숍 API의 계약을 컬렉션과 명세로 점검하기](../../api-contract-testing/shop-api-contract/README.md)에서 만든 컬렉션을 이 랩의 프록시 뒤에서 실행해 보세요.
