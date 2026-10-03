/**
 * 랩 준비 작업: 대상 앱의 Postgres 에 별도 스키마(qa_lab_data)를 만들고 이상치를 심은 데이터를 넣는다.
 * - 멱등: 같은 데이터가 이미 있으면 건너뛴다 (`npm run reset` 으로 DB 가 지워지면 다시 만든다)
 * - 대상 앱의 데이터(public 스키마)는 건드리지 않는다
 * - 읽기 전용 계정(qa_reader)을 만든다: SELECT 만 가능, 읽기 전용 트랜잭션, 실행 시간 5초 제한
 */
import pg from 'pg'
import { DATASET_VERSION, SEED, buildDataset } from './dataset.mjs'
import { READER, SCHEMA } from './db.mjs'

const DDL = `
CREATE TABLE members (id integer PRIMARY KEY, email text NOT NULL, name text NOT NULL, grade text NOT NULL, created_at timestamp NOT NULL);
CREATE TABLE products (id integer PRIMARY KEY, name text NOT NULL, price integer NOT NULL);
CREATE TABLE orders (id integer PRIMARY KEY, member_id integer NOT NULL, status text NOT NULL, subtotal integer NOT NULL,
  grade_discount integer NOT NULL, coupon_discount integer NOT NULL, shipping_fee integer NOT NULL, total_amount integer NOT NULL, created_at timestamp NOT NULL);
CREATE TABLE order_items (id integer PRIMARY KEY, order_id integer NOT NULL, product_id integer NOT NULL, unit_price integer NOT NULL, qty integer NOT NULL, line_total integer NOT NULL);
CREATE TABLE meta (key text PRIMARY KEY, value text NOT NULL);
`

async function insertAll(client, table, columns, rows) {
  for (const row of rows) {
    await client.query(`INSERT INTO ${SCHEMA}.${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`, columns.map((c) => row[c]))
  }
}

const url = process.env.QA_LAB_DB_URL
if (!url) {
  console.error('QA_LAB_DB_URL 이 없습니다. `npm run lab` 또는 `npm run check` 로 실행하세요.')
  process.exit(1)
}
const client = new pg.Client({ connectionString: url })
try {
  await client.connect()
} catch (e) {
  console.error(`DB 에 연결할 수 없습니다 (${e.code ?? e.message}). 먼저 \`npm run up\` 으로 대상 앱을 기동하세요.`)
  process.exit(1)
}

try {
  const data = buildDataset()
  const marker = `${SEED}:${DATASET_VERSION}`
  const exists = await client.query(`SELECT to_regclass('${SCHEMA}.meta') IS NOT NULL AS ok`)
  let current = null
  if (exists.rows[0].ok) current = (await client.query(`SELECT value FROM ${SCHEMA}.meta WHERE key = 'dataset'`)).rows[0]?.value
  if (current === marker) {
    console.log('  [준비] 랩 데이터가 이미 있습니다 (건너뜀)')
  } else {
    await client.query('BEGIN')
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE; CREATE SCHEMA ${SCHEMA}; SET LOCAL search_path = ${SCHEMA};`)
    await client.query(DDL)
    await insertAll(client, 'members', ['id', 'email', 'name', 'grade', 'created_at'], data.members)
    await insertAll(client, 'products', ['id', 'name', 'price'], data.products)
    await insertAll(client, 'orders', ['id', 'member_id', 'status', 'subtotal', 'grade_discount', 'coupon_discount', 'shipping_fee', 'total_amount', 'created_at'], data.orders)
    await insertAll(client, 'order_items', ['id', 'order_id', 'product_id', 'unit_price', 'qty', 'line_total'], data.orderItems)
    await client.query(`INSERT INTO ${SCHEMA}.meta (key, value) VALUES ('dataset', $1)`, [marker])
    await client.query('COMMIT')
    console.log(`  [준비] 랩 데이터를 만들었습니다 (회원 ${data.members.length}, 주문 ${data.orders.length}, 품목 ${data.orderItems.length})`)
  }

  // 읽기 전용 계정: 이 랩 스키마만 읽을 수 있다 (대상 앱의 테이블에는 권한이 없다). 로컬 전용 DB 의 고정 비밀번호다.
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${READER.user}') THEN
        CREATE ROLE ${READER.user} LOGIN PASSWORD '${READER.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
    END $$;
    ALTER ROLE ${READER.user} SET default_transaction_read_only = on;
    ALTER ROLE ${READER.user} SET statement_timeout = '5s';
    ALTER ROLE ${READER.user} SET search_path = ${SCHEMA};
    GRANT CONNECT ON DATABASE ${new URL(url).pathname.slice(1)} TO ${READER.user};
    GRANT USAGE ON SCHEMA ${SCHEMA} TO ${READER.user};
    GRANT SELECT ON ALL TABLES IN SCHEMA ${SCHEMA} TO ${READER.user};
  `)
  console.log(`  [준비] 읽기 전용 계정: ${READER.user} (비밀번호 ${READER.password}), 스키마 ${SCHEMA}`)
} catch (e) {
  await client.query('ROLLBACK').catch(() => {})
  console.error(`랩 데이터 준비에 실패했습니다: ${e.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
