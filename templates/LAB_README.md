<!--
  랩 README 템플릿. 복사해서 labs/<모듈-slug>/<랩-이름>/README.md 로 쓴다.
  - 절 제목(## …)은 바꾸거나 지우지 않는다. `npm run validate` 가 검사한다.
  - 개념 설명은 쓰지 않는다. QA-Lab 레슨 링크로 대신한다. (강의 내용 복사 금지)
  - QA-Lab 링크는 레슨 단위 URL(끝 `/`)까지만. 앵커(#…)는 쓰지 않는다.
  - 링크 글자에는 QA-Lab 모듈·레슨 **이름을 쓰지 않고 slug** 를 쓴다 (이름 복사 금지, 이름이 바뀌어도 낡지 않게).
  - lab.yaml 의 lessons 에 적은 레슨은 모두 아래에 링크해야 한다.
  - 정답표(defects/ANSWERS.md)와 결함 카탈로그는 링크하지 않는다.
  - OS 마다 다른 명령은 "macOS / Linux (터미널)" + "Windows (PowerShell)" 두 블록을 모두 쓴다. 같으면 "공통" 블록 하나.
-->
# <랩 제목>

> 대상 앱은 내 컴퓨터(`127.0.0.1`)에서만 실행됩니다. 의도적 결함이 들어 있으니 공개 서버에 올리지 마세요.

## 목표
<!-- 행동 동사로 시작하는 한두 문장. 예: "경계값 분석으로 테스트 케이스를 설계하고, 숨은 결함 3개 이상을 찾아낸다." -->

- (이 랩을 마치면 할 수 있게 되는 것)

## 선수 모듈
<!-- QA-Lab 의 선수 관계(스냅샷의 prerequisites)를 따른다. 링크만 쓴다. -->

- QA-Lab 모듈 [`<module-slug>`](https://qa-lab.pages.dev/module/<module-slug>/)

이 랩과 연결된 레슨 (개념은 여기서 배웁니다):

- [`<module-slug> / <lesson-slug>`](https://qa-lab.pages.dev/lesson/<module-slug>/<lesson-slug>/) — 관련 과제

## 소요 시간
약 N분

## 준비물
- Docker Desktop, Node.js 24 LTS ([준비물 설치 안내](../../../README.md))
- 이 랩이 쓰는 결함 프로필: `<sut_profile>`

시작하기:

공통

```bash
npm run lab -- <module-slug>/<lab-name>
npm run up -- --profile <sut_profile>
```

<!-- OS 마다 명령이 달라지는 단계가 있다면 아래 형식으로 둘 다 쓴다. -->

macOS / Linux (터미널)

```bash
cat labs/<module-slug>/<lab-name>/work/notes.md
```

Windows (PowerShell)

```powershell
Get-Content labs/<module-slug>/<lab-name>/work/notes.md
```

## 과제
<!-- lab.yaml 의 tasks 와 1:1. 각 과제는 행동 동사로 시작하고, 결과물(파일)과 채점 방법을 적는다. -->

### t1. (과제 제목)
- 할 일:
- 결과물: `work/…`
- 채점: `npm run check -- <module-slug>/<lab-name> --task t1`

## 완료 기준
<!-- "정답과 같은가"가 아니라 관찰 가능한 결과로 쓴다. 예: "서로 다른 결함 2개 이상을 검출" -->

- [ ] t1: …

전체 채점:

공통

```bash
npm run check -- <module-slug>/<lab-name>
```

## 막혔을 때
정답을 바로 보지 말고 힌트를 차례로 열어 보세요.

<details>
<summary>힌트 1</summary>

(방향만 알려 주는 힌트)

</details>

<details>
<summary>힌트 2</summary>

(더 구체적인 힌트)

</details>

그래도 막히면 정답 위치를 확인할 수 있습니다: `npm run solution -- <module-slug>/<lab-name> --yes`

## 다음 랩
<!-- QA-Lab 선수 관계상 이 모듈을 선수로 가진 모듈의 랩. 아직 랩이 없으면 QA-Lab 모듈 페이지 링크. -->

- [다음 랩 README](../../<next-module>/<next-lab>/README.md) 또는 QA-Lab 모듈 [`<next-module>`](https://qa-lab.pages.dev/module/<next-module>/)
