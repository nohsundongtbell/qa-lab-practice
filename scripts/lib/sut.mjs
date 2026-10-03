/** 실행 중인 대상 앱(SUT)의 상태를 확인한다. 실패하면 null. */
export async function probeSut(baseUrl, { fetchImpl = fetch, timeoutMs = 2000 } = {}) {
  const get = async (path) => {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(new URL(path, baseUrl), { signal: ctl.signal })
      return res.ok ? await res.json() : null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
  const health = await get('/health')
  if (!health) return null
  const defects = await get('/__admin/defects')
  return { profile: defects?.profile ?? null }
}

export const baseUrlFrom = (env) => `http://127.0.0.1:${env.API_PORT ?? 3000}`

/** 대상 앱의 DB 접속 문자열 (로컬 전용, compose 의 고정 계정). 랩의 setup·채점 스크립트가 QA_LAB_DB_URL 로 받는다. */
export const dbUrlFrom = (env) => `postgres://shop:shop@127.0.0.1:${env.DB_PORT ?? 55432}/shop`
