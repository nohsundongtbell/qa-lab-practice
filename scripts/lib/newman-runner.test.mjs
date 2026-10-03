import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CollectionError, readCollection, withDefectHeader } from './newman-runner.mjs'

const collection = () => ({
  info: { name: 't', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  item: [
    { name: 'a', request: { method: 'GET', url: '{{baseUrl}}/a', header: [{ key: 'x-qa-lab-defects', value: 'DF-001' }, { key: 'Accept', value: '*/*' }] } },
    { name: '폴더', item: [{ name: 'b', request: { method: 'GET', url: '{{baseUrl}}/b' } }, { name: 'c', request: '{{baseUrl}}/c' }] },
  ],
})
const headerOf = (it) => it.request.header.filter((h) => h.key.toLowerCase() === 'x-qa-lab-defects')

describe('withDefectHeader', () => {
  it('폴더 안까지 모든 요청에 채점기의 결함 헤더를 넣는다', () => {
    const copy = withDefectHeader(collection(), 'DF-013,DF-014')
    const all = [copy.item[0], ...copy.item[1].item]
    for (const it of all) expect(headerOf(it)).toEqual([{ key: 'X-QA-Lab-Defects', value: 'DF-013,DF-014' }])
  })

  it('학습자가 붙인 같은 헤더는 채점기 값으로 덮고, 다른 헤더는 남긴다', () => {
    const copy = withDefectHeader(collection(), 'none')
    expect(headerOf(copy.item[0])).toHaveLength(1)
    expect(headerOf(copy.item[0])[0].value).toBe('none')
    expect(copy.item[0].request.header.some((h) => h.key === 'Accept')).toBe(true)
  })

  it('문자열 요청(URL만 적은 형식)도 객체로 바꿔 헤더를 넣는다', () => {
    const copy = withDefectHeader(collection(), 'none')
    expect(copy.item[1].item[1].request).toMatchObject({ method: 'GET', url: '{{baseUrl}}/c' })
    expect(headerOf(copy.item[1].item[1])).toHaveLength(1)
  })

  it('원본은 바꾸지 않는다', () => {
    const original = collection()
    withDefectHeader(original, 'DF-013')
    expect(original).toEqual(collection())
  })
})

describe('readCollection', () => {
  const tmp = (content) => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qa-lab-col-')), 'collection.json')
    if (content !== undefined) fs.writeFileSync(file, content)
    return file
  }

  it('없는 파일, 깨진 JSON, 컬렉션이 아닌 JSON 은 한국어 오류로 알린다', () => {
    expect(() => readCollection(tmp())).toThrow(/collection\.json 이 없습니다/)
    expect(() => readCollection(tmp('{ nope'))).toThrow(/올바른 JSON 이 아닙니다/)
    expect(() => readCollection(tmp('{"hello": 1}'))).toThrow(CollectionError)
    expect(() => readCollection(tmp('{"hello": 1}'))).toThrow(/컬렉션 형식/)
  })

  it('올바른 컬렉션은 읽는다', () => {
    expect(readCollection(tmp(JSON.stringify(collection()))).info.name).toBe('t')
  })
})
