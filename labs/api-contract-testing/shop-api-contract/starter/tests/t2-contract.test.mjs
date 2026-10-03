// t2. 응답을 OpenAPI 명세와 대조하는 계약 테스트를 작성하세요.
// 직접 실행:  npx vitest run --root labs/api-contract-testing/shop-api-contract/work
import { describe, expect, it } from 'vitest'
import { call, expectMatchesSpec } from '../support/contract.mjs'

describe('상품 API 계약', () => {
  it('GET /api/products — 상품 목록이 명세와 일치한다 (예시)', async () => {
    const res = await call('GET', '/api/products')
    expect(res.status).toBe(200)
    expectMatchesSpec('GET', '/api/products', res)
  })

  // TODO: 다른 오퍼레이션도 같은 방식으로 추가하세요. 정상 응답뿐 아니라 오류 응답도 계약입니다.
})
