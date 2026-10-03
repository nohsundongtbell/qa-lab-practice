# 처음이라면: 설치부터 첫 화면까지

터미널을 거의 써 본 적이 없는 분을 위한 안내입니다. 순서대로 따라 하면 **내 컴퓨터에서 실습용 쇼핑몰(QA 숍)이 열리는 것**까지 갑니다. 처음에는 설치와 내려받기 때문에 30분~1시간쯤 걸립니다. 두 번째부터는 1분이면 됩니다.

이미 개발 도구에 익숙하다면 [시작하기](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Getting-Started)로 바로 가세요.

## 1. 먼저 알아 둘 말 몇 개

| 말 | 뜻 |
|---|---|
| 터미널 | 글자로 컴퓨터에 명령하는 창입니다. Windows 는 **PowerShell**, macOS 는 **터미널** 앱을 씁니다 |
| 명령 | 터미널에 입력하는 한 줄입니다. 이 위키의 회색 상자 안 글자가 명령입니다 |
| 저장소 | 이 실습 자료 전체가 들어 있는 폴더입니다. GitHub 에서 내 컴퓨터로 받아 옵니다 |
| 대상 앱 (QA 숍) | 테스트할 쇼핑몰입니다. **일부러 결함(버그)을 넣어 둔** 연습용 앱입니다 |
| Docker | 대상 앱을 내 컴퓨터 안의 작은 "상자"에서 실행해 주는 프로그램입니다. 설치만 하고 켜 두면 됩니다 |
| 랩 | 실습 과제 하나입니다. 13개가 있습니다 |
| 채점 | 내가 만든 답(테스트 케이스, 리포트 등)을 프로그램이 자동으로 확인하는 것입니다 |

## 2. 터미널 여는 법

- **Windows**: 키보드의 Windows 키를 누르고 `PowerShell` 을 입력한 뒤 Enter. ("명령 프롬프트(cmd)"가 아니라 **PowerShell** 입니다.)
- **macOS**: `Command + Space` 를 누르고 `터미널` 을 입력한 뒤 Enter.

파란색(또는 검은색) 창이 열리고 `PS C:\Users\내이름>` 이나 `내이름@컴퓨터 ~ %` 같은 글자 뒤에 커서가 깜박이면 준비된 것입니다. 이 글자를 **프롬프트**라고 합니다.

## 3. 명령을 입력하는 규칙

- **한 줄씩** 복사해서 터미널에 붙여 넣고 **Enter** 를 누릅니다. 붙여 넣기: Windows 는 마우스 오른쪽 클릭 또는 `Ctrl+V`, macOS 는 `Command+V`.
- 명령이 끝나면 **프롬프트가 다시 나타납니다.** 그 전에는 다음 명령을 넣지 말고 기다리세요.
- `<랩 이름>` 처럼 **꺾쇠(`< >`)로 감싼 부분은 내 값으로 바꿔서** 넣습니다. 꺾쇠까지 지우고 넣어야 합니다.
- 회색 상자 안의 `#` 으로 시작하는 줄은 설명이라 입력하지 않아도 됩니다.
- 실행 중인 명령을 멈추려면 `Ctrl+C` 를 누릅니다(macOS 도 `Control+C`).
- 결과에 영어가 많이 나와도 괜찮습니다. 마지막 몇 줄에 `error`, `오류`, `실패` 가 없으면 대개 성공입니다.

## 4. 프로그램 세 개 설치하기

필요한 것은 **Docker Desktop**, **Node.js**(채점 프로그램 실행), **Git**(저장소 받기) 세 가지입니다.

macOS / Linux (터미널)

```bash
# Homebrew 가 없다면 https://brew.sh 의 안내대로 먼저 설치합니다
brew install --cask docker
brew install node@24 git
```

Windows (PowerShell)

```powershell
winget install -e --id Docker.DockerDesktop
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
```

설치가 끝나면 꼭 두 가지를 하세요.

1. **터미널을 닫고 새로 엽니다.** 열려 있던 터미널은 새로 설치한 프로그램을 모릅니다. 이걸 빼먹으면 "인식되지 않습니다" 오류가 납니다.
2. **Docker Desktop 앱을 한 번 실행합니다.** 처음 실행할 때 약관 동의와 설정 화면이 나옵니다. Windows 는 WSL 2 설치를 묻거나 재부팅을 요청할 수 있습니다. 화면 아래(또는 위) 알림 영역에 **고래 아이콘**이 보이고 Docker Desktop 화면에 "Engine running" 이 나오면 준비된 것입니다.

새 터미널에서 아래 세 줄로 설치를 확인합니다. 세 줄 모두 버전 번호가 나오면 성공입니다. `docker version` 은 `Client` 와 `Server` 두 부분이 나오는데, `Server` 쪽에 오류가 나면 Docker Desktop 이 아직 켜지지 않은 것입니다.

공통

```bash
node -v
git --version
docker version
```

## 5. 실습 자료(저장소) 받기

저장소를 **문서 폴더** 안에 받는 것을 추천합니다.

macOS / Linux (터미널)

```bash
cd ~/Documents
git clone https://github.com/nohsundongtbell/qa-lab-practice.git
cd qa-lab-practice
```

Windows (PowerShell)

