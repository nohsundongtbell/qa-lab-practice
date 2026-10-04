# Windows 안내

명령은 macOS 와 같습니다(`npm run …`). 문서에서 OS 마다 다른 명령은 **Windows (PowerShell)** 블록을 쓰세요. `cmd` 는 지원하지 않습니다.

## 확인된 환경 (2026-10-03)
Windows 11 Pro, Windows PowerShell 5.1, Docker Desktop(WSL 2 백엔드), Node.js 24, Chrome. 저장소를 `C:\Users\…` 아래에 둔 상태에서 `npm test`, `npm run validate`, 모든 랩 E2E(`npm run test:labs`)가 통과했습니다. 자세한 체크리스트: [PLATFORM_SUPPORT](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/PLATFORM_SUPPORT.md).

## 알아 두면 좋은 것
- **PowerShell 5.1 에서는 `&&` 를 쓰지 않습니다.** 명령을 이을 때는 `;` 를 씁니다.
- **환경 변수**는 `$env:이름 = "값"; 명령` 형식입니다. 예: `$env:UI_VARIANT = "v2"; npx playwright test --config …`
- **종료 코드**는 `$LASTEXITCODE` 로 봅니다(macOS 의 `$?` 대신).
- **Docker 의 폴더 마운트**는 `--mount "type=bind,source=$PWD\경로,target=/…"` 처럼 큰따옴표로 감쌉니다(랩 README 에 그대로 있습니다). 앱의 Docker 네트워크 이름은 `qa-lab-shop_default` 입니다.
- `git` 의 `core.autocrlf=true` 여도 괜찮습니다. 저장소의 `.gitattributes` 가 줄바꿈을 LF 로 고정합니다(`npm run doctor` 가 확인).
- 탐색기에서 `var/logs/app.log` 크기가 0 으로 보일 수 있지만 내용은 정상입니다. `npm run logs` 로 보세요.
- Selenium 드라이버는 `%USERPROFILE%\.cache\selenium` 에 받아집니다.
- 호스트 포트(예: mitmproxy 의 8081)를 다른 프로그램이 쓰고 있으면 `-p 127.0.0.1:<다른 포트>:8080` 으로 바꾸세요. 포트는 항상 `127.0.0.1` 에만 여세요.

## 아직 확인하지 못한 것
PowerShell 콘솔 화면에서의 한국어 표시, `npm run logs -- --follow` 의 Ctrl+C, Postman 앱 가져오기·내보내기, `tshark` PATH, Excel·메모장 화면에서 직접 저장한 CSV, SonarQube 선택 실습. (psql 접속, newman, CP949 CSV 채점은 2026-10-03 확인) 해 보셨다면 결과를 Issues 로 알려 주세요.
