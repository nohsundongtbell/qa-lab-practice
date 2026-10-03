# 해설 — Selenium으로 구매 시나리오

> 스포일러입니다. 직접 풀어 본 뒤에 읽으세요. 이 폴더의 `tests/t1-purchase.test.mjs`가 모범 답안입니다.

## Playwright와 무엇이 다른가
| 같은 일 | Playwright | Selenium |
|---|---|---|
| 요소 찾기 | `getByRole('button', { name })` | `By.css('button[aria-label="…"]')`, XPath |
| 기다리기 | 동작·단언이 자동으로 기다림 | **명시적**: `driver.wait(until…)`, 조건 함수 |
| 값 확인 | `await expect(loc).toHaveText('x')` (맞을 때까지 재시도) | `getText()`는 한 번 읽을 뿐 → **조건이 참이 될 때까지 기다린 뒤** `expect` |
| 요청 헤더 | `extraHTTPHeaders` | 없음 → DevTools Protocol(`Network.setExtraHTTPHeaders`)로 `support/driver.mjs`에서 처리 |
| 브라우저 준비 | `playwright install` | Selenium Manager가 chromedriver를 자동 다운로드 |

## 핵심 패턴
- `visible(locator)`: 나타나고(`elementLocated`) 보일(`elementIsVisible`) 때까지 기다린 뒤 요소를 돌려줍니다. 모든 동작 앞에 이것을 두면 "아직 없는 요소" 오류가 사라집니다.
- `textBecomes(locator, expected)`: 요소를 **매번 다시 찾아** 읽는 조건 함수를 `driver.wait`에 넘깁니다. 요소가 잠깐 없거나 다시 그려져도(`try/catch`) 계속 기다립니다. 마지막의 `expect`는 그 상태가 되었음을 문서화하는 단언입니다.
- 로케이터는 두 화면 변형에서 같은 것만 씁니다: `aria-label`, 버튼·label 글자, `data-testid`.
- 로그인 실패 테스트는 오류 메시지가 "비어 있지 않을 때까지" 기다린 뒤 값을 비교합니다. 메시지가 나타나기 전에 비교하면 빈 문자열을 읽고 실패합니다.
- 테스트마다 새 브라우저를 띄웁니다. 한 브라우저를 공유하면 앞 테스트의 로그인(React 상태·localStorage)이 남아 뒤 테스트를 망칩니다. 속도가 중요하면 로그인 상태만 분리하는 방법을 찾되, 먼저 독립성을 지키세요.
