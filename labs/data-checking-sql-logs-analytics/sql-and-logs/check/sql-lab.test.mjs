import { describe, expect, it } from 'vitest'
import { compareRows, normalizeCell, prepareSql, taskSpecs } from './sql-lab.mjs'

describe('prepareSql', () => {
  it('주석을 떼고 SELECT 하나만 받는다 (끝의 ; 허용)', () => {
    expect(prepareSql('-- 설명\nSELECT 1; -- 끝\n').sql).toBe('SELECT 1')
    expect(prepareSql('/* 여러\n줄 */ select 1').sql).toBe('select 1')
    expect(prepareSql('WITH a AS (SELECT 1) SELECT * FROM a;').sql).toBe('WITH a AS (SELECT 1) SELECT * FROM a')
  })

  it('따옴표 안의 ; 와 -- 는 문장 구분·주석으로 보지 않는다', () => {
    expect(prepareSql("SELECT ';' AS a, '--x' AS b").sql).toBe("SELECT ';' AS a, '--x' AS b")
    expect(prepareSql("SELECT 'it''s; ok'").sql).toBe("SELECT 'it''s; ok'")
    expect(prepareSql('SELECT "a;b" FROM t').sql).toBe('SELECT "a;b" FROM t')
  })

  it('여러 문장, 데이터 변경·DDL, 빈 SQL, 닫히지 않은 따옴표·주석은 오류', () => {
    expect(prepareSql('SELECT 1; SELECT 2').error).toMatch(/문장이 2개/)
    for (const sql of ['DELETE FROM orders', 'UPDATE orders SET status = 1', 'DROP TABLE orders', 'INSERT INTO t VALUES (1)', 'SET default_transaction_read_only = off']) {
      expect(prepareSql(sql).error, sql).toMatch(/SELECT/)
    }
    expect(prepareSql('SELECT 1; DROP TABLE orders').error).toMatch(/문장이 2개/)
    expect(prepareSql('-- 주석만\n').error).toMatch(/비어 있습니다/)
    expect(prepareSql("SELECT 'abc").error).toMatch(/따옴표/)
    expect(prepareSql('SELECT 1 /* 열림').error).toMatch(/주석/)
  })

  it('SELECT 로 시작해 보이는 이름은 통과시키지 않는다 (selected_rows 같은 식별자 방지)', () => {
    expect(prepareSql('selection_of(1)').error).toBeTruthy()
  })
})

describe('normalizeCell', () => {
  it('숫자·문자열·null·불리언을 같은 기준으로 바꾼다', () => {
    expect(normalizeCell(5)).toBe('5')
    expect(normalizeCell(1234.5678)).toBe('1234.57')
    expect(normalizeCell(' DELIVERED ')).toBe('DELIVERED')
    expect(normalizeCell(null)).toBe('NULL')
    expect(normalizeCell(true)).toBe('true')
  })
})

describe('compareRows', () => {
  const expected = [['PAID', 3], ['SHIPPED', 3], ['DELIVERED', 8]]
  it('순서와 상관없이 같은 행이면 일치', () => {
    expect(compareRows([['DELIVERED', 8], ['PAID', 3], ['SHIPPED', 3]], expected)).toEqual({ correct: 3, missing: 0, extra: 0, columnMismatch: false })
  })
  it('빠진 행과 많은 행을 센다 (같은 행의 중복도 센다)', () => {
    expect(compareRows([['PAID', 3], ['PAID', 3], ['X', 1]], expected)).toMatchObject({ correct: 1, missing: 2, extra: 2 })
  })
  it('열 개수가 다르면 따로 알린다', () => {
    expect(compareRows([['PAID', 3, 'x']], expected)).toMatchObject({ columnMismatch: true, expectedWidth: 2 })
  })
  it('firstColumnOnly 는 첫 열만 비교하고 나머지 열은 허용한다', () => {
    expect(compareRows([[1, 'a'], [2, 'b']], [[1], [2]], { firstColumnOnly: true })).toMatchObject({ correct: 2, missing: 0, extra: 0 })
  })
  it('빈 결과', () => {
    expect(compareRows([], [[1]], { firstColumnOnly: true })).toMatchObject({ correct: 0, missing: 1, extra: 0 })
  })
  it('숫자 5 와 문자열 "5" 는 같다 (열 타입은 따지지 않는다)', () => {
    expect(compareRows([['x', '5']], [['x', 5]])).toMatchObject({ correct: 1 })
  })
})

describe('taskSpecs (정답)', () => {
  const specs = taskSpecs()
  it('과제별 쿼리 수와 정답 개수', () => {
    expect(specs.t1.map((s) => s.file)).toEqual(['q1-status-count.sql', 'q2-monthly-revenue.sql', 'q3-top-members.sql'])
    expect(specs.t2.map((s) => [s.file, s.expected.length])).toEqual([['q4-orphan-items.sql', 6], ['q5-duplicate-orders.sql', 5], ['q6-total-mismatch.sql', 8], ['q7-duplicate-members.sql', 3]])
  })
  it('t1 정답: 상태 5종, 월 3개 이상, 상위 3명', () => {
    expect(specs.t1[0].expected).toHaveLength(5)
    expect(specs.t1[1].expected.length).toBeGreaterThanOrEqual(3)
    expect(specs.t1[2].expected).toHaveLength(3)
  })
})
