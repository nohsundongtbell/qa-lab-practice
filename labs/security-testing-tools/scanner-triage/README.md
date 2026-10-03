# 허가·범위를 정하고 보안 스캐너 리포트 100건을 분류하기

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

> **보안 실습 안전 수칙**
> - 이 랩은 **공격 트래픽을 보내지 않습니다.** 분석 대상은 랩 안의 실행되지 않는 샘플 코드(`scan-target/`)와 가상 스캐너 리포트뿐입니다.
> - 여기서 배운 도구와 방법은 **허가받은 대상에만** 쓰세요. 내가 띄우지 않은 시스템(회사·학교·공개 서비스)을 스캔하는 것은 허가 없이 하면 불법일 수 있습니다.
> - 시작하기 전에 t1의 허가·범위 체크리스트를 채웁니다. t1이 통과해야 t2를 채점합니다.

## 목표
- **한정한다**: 보안 실습을 시작하기 전에 허가와 범위(무엇을 대상으로 하고 무엇을 하지 않을지)를 문서로 정한다.
- **분류한다**: 여러 스캐너(규칙 기반 두 개, AI 하나, 비밀 값 탐지 하나)가 합쳐 낸 리포트 100건을 코드로 확인해 진짜 취약점(TP)·오탐(FP)·중복(DUP)으로 나눈다.
- **의심한다**: 확신에 찬 AI 스캐너의 설명이 코드와 맞는지 직접 확인한다.

