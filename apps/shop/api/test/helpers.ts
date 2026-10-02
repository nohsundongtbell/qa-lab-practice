import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requestContext } from '../src/context.js'

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
export const defectsDir = path.join(repoRoot, 'defects')

/** 지정한 결함만 켠 문맥에서 fn 을 실행한다. */
export function withDefects<T>(ids: string[], fn: () => T): T {
  return requestContext.run({ defects: new Set(ids) }, fn)
}
