import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { decodeText, parseCsv, readCsvTable } from './csv.mjs'

const cells = (text) => parseCsv(text).map((r) => r.cells)

describe('parseCsv', () => {
  it('기본 행과 CRLF', () => {
    expect(cells('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('따옴표 안의 쉼표·줄바꿈·이스케이프', () => {
    expect(cells('name,v\n"쉼표, 포함","줄\n바꿈"\n"따옴표 ""안""",3\n')).toEqual([['name', 'v'], ['쉼표, 포함', '줄\n바꿈'], ['따옴표 "안"', '3']])
  })

  it('빈 줄은 버리고, 행마다 시작 줄 번호를 기록한다', () => {
    const rows = parseCsv('h\n\n"여러\n줄"\nx\n')
    expect(rows.map((r) => [r.line, r.cells[0]])).toEqual([[1, 'h'], [3, '여러\n줄'], [5, 'x']])
  })

  it('마지막 줄에 줄바꿈이 없어도 읽는다', () => {
    expect(cells('a\n1')).toEqual([['a'], ['1']])
  })

  it('닫히지 않은 따옴표는 오류', () => {
    expect(() => parseCsv('a\n"열림\n')).toThrow(/닫히지 않았습니다/)
  })
})

describe('decodeText', () => {
  it('UTF-8 BOM 을 벗긴다', () => {
    expect(decodeText(Buffer.from('﻿등급', 'utf8'))).toEqual({ text: '등급', encoding: 'utf-8' })
  })

  it('UTF-8 이 아니면 CP949(EUC-KR) 로 읽는다 (Windows Excel 저장본)', () => {
    const cp949 = Buffer.from([0xb5, 0xee, 0xb1, 0xde]) // "등급"
    expect(decodeText(cp949)).toEqual({ text: '등급', encoding: 'cp949' })
  })
})

describe('readCsvTable', () => {
  const write = (content) => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qa-csv-')), 't.csv')
    fs.writeFileSync(file, content)
    return file
  }

  it('머리글로 객체를 만들고 공백을 다듬는다', () => {
    const r = readCsvTable(write('name, value\n 가 , 1 \n'), ['name', 'value'])
    expect(r.errors).toEqual([])
    expect(r.rows).toEqual([{ _line: 2, name: '가', value: '1' }])
  })

  it('필요한 열이 없으면 오류', () => {
    expect(readCsvTable(write('name\n가\n'), ['name', 'value']).errors[0]).toMatch(/열이 없습니다: value/)
  })

  it('값에 따옴표 없는 쉼표가 있으면 알려 준다', () => {
    expect(readCsvTable(write('name,value\n가,1,2\n'), ['name', 'value']).errors[0]).toMatch(/큰따옴표/)
  })

  it('파일이 없으면 오류', () => {
    expect(readCsvTable('/no/such.csv', ['a']).errors[0]).toMatch(/파일이 없습니다/)
  })
})