## 선수 모듈
- QA-Lab 모듈 [`nonfunctional-testing`](https://qa-lab.pages.dev/module/nonfunctional-testing/)

이 랩과 연결된 레슨입니다. 개념은 여기서 배웁니다.

- [`security-testing-tools / sonarqube-static-analysis`](https://qa-lab.pages.dev/lesson/security-testing-tools/sonarqube-static-analysis/) — 선택 실습(SonarQube)
- [`security-testing-tools / ai-security-scanners-and-report-triage`](https://qa-lab.pages.dev/lesson/security-testing-tools/ai-security-scanners-and-report-triage/) — t1, t2

## 소요 시간
약 150분 (t1 10분, t2 120분 안팎, 선택 실습 별도)

## 준비물
- Node.js 24 LTS와 저장소 루트의 `npm ci` ([설치 안내](../../../README.md)). **Docker와 대상 앱은 필요 없습니다**(선택 실습만 Docker 사용).
- 스프레드시트 프로그램(분류표 `triage.csv` 편집용, 선택)

공통

```bash
npm run lab -- security-testing-tools/scanner-triage
```

작업 폴더 `labs/security-testing-tools/scanner-triage/work/`에 다음이 복사됩니다.

| 경로 | 내용 |
|---|---|
| `scope.yaml` | t1 답안. 허가·범위 체크리스트 |
| `scan-target/` | 분석 대상 샘플 코드. **실행하지 않습니다.** 읽기만 하세요 |
| `scan-report.json`, `scan-report.csv` | 가상 통합 스캐너 리포트 100건 (같은 내용, 형식만 다름) |
| `triage.csv` | t2 답안. 100건의 id 가 들어 있고 판정 칸이 비어 있습니다 |

## 과제

### t1. 허가·범위 체크리스트
- 할 일: `work/scope.yaml`의 주석을 모두 읽고 채웁니다. 진행자, 날짜, 대상, 동의 항목 4개, 하지 않을 것.
- 대상(`targets`)에는 **내 컴퓨터 주소**(`127.0.0.1`, `localhost`)나 **이 저장소의 실습 코드 경로**(`labs/security-testing-tools/…`, `apps/shop/…`)만 쓸 수 있습니다. 다른 주소를 적으면 채점기가 범위 밖으로 거절합니다.
- 채점: `npm run check -- security-testing-tools/scanner-triage --task t1`

### t2. 스캐너 리포트 100건 분류
- 할 일: `work/triage.csv`의 각 행에 판정을 적습니다.

  | 열 | 값 |
  |---|---|
  | `verdict` | `TP`(진짜 취약점) · `FP`(오탐) · `DUP`(앞의 항목과 같은 문제) |
  | `duplicate_of` | `DUP`일 때만: 같은 문제인 다른 항목의 id |
  | `note` | 자유 메모 (채점하지 않음) |

- **이 팀의 분류 기준**(채점 기준이 되는 운영 정의):
  1. **중복**: 파일·줄·CWE가 모두 같은 항목은 같은 문제입니다. 그중 번호가 **가장 작은** 항목만 TP/FP로 판정하고, 나머지는 `DUP`로 적고 `duplicate_of`에 같은 문제의 다른 항목 id를 씁니다. 도구·규칙 이름·문구가 달라도 같은 문제입니다.
  2. **TP**: 운영 코드(`src/`)에서, 신뢰할 수 없는 입력이 방어 없이 위험한 곳에 닿거나, 보안 목적의 설정·알고리즘이 약하거나, 실제 비밀 값·민감 정보가 노출되는 경우. 위험한 정규식(재앙적 역추적)은 입력 출처와 관계없이 TP입니다.
  3. **FP**: 방어가 있음(매개변수화된 쿼리, 이스케이프, 허용 목록, 경로 정규화, 형식 검사, 고정된 값), 보안 목적이 아님(캐시용 해시, 화면 섞기 등), 문서용 자리 표시자, **테스트 코드**(`test/`), 리포트가 가리키는 **파일이 없거나 그 줄에 인용한 코드가 없음**.
- 판정은 리포트의 문구가 아니라 **코드**로 합니다. 리포트의 `file`·`line`을 `work/scan-target/`에서 직접 열어 확인하세요. AI 스캐너의 확신에 찬 설명도 예외가 아닙니다.
- 채점 결과는 **집계만** 알려 줍니다(어떤 항목이 틀렸는지는 알려 주지 않습니다).
- 기준: 100건 중 **90건 이상** 정답, 진짜 취약점을 놓친 것(TP를 FP·DUP로) **1건 이하**
- 채점: `npm run check -- security-testing-tools/scanner-triage --task t2`

## 선택 실습 — SonarQube로 같은 코드 분석하기 (채점하지 않음)
SonarQube를 내 컴퓨터에 띄워 `scan-target/`을 분석하고, t2의 리포트와 비교해 봅니다. Docker와 메모리 4GB 이상이 필요하고, 처음 받는 이미지가 큽니다(약 1GB).

<!-- TODO: verify — 개발 환경에서는 SonarQube 내장 Elasticsearch 가 디스크 한도 때문에 시작하지 못해 아래 절차를 끝까지 검증하지 못했다. macOS·Windows 의 Docker Desktop 에서 확인 필요 -->
<!-- TODO: verify-windows — 바인드 마운트 경로 형식 -->

1. SonarQube를 띄웁니다(포트는 `127.0.0.1`에만 엽니다). 1~2분 뒤 http://127.0.0.1:9000 에서 `admin` / `admin`으로 로그인하고 비밀번호를 바꾼 다음, **My Account → Security**에서 토큰을 만듭니다.

공통

```bash
docker network create qa-lab-sonar
docker run -d --name qa-lab-sonarqube --network qa-lab-sonar -p 127.0.0.1:9000:9000 sonarqube:26.9.0.129388-community
```

2. 스캐너로 분석합니다. `<토큰>`을 바꿔 넣으세요.

macOS / Linux (터미널)

```bash
docker run --rm --network qa-lab-sonar -e SONAR_HOST_URL=http://qa-lab-sonarqube:9000 -e SONAR_TOKEN=<토큰> -v "$(pwd)/labs/security-testing-tools/scanner-triage/work/scan-target:/usr/src" sonarsource/sonar-scanner-cli:11 -Dsonar.projectKey=qa-lab-scan-target
```

Windows (PowerShell)

```powershell
docker run --rm --network qa-lab-sonar -e SONAR_HOST_URL=http://qa-lab-sonarqube:9000 -e SONAR_TOKEN=<토큰> -v "${PWD}\labs\security-testing-tools\scanner-triage\work\scan-target:/usr/src" sonarsource/sonar-scanner-cli:11 -Dsonar.projectKey=qa-lab-scan-target
```

3. 웹 화면의 **Issues**와 **Security Hotspots**를 t2의 판정과 비교해 보세요. SonarQube가 놓친 진짜 취약점, 반대로 SonarQube만 찾은 것이 있나요?
4. 끝나면 정리합니다.

공통

```bash
docker rm -f qa-lab-sonarqube
docker network rm qa-lab-sonar
```

> Linux에서 SonarQube가 바로 멈춘다면 내장 Elasticsearch의 요구 사항(`vm.max_map_count` 262144 이상)을 확인하세요. 이 설정은 호스트 커널 설정이라 실습이 끝나면 원래대로 돌려도 됩니다.

## 완료 기준
- [ ] t1: 체크리스트 완성, 대상은 내 컴퓨터·실습 코드뿐
- [ ] t2: 정답 90건 이상, 놓친 진짜 취약점 1건 이하

전체 채점:

공통

```bash
npm run check -- security-testing-tools/scanner-triage
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1 — 순서</summary>

- 먼저 **중복부터** 묶으세요. 리포트를 파일 → 줄 → CWE 순으로 정렬하면(스프레드시트에서 `scan-report.csv`) 같은 문제가 붙어 나옵니다. 100건이 생각보다 훨씬 적은 수의 문제로 줄어듭니다.
- 그다음 문제마다 코드를 엽니다. "입력이 어디서 오는가 → 어디로 가는가 → 그 사이에 방어가 있는가"를 차례로 보세요.
- 리포트의 `snippet`이 실제 그 줄의 코드와 같은지 확인하세요. 다르다면 무엇을 믿어야 할까요?

</details>

<details>
<summary>힌트 2 — 조금 더 구체적으로</summary>

- 같은 CWE가 한 파일에 두 번 나오면 대개 하나는 위험하고 하나는 고친 버전입니다. 두 줄을 나란히 놓고 차이를 찾으세요(`$1` 자리 표시자, `escapeHtml`, `path.basename`, 허용 목록, `execFile`, 소유자 조건, 끝 4자리만 저장 …).
- 해시·난수는 **무엇에 쓰는지**를 보세요. 비밀번호 저장과 재설정 토큰은 보안 목적이고, 캐시 태그와 추천 순서 섞기는 아닙니다.
- `test/` 아래 코드, 문서용 자리 표시자(`<your-token-here>`), 존재하지 않는 파일을 가리키는 항목은 분류 기준 3번을 다시 읽으세요.
- 진짜 취약점은 모두 17개 위치에 있습니다. 놓치면 오탐보다 더 비쌉니다.

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- security-testing-tools/scanner-triage --yes`

## 다음 랩
- QA-Lab 선수 관계상 이 모듈 다음은 [`security-testing-advanced`](https://qa-lab.pages.dev/module/security-testing-advanced/) (실습 랩 준비 중)
