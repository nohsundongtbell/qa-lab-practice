import { paths } from '../lib/paths.mjs'
import { formatErrors, validateRepo } from '../lib/validate.mjs'

export async function run() {
  const { root } = paths()
  const { errors, labCount } = validateRepo(root)
  if (errors.length) {
    console.error(formatErrors(errors))
    console.error(`\n검증 실패: 오류 ${errors.length}건 (랩 ${labCount}개 검사)`)
    return 1
  }
  console.log(`검증 통과 (랩 ${labCount}개 검사)`)
  return 0
}
