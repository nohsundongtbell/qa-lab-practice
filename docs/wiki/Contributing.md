# 기여하기

## 원칙 (꼭 지킬 것)
- **강의 내용을 복사하지 않습니다.** 개념 설명, 레슨 본문, QA-Lab 모듈·레슨의 **이름**도 쓰지 않습니다. 링크 글자에는 `module-slug / lesson-slug` 를 씁니다. QA-Lab 레슨 링크는 끝에 `/` 를 붙이고 앵커(`#`)를 쓰지 않습니다.
- **정답표와 결함 카탈로그(`defects/`)는 어떤 문서에서도 링크하지 않습니다.**
- 채점은 "정답과 같은가"가 아니라 **관찰 가능한 결과**로. 실패 메시지에 정답·실제 값을 넣지 않습니다.
- 모든 포트는 `127.0.0.1` 에만. 문서·메시지는 한국어, 코드 식별자·명령어는 영어.
- 학습자 명령은 `npm run <명령>` 하나로 macOS·Windows·Linux 에서 같게.

## 무엇을 읽을까
| 하려는 일 | 문서 |
|---|---|
| 새 랩 만들기 | [CONTRIBUTING_LABS](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/CONTRIBUTING_LABS.md), [LAB_SCHEMA](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/LAB_SCHEMA.md), [templates](https://github.com/nohsundongtbell/qa-lab-practice/tree/HEAD/templates) |
| 결함 추가 | [api/README](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/apps/shop/api/README.md) 의 "결함 추가 절차", [REPRO_DSL](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/REPRO_DSL.md) |
| 플랫폼 | [PLATFORM_SUPPORT](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/PLATFORM_SUPPORT.md) |
| CI | [CI](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/CI.md) |
| 보안 랩 안전 장치 | [SECURITY_LAB_SAFETY](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/SECURITY_LAB_SAFETY.md) |
| QA-Lab 연동 | [QA_LAB_INTEGRATION](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/QA_LAB_INTEGRATION.md) |
| 전체 규칙 | [CLAUDE.md](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/CLAUDE.md), [PLAN](https://github.com/nohsundongtbell/qa-lab-practice/blob/HEAD/docs/PLAN.md) |

## 올리기 전에

공통

```bash
npm run validate
npm run build-index -- --check
npm test
```

앱이 필요한 랩을 고쳤다면 앱을 띄우고 그 랩만 E2E 로 확인합니다(starter 는 과제마다 실패, solution 은 통과해야 합니다).

macOS / Linux (터미널)

```bash
npm run up -- --profile advanced
QA_LAB_E2E_ONLY=<모듈>/<랩> npm run test:labs
```

Windows (PowerShell)

```powershell
npm run up -- --profile advanced
$env:QA_LAB_E2E_ONLY = "<모듈>/<랩>"; npm run test:labs
```

PR 에서는 GitHub Actions 가 같은 검사를 돕니다(`validate` 3개 OS, 바뀐 랩의 `lab-ci`).
