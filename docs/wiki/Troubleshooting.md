# 문제 해결

먼저 `npm run doctor` 를 실행하세요. 대부분의 환경 문제를 찾아 해결 방법을 알려 줍니다.

| 증상 | 원인과 해결 |
|---|---|
| `대상 앱에 연결할 수 없습니다` | 앱이 꺼져 있습니다. `npm run up -- --profile <랩의 프로필>` |
| `Docker 가 실행 중이 아닙니다` | Docker Desktop 을 켜세요. Windows 는 WSL 2 백엔드가 필요합니다 |
| 포트가 이미 사용 중 | `.env` 에서 `WEB_PORT`, `API_PORT`, `DB_PORT` 를 바꾸고 `npm run up`. 어떤 프로그램이 쓰는지: macOS/Linux `lsof -i :8080`, Windows `Get-NetTCPConnection -LocalPort 8080` |
| 처음 `npm run up` 이 오래 걸림 | 이미지를 빌드하는 중입니다(몇 분). 두 번째부터 빠릅니다 |
| 데이터가 꼬였다 | `npm run reset` (DB 를 처음 상태로) |
| `작업 폴더가 없습니다` | 먼저 `npm run lab -- <랩>` 으로 작업 폴더를 만드세요 |
| 채점했더니 내가 만든 데이터가 사라짐 | 많은 랩이 채점 때 DB 를 초기화합니다(정상) |
| `[주의] 이 랩은 결함 프로필 … 을 가정하는데` | 채점은 그대로 진행됩니다. 직접 확인할 때 결과가 README 와 다를 수 있으니 프로필을 맞추세요 |
| `Playwright 브라우저가 설치되어 있지 않습니다` | `npx playwright install chromium` |
| Selenium: `브라우저(Chrome) 또는 드라이버를 시작하지 못했습니다` | Chrome 을 설치하고 인터넷에 연결하세요. 드라이버는 처음 실행할 때 자동으로 받습니다 |
| mitmproxy·Locust 이미지를 받지 못함 | 네트워크 확인 후 다시 채점. Docker Hub 요청 제한이면 잠시 뒤 재시도 |
| 부하 랩: `결함이 없는 상태에서 … 목표를 넘거나` | 컴퓨터가 바빠 측정이 흔들렸습니다. 다른 프로그램을 닫고 다시 채점 |
| Excel 에서 저장한 CSV 의 한글이 깨짐 | 채점기는 UTF-8 과 CP949 를 모두 읽습니다. 그래도 안 되면 "CSV UTF-8" 형식으로 저장 |
| `npm run check` 가 `planned` 라고 함 | 아직 준비 중인 랩입니다 |

그래도 안 되면 저장소의 Issues 에 `npm run doctor` 출력과 채점 출력을 붙여 알려 주세요(비밀번호·토큰은 지우고).
