# 위키 원본 (docs/wiki)

이 폴더는 GitHub 위키(https://github.com/nohsundongtbell/qa-lab-practice/wiki)에 올릴 페이지의 **원본**입니다. 위키는 별도의 git 저장소라서, 이 폴더의 파일을 위키 저장소에 복사해 push 합니다. 이 `README.md` 는 올리지 않습니다.

| 파일 | 위키 페이지 |
|---|---|
| `Home.md` | 첫 화면 |
| `_Sidebar.md` | 오른쪽 목차 |
| `First-Time-Setup.md` | 처음이라면 (터미널·설치가 처음인 분) |
| `Getting-Started.md` | 처음 시작하기 |
| `Lab-Roadmap.md` | 랩 목록과 학습 순서 |
| `Reading-Results.md` | 채점 결과 읽는 법 |
| `App-Profiles-and-Conditions.md` | 결함 프로필과 환경 조건 |
| `Troubleshooting.md` | 문제 해결 |
| `Windows-Guide.md` | Windows 사용자 안내 |
| `Contributing.md` | 기여하기 |

올리는 방법 (위키에 페이지가 하나 이상 있어야 위키 저장소가 생깁니다. 처음이면 웹에서 Home 을 한 번 저장하세요):

macOS / Linux (터미널)

```bash
git clone https://github.com/nohsundongtbell/qa-lab-practice.wiki.git qa-lab-practice.wiki
cp docs/wiki/*.md qa-lab-practice.wiki/
rm qa-lab-practice.wiki/README.md
cd qa-lab-practice.wiki
git add -A
git commit -m "docs: wiki pages"
git push
```

Windows (PowerShell)

```powershell
git clone https://github.com/nohsundongtbell/qa-lab-practice.wiki.git qa-lab-practice.wiki
Copy-Item docs/wiki/*.md qa-lab-practice.wiki/
Remove-Item qa-lab-practice.wiki/README.md
cd qa-lab-practice.wiki
git add -A
git commit -m "docs: wiki pages"
git push
```

규칙: 위키도 저장소와 같은 원칙을 따릅니다. QA-Lab 모듈·레슨 **이름을 쓰지 않고 slug** 만 쓰고, 정답표·결함 카탈로그로 링크하지 않으며, 결함의 내용(무엇이 틀렸는지)을 적지 않습니다. 저장소 파일 링크는 기본 브랜치를 가리키는 `blob/HEAD/…` 를 씁니다.
