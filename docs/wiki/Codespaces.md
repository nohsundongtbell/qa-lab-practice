# 설치 없이 브라우저에서 하기 (GitHub Codespaces)

내 컴퓨터에 Docker·Node.js·Git 을 설치하지 않고, **GitHub 가 빌려주는 컴퓨터를 브라우저로 열어서** 실습하는 방법입니다. 회사 PC 라 설치가 막혀 있거나, 설치가 부담스러운 분께 맞습니다. GitHub 계정만 있으면 됩니다.

> ⚠️ **포트를 Public(공개)으로 바꾸지 마세요.**
> QA 숍에는 실습을 위해 일부러 넣은 결함과 취약점이 있습니다. Codespaces 의 포트는 기본이 **Private**(내 GitHub 계정으로만 열림)입니다. PORTS 탭에서 Visibility 를 **Public** 으로 바꾸면 주소를 아는 누구나 로그인 없이 접속할 수 있습니다. 실수로 바꿨다면 바로 해당 줄을 오른쪽 클릭 → **Port Visibility** → **Private** 으로 되돌리세요.

## 비용과 시간

| 항목 | 내용 |
|---|---|
| 무료 사용량 (개인 무료 계정) | 매달 2코어 컴퓨터로 **약 60시간**, 저장 공간 15GB |
| 다 쓰면 | 결제 수단을 등록하지 않았다면 **요금이 나가지 않고 그냥 멈춥니다.** 다음 달에 다시 쓸 수 있습니다 |
| 자동 정지 | 30분 동안 아무것도 하지 않으면 멈춥니다(멈춘 동안에는 시간이 줄지 않습니다) |
| 자동 삭제 | 멈춘 뒤 30일 동안 다시 열지 않으면 지워집니다 |
| 랩 13개를 모두 하는 데 | 약 26시간 — 무료 범위 안입니다 |

정확한 조건은 GitHub 의 [Codespaces 요금 안내](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)를 보세요.

## 1. 만들기

1. GitHub 에 로그인합니다(계정이 없으면 https://github.com 에서 만듭니다).
2. 아래 주소를 엽니다.
   https://codespaces.new/nohsundongtbell/qa-lab-practice
3. **Create codespace** 를 누릅니다. 컴퓨터 종류는 기본값(2-core)이면 됩니다.
4. 새 탭에 VS Code 화면이 열리고 준비 작업이 1~3분 돌아갑니다. 아래쪽 **TERMINAL** 에 `$` 로 끝나는 줄이 나오면 준비된 것입니다.

화면 구성: 왼쪽은 파일 목록, 가운데는 파일 편집, 아래쪽은 **TERMINAL**(명령 입력)과 **PORTS**(앱 주소) 탭입니다.

## 2. 앱 띄우기

TERMINAL 에 입력합니다.

공통

```bash
npm run up
```

처음에는 앱을 만드느라 1~2분 걸립니다. **"준비되었습니다."** 가 나오면 아래쪽 **PORTS** 탭을 엽니다.

| PORTS 탭의 줄 | 지구 아이콘을 누르면 |
|---|---|
| 8080 · QA 숍 웹 | 쇼핑몰 화면 |
| 3000 · QA 숍 API·Swagger UI | API 문서(Swagger UI) 화면 |

- 주소가 `https://…-8080.app.github.dev` 처럼 길게 바뀝니다. 정상입니다. README 나 랩 안내의 `http://127.0.0.1:8080` 은 이 주소로 읽으면 됩니다(Codespace 안에서 그 링크를 누르면 자동으로 바꿔 열어 줍니다).
- 처음 열 때 GitHub 로그인 확인이 한 번 나올 수 있습니다.
- 두 줄의 **Visibility 가 Private** 인지 확인하세요.

## 3. 랩 하기

명령은 [시작하기](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Getting-Started)와 [코딩 없이 하는 랩](https://github.com/nohsundongtbell/qa-lab-practice/wiki/No-Code-Labs)에 있는 것과 **똑같습니다.** 모두 TERMINAL 에 입력합니다.

- 파일은 왼쪽 파일 목록에서 `labs/<랩>/work/` 를 찾아 눌러 가운데에서 바로 고칩니다. 저장은 `Ctrl+S`(macOS `Command+S`).
- **CSV 를 Excel 로 고치고 싶다면**: 파일을 오른쪽 클릭 → **Download** 로 내 컴퓨터에 받아 고친 뒤, 고친 파일을 파일 목록의 같은 폴더로 끌어다 놓으면 올라갑니다(같은 이름이면 덮어쓸지 묻습니다).
- 랩 README 는 파일 목록에서 README.md 를 오른쪽 클릭 → **Open Preview** 로 보면 읽기 편합니다.

## 4. 끝낼 때

- **멈추기**: https://github.com/codespaces 에서 내 Codespace 의 **⋯ → Stop codespace**. 그냥 탭을 닫아도 30분 뒤 자동으로 멈춥니다.
- **다시 열기**: 같은 곳에서 Codespace 이름을 누릅니다. 앱은 `npm run up` 으로 다시 띄웁니다. 만든 파일은 그대로 있습니다.
- **⚠️ 지우면 내 답안도 사라집니다.** 랩 작업 폴더(`work/`)는 저장소에 올라가지 않는 폴더라서, Codespace 를 지우면(또는 30일 뒤 자동 삭제되면) 함께 없어집니다. 남겨 두고 싶으면 지우기 전에 `work` 폴더를 오른쪽 클릭 → **Download** 로 받아 두세요.
- **지우기**: https://github.com/codespaces 에서 **⋯ → Delete**. 다 끝났다면 지워서 저장 공간 사용량을 아끼세요.

## 내 컴퓨터에 설치했을 때와 다른 점

| 항목 | Codespaces |
|---|---|
| 설치 | 필요 없음 (Node.js, Docker, Playwright 브라우저가 미리 준비됨) |
| 앱 주소 | `127.0.0.1` 대신 PORTS 탭의 `…app.github.dev` 주소 |
| 부하 테스트 랩(`performance-testing-tools/locust-bottlenecks`) | 2코어라 측정이 흔들릴 수 있습니다. 채점기가 "측정 환경 문제"라고 하면 다시 채점하거나 4-core 로 만들어 보세요(무료 시간이 두 배로 줄어듭니다) |
| 보안 랩의 SonarQube(선택 실습) | 메모리가 많이 필요해 권하지 않습니다. 채점에는 쓰지 않습니다 |
| Excel·메모장, Windows 전용 안내 | 해당 없음. 파일은 VS Code 에서 고칩니다 |

## 확인된 환경 (2026-10-04)
2-core Codespace 에서 `npm run doctor`, `npm run up`(처음 약 1분), `npm test` 637개, Selenium 랩 채점(Chrome 을 따로 설치하지 않아도 통과), 쇼핑몰·Swagger UI 화면, 포트 기본 Private 을 확인했습니다. 다른 랩의 채점은 같은 명령이라 동작할 것으로 보지만 Codespace 에서 하나씩 돌려 보지는 않았습니다(`TODO: verify`).