```powershell
cd $HOME\Documents
git clone https://github.com/nohsundongtbell/qa-lab-practice.git
cd qa-lab-practice
```

`cd` 는 "이 폴더로 이동"이라는 뜻입니다. 앞으로 실습 명령은 **모두 이 `qa-lab-practice` 폴더 안에서** 실행합니다. 프롬프트 끝이 `qa-lab-practice>` (macOS 는 `qa-lab-practice %`) 이면 제대로 들어온 것입니다.

## 6. 점검하고 대상 앱 띄우기

공통

```bash
npm ci
npm run doctor
```

- `npm ci` 는 채점에 필요한 부품을 내려받습니다(처음 한 번, 1~2분).
- `npm run doctor` 는 준비가 다 됐는지 점검합니다. 모든 줄이 `[ OK ]` 이고 마지막에 **"문제 없습니다."** 가 나오면 됩니다. `[FAIL]` 이나 `[WARN]` 이 있으면 그 줄에 적힌 해결 방법을 따르세요.

이제 대상 앱을 띄웁니다.

공통

```bash
npm run up
```

처음에는 앱을 만드느라 몇 분 걸립니다. **"준비되었습니다."** 와 주소가 나오면 브라우저에서 http://127.0.0.1:8080 을 엽니다. 쇼핑몰 화면이 보이면 성공입니다. 로그인해 보려면 이메일 `kim@example.com`, 비밀번호 `qa-lab-1234` 를 쓰세요.

## 7. 첫 랩 고르기

코딩 없이 할 수 있는 랩부터 시작하는 것을 추천합니다.

| 랩 | 하는 일 |
|---|---|
| `test-design/shop-rules` | 쇼핑몰 규칙을 보고 테스트 케이스를 표(CSV, Excel 로 편집 가능)로 작성 |
| `defect-management/defect-reports` | 찾은 결함을 정해진 양식의 리포트(글)로 작성 |
| `exploratory-testing/charter-sessions` | 탐색 목표를 정하고 직접 써 보면서 발견한 것을 노트로 기록 |

랩 하나를 시작하는 명령은 이렇습니다. 그다음은 그 랩의 README 를 따라가면 됩니다.

공통

```bash
npm run lab -- test-design/shop-rules
```

이 세 랩을 묶은 코스와 요령: [코딩 없이 하는 랩](https://github.com/nohsundongtbell/qa-lab-practice/wiki/No-Code-Labs). 전체 목록과 추천 순서: [랩 목록과 학습 순서](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Lab-Roadmap). 채점 결과를 읽는 법: [채점 결과 읽는 법](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Reading-Results).

## 8. 끝낼 때와 다시 시작할 때

끝낼 때 (만든 데이터는 남습니다)

```bash
npm run down
```

다음에 다시 시작할 때: Docker Desktop 을 켜고, 터미널을 열어 저장소 폴더로 이동한 뒤 앱을 띄웁니다.

macOS / Linux (터미널)

```bash
cd ~/Documents/qa-lab-practice
npm run up
```

Windows (PowerShell)

```powershell
cd $HOME\Documents\qa-lab-practice
npm run up
```

## 9. 자주 막히는 곳

| 이런 글자가 보이면 | 이렇게 하세요 |
|---|---|
| `… 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다` (macOS: `command not found`) | 설치 직후라면 **터미널을 닫고 새로 여세요.** 그래도 같으면 4단계의 설치가 끝났는지 확인합니다 |
| `'<' 연산자는 나중에 사용하도록 예약되어 있습니다` | 명령의 `< >` 부분을 바꾸지 않고 그대로 넣었습니다. 꺾쇠를 지우고 내 값으로 바꿔 넣으세요 |
| `… 경로는 존재하지 않으므로 찾을 수 없습니다` (macOS: `No such file or directory`) | 폴더 위치가 다릅니다. 5단계의 `cd` 명령을 다시 따라 하세요 |
| `npm.ps1 파일을 로드할 수 없습니다` 처럼 "스크립트를 실행할 수 없다"는 내용 (Windows) | PowerShell 이 스크립트 실행을 막고 있습니다. `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 를 한 번 실행하고 `Y` 를 누른 뒤 터미널을 새로 여세요. `TODO: verify-windows` — 새 PC 의 기본 설정에서 이 오류가 나는지 아직 확인하지 못했습니다 |
| `Docker 데몬` 또는 `docker` 관련 오류, `npm run doctor` 의 Docker 줄이 `[FAIL]` | Docker Desktop 이 꺼져 있습니다. 앱을 켜고 "Engine running" 이 될 때까지 기다린 뒤 다시 실행하세요 |
| `포트 … 사용 중` | 다른 프로그램이 같은 번호를 쓰고 있습니다. [문제 해결](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Troubleshooting)의 "포트가 이미 사용 중"을 보세요 |
| 브라우저에서 http://127.0.0.1:8080 이 안 열림 | `npm run up` 이 "준비되었습니다." 까지 끝났는지 확인하세요. 컴퓨터를 껐다 켰다면 Docker Desktop 을 켜고 `npm run up` 을 다시 실행합니다 |

여기 없는 문제는 [문제 해결](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Troubleshooting)을 보거나, 저장소의 Issues 에 `npm run doctor` 결과를 붙여 알려 주세요(비밀번호는 지우고).
