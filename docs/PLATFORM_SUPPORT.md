# 플랫폼 지원 (macOS / Windows / Linux)

## 컨테이너 이미지 아키텍처
`docker buildx imagetools inspect`로 확인했다(2026-10-02). 모두 멀티 아키텍처 인덱스 다이제스트로 고정했다.

| 이미지 | 사용처 | linux/amd64 | linux/arm64 | 고정 |
|---|---|---|---|---|
| `postgres:16-alpine` | `compose.yaml` db | ✅ | ✅ (v8) | `@sha256:721873c3…` |
| `node:24-alpine` | api·web 빌드, api 실행 | ✅ | ✅ (v8) | `@sha256:ebfe2f90…` |
| `nginx:1.27-alpine` | web 실행 | ✅ | ✅ (v8) | `@sha256:65645c7b…` |

랩용 도구 이미지(Locust, SonarQube, mitmproxy, tshark 등)는 해당 랩을 만들 때 추가한다. `TODO: verify`

## 검증 현황
| 항목 | Linux | macOS | Windows |
|---|---|---|---|
| `docker compose up -d --wait` → 웹·API·DB 기동 | ✅ (개발 환경, x86_64) | `TODO: verify` (Apple Silicon) | `TODO: verify-windows` |
| `docker compose down -v` 초기화 | ✅ | `TODO: verify` | `TODO: verify-windows` |
| 로그 파일 bind mount(`./var/logs`) 쓰기 | ✅ | `TODO: verify` | `TODO: verify-windows` |
| API 단위·통합 테스트 | ✅ | `TODO: verify` | `TODO: verify-windows` |

## GitHub Actions 러너 제약
- GitHub-hosted Windows 러너는 Linux 컨테이너를 실행할 수 없고, macOS(arm64) 러너에는 Docker가 없는 것으로 알고 있다. `TODO: verify` — 공식 문서 확인 필요(작성 환경에서 docs.github.com 접근 불가).
- 그래서 Docker 기반 통합 검증은 Ubuntu 러너에서만 하고, macOS·Windows 러너에서는 Docker 없이 되는 검사(validate, 채점기 단위 테스트, fixture 기반 starter/solution 검증)만 한다(단계 6).

## Windows 수동 확인 체크리스트
아래 항목은 CI로 검증할 수 없다. Windows 사용자가 확인하면 날짜와 환경을 적고 `TODO`를 지운다.

- [ ] Docker Desktop(WSL 2 백엔드)에서 `docker compose up -d --wait` 성공
- [ ] 저장소를 Windows 파일 시스템(`C:\...`)에 두었을 때 bind mount(`./defects`, `./var/logs`) 동작과 속도
- [ ] `git clone` 후 `.sh`·`Dockerfile`·`*.yaml`이 LF로 체크아웃되는지 (`.gitattributes`)
- [ ] PowerShell 5.1에서 README의 PowerShell 블록 실행
- [ ] Node가 출력하는 한국어 메시지가 PowerShell/Windows Terminal에서 깨지지 않는지
- [ ] winget 패키지 ID (`Docker.DockerDesktop`, `OpenJS.NodeJS.LTS`, `Git.Git`)

## 알려진 사항
- 저장소 위치(Windows 파일 시스템 또는 WSL 내부)에 따라 bind mount 성능이 다를 수 있다. 정확한 권장 사항은 Docker 공식 문서를 확인해 적는다. `TODO: verify`
