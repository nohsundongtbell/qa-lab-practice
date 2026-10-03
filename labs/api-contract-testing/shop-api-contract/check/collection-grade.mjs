import path from 'node:path'
import { attribute, labDefectIds, resetSut } from './api-lab.mjs'
import { CollectionError, readCollection, runCollection } from '../../../../scripts/lib/newman-runner.mjs'

/**
 * 학습자의 컬렉션이 "유효"한지 본다: 결함 없는 버전(none)에서 검증이 모두 통과해야 한다.
 * 실패한 검증은 이름만 알려 준다 — 메시지에는 앱의 실제 값이 들어 있어 정답을 알려 주게 되기 때문이다.
 * @returns {Promise<{ ok: true, collection: object, none: object } | { ok: false, result: object }>}
 */
export async function validateCollection(ctx) {
  let collection
  try {
    collection = readCollection(path.join(ctx.workDir, 'collection.json'))
  } catch (err) {
    if (err instanceof CollectionError) return { ok: false, result: { passed: false, message: err.message } }
    throw err
  }
  await resetSut(ctx.baseUrl)
  let none
  try {
    none = await runCollection({ collection, baseUrl: ctx.baseUrl, defects: 'none' })
  } catch (err) {
    if (err instanceof CollectionError) return { ok: false, result: { passed: false, message: err.message } }
    throw err
  }
  if (none.requests === 0) return { ok: false, result: { passed: false, message: '실행된 요청이 없습니다', hints: ['컬렉션에 요청(Request)을 추가하고 URL 은 {{baseUrl}}/api/... 로 쓰세요.'] } }
  if (none.assertions === 0) {
    return { ok: false, result: { passed: false, message: '검증(pm.test)이 하나도 없습니다', hints: ['요청마다 Tests 탭에 pm.test("…", () => { pm.expect(…) }) 로 응답을 검증하세요.'] } }
  }
  if (none.failures.length > 0) {
    const names = [...new Set(none.failures.map((f) => `${f.request} › ${f.name}`))]
    return {
      ok: false,
      result: {
        passed: false,
        message: `결함이 없는 버전에서도 실패하는 검증이 ${names.length}개 있습니다`,
        details: names.slice(0, 8),
        hints: ['결함 없는 앱에서 실패하는 검증은 기대값이 사양과 다르거나, 요청 순서(로그인 → 토큰 저장 → 호출)가 잘못된 것입니다. 사양서(apps/shop/SPEC.md)와 API 문서(http://127.0.0.1:3000/docs)를 다시 확인하세요.'],
      },
    }
  }
  return { ok: true, collection, none }
}

/** 결함을 하나씩 켜서 이 컬렉션이 잡는 결함을 모은다. */
export async function detectWithCollection(ctx, collection, onDetect) {
  return attribute(
    labDefectIds(ctx),
    async (defects) => {
      await resetSut(ctx.baseUrl)
      return (await runCollection({ collection, baseUrl: ctx.baseUrl, defects })).failures.length > 0
    },
    onDetect,
  )
}
