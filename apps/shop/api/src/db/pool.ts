import pg from 'pg'

// BIGINT(int8)를 number 로 읽는다. 이 앱의 금액은 Number.MAX_SAFE_INTEGER 를 넘지 않는다.
pg.types.setTypeParser(20, (v) => Number(v))
// DATE 는 문자열(YYYY-MM-DD) 그대로 쓴다. (시간대 변환으로 날짜가 밀리는 것을 막는다)
pg.types.setTypeParser(1082, (v) => v)

export type Db = pg.Pool

export function createPool(connectionString: string): Db {
  return new pg.Pool({ connectionString, max: 10 })
}

export async function withTransaction<T>(db: Db, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
