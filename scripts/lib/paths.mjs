import path from 'node:path'
import { fileURLToPath } from 'node:url'

// QA_LAB_ROOT 는 테스트용 훅이다 (임시 저장소를 대상으로 CLI 를 돌려 볼 때). 학습자는 쓸 일이 없다.
export const repoRoot = process.env.QA_LAB_ROOT
  ? path.resolve(process.env.QA_LAB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export const paths = (root = repoRoot) => ({
  root,
  env: path.join(root, '.env'),
  envExample: path.join(root, '.env.example'),
  snapshot: path.join(root, 'data', 'qa-lab-modules.snapshot.json'),
  labsDir: path.join(root, 'labs'),
  labsIndex: path.join(root, 'labs', 'index.json'),
  appLog: path.join(root, 'var', 'logs', 'app.log'),
  defectsDir: path.join(root, 'defects'),
})

/** 문서·출력에 쓰는 경로는 OS 와 무관하게 / 로 표기한다. */
export const toPosix = (p) => p.split(path.sep).join('/')
