# 시작하기

## 1. 준비물
| 도구 | 버전 | 용도 |
|---|---|---|
| Docker Desktop (Compose v2 포함) | 최신 안정판 | 대상 앱 실행. Windows 는 WSL 2 백엔드 |
| Node.js | 24 LTS | 랩 실행·채점 |
| Git | 아무 버전 | 저장소 받기 |

macOS / Linux (터미널)

```bash
brew install --cask docker
brew install node@24 git
```

Windows (PowerShell)

```powershell
winget install -e --id Docker.DockerDesktop
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
```

설치 뒤 Docker Desktop 을 한 번 실행해 두세요.

## 2. 받기와 점검

공통

```bash
git clone https://github.com/nohsundongtbell/qa-lab-practice.git
cd qa-lab-practice
npm ci
npm run doctor
```

`npm run doctor` 가 Node·Docker·포트·줄바꿈을 점검하고 문제가 있으면 해결 방법을 알려 줍니다.

## 3. 대상 앱 띄우기

공통

```bash
npm run up
```

처음에는 이미지를 빌드하느라 몇 분 걸립니다. 끝나면:

| 무엇 | 주소 |
|---|---|
| 웹 (QA 숍) | http://127.0.0.1:8080 |
| API | http://127.0.0.1:3000 |
| API 문서 (Swagger UI) | http://127.0.0.1:3000/docs |

시드 계정은 모두 비밀번호 `qa-lab-1234` 입니다(`kim@example.com`, `lee@example.com`, `park@example.com`, `choi@example.com`, `jeju@example.com`, `admin@example.com`). 등급 등 자세한 표는 [README](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/README.md) 에 있습니다.

## 4. 첫 랩

공통

```bash
npm run lab
npm run lab -- test-design/shop-rules
```

첫 명령은 랩 목록을, 둘째 명령은 그 랩의 작업 폴더(`labs/<모듈>/<랩>/work/`)를 만들고 필요한 결함 프로필을 알려 줍니다. 랩 README 를 읽고 과제를 푼 뒤 채점합니다.

공통

```bash
npm run check -- test-design/shop-rules
npm run check -- test-design/shop-rules --task t1
```

## 5. 자주 쓰는 명령
| 하고 싶은 일 | 명령 |
|---|---|
| 결함 프로필을 정해서 기동 | `npm run up -- --profile beginner` |
| 중지 (데이터 유지) | `npm run down` |
| 데이터 초기화 후 다시 기동 | `npm run reset` |
| API 로그 보기 / 따라 보기 | `npm run logs` / `npm run logs -- --follow` |
| 막혔을 때 정답 위치 | `npm run solution -- <랩> --yes` |

다음: [랩 목록과 학습 순서](https://github.com/nohsundongtbell/qa-lab-practice/wiki/Lab-Roadmap)
