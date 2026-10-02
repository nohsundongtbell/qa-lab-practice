# qa-lab-practice

> ## ⚠️ 경고 — 공개 서버에 배포하지 마세요
> 이 저장소의 대상 앱(QA 숍)에는 **실습을 위해 일부러 넣은 결함과 취약점**이 들어 있습니다.
> 모든 포트는 내 컴퓨터(`127.0.0.1`)에서만 열리도록 설정되어 있습니다. 이 설정을 바꾸거나 인터넷에 공개된 서버에 올리지 마세요.

[QA-Lab](https://qa-lab.pages.dev/) 강의와 짝을 이루는 **한국어 QA 실습 저장소**입니다.
개념은 QA-Lab 레슨에서 배우고, 이 저장소에서는 실제로 돌아가는 앱에 직접 테스트를 해 봅니다.

| 층 | 어디서 | 무엇을 |
|---|---|---|
| 강의 | [qa-lab.pages.dev](https://qa-lab.pages.dev/) | 개념, 판단 기준 — "왜, 언제" |
| 실습 | 이 저장소 | 대상 앱, 과제, 자동 채점 — "어떻게" |

---

## 3분 안에 시작하기

### 1. 준비물
| 도구 | 버전 | 용도 |
|---|---|---|
| Docker Desktop (Docker Compose v2 포함) | 최신 안정판 | 대상 앱 실행 |
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
<!-- TODO: verify-windows — winget 패키지 ID와 OpenJS.NodeJS.LTS 가 설치하는 주 버전(24) 확인 -->

> Windows에서는 Docker Desktop의 **WSL 2 백엔드**를 사용합니다. 설치 후 Docker Desktop을 한 번 실행해 두세요.

### 2. 대상 앱 기동

공통

```bash
git clone https://github.com/nohsundongtbell/qa-lab-practice.git
cd qa-lab-practice
docker compose up -d --wait
```

처음에는 이미지를 빌드하느라 몇 분 걸릴 수 있습니다. 끝나면 아래 주소로 접속합니다.

| 무엇 | 주소 |
|---|---|
| 웹 (QA 숍) | http://127.0.0.1:8080 |
| API | http://127.0.0.1:3000 |
| API 문서 (Swagger UI) | http://127.0.0.1:3000/docs |
| OpenAPI 명세 | http://127.0.0.1:3000/openapi.yaml |
| DB (PostgreSQL) | `127.0.0.1:55432`, DB `shop`, 사용자 `shop`, 비밀번호 `shop` |

### 3. 시드 계정
모든 계정의 비밀번호는 `qa-lab-1234`입니다.

| 이메일 | 이름 | 등급 (누적 구매액) | 비고 |
|---|---|---|---|
| `kim@example.com` | 김일반 | NORMAL (0원) | |
| `lee@example.com` | 이실버 | SILVER (100,000원) | |
| `park@example.com` | 박골드 | GOLD (500,000원) | |
| `choi@example.com` | 최브이아이피 | VIP (1,000,000원) | |
| `jeju@example.com` | 고제주 | NORMAL (0원) | 도서산간 우편번호 |
| `admin@example.com` | 관리자 | — | 출고·배송 완료 처리 |

### 4. 첫 랩
랩은 준비 중입니다(`labs/`). 그동안은 [제품 사양서(SPEC)](apps/shop/SPEC.md)를 읽고 웹과 API를 자유롭게 둘러보세요.

---

## 자주 쓰는 명령

| 하고 싶은 일 | 명령 (공통) |
|---|---|
| 기동 | `docker compose up -d --wait` |
| 중지 (데이터 유지) | `docker compose stop` |
| 중지 + **데이터 초기화** | `docker compose down -v` |
| API 로그 보기 | `docker compose logs -f api` |

> 다음 단계에서 `npm run up`, `npm run lab -- <slug>`, `npm run check -- <slug>` 같은 통일된 명령을 추가합니다.

### 결함 프로필 바꾸기
랩마다 사용할 결함 수준(프로필)이 정해져 있습니다. 프로필은 저장소 루트의 `.env` 파일로 정합니다.

macOS / Linux (터미널)

```bash
cp .env.example .env
```

Windows (PowerShell)

```powershell
Copy-Item .env.example .env
```

`.env`에서 `DEFECT_PROFILE`을 `none`, `beginner`, `intermediate`, `advanced` 중 하나로 바꾼 뒤 다시 기동합니다(공통: `docker compose up -d --wait`). 데이터는 유지됩니다.

### 포트가 이미 사용 중이라면
`.env`에서 `WEB_PORT`, `API_PORT`, `DB_PORT`를 바꿉니다. 어떤 프로그램이 포트를 쓰는지 확인하는 방법은 다음과 같습니다.

macOS / Linux (터미널)

```bash
lsof -i :8080
```

Windows (PowerShell)

```powershell
Get-NetTCPConnection -LocalPort 8080
```

---

## 저장소 구조

```
apps/shop/        대상 앱 (api: Fastify + PostgreSQL, web: React)
  SPEC.md         제품 사양서 — 테스트의 기대 결과 근거
defects/          결함 주입 설정 (⚠️ 스포일러 포함 — 랩을 끝내기 전에는 열지 마세요)
labs/             랩 (QA-Lab 모듈 slug 별)
data/             QA-Lab 모듈 목록 스냅샷 (원본 아님)
docs/             계획·플랫폼 지원·기여 안내
```

## 라이선스
코드는 MIT, 문서는 CC BY 4.0입니다. 자세한 내용은 [LICENSE](LICENSE)를 보세요.
