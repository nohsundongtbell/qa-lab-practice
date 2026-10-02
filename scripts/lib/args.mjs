export class UsageError extends Error {}

/**
 * 아주 작은 인자 해석기.
 * @param {string[]} argv
 * @param {{ string?: string[], boolean?: string[] }} spec 허용하는 플래그 (하이픈 없이)
 * @returns {{ _: string[], flags: Record<string, string | boolean> }}
 */
export function parseArgs(argv, spec = {}) {
  const strings = new Set(spec.string ?? [])
  const booleans = new Set(spec.boolean ?? [])
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const eq = arg.indexOf('=')
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq)
    if (booleans.has(name)) {
      if (eq !== -1) throw new UsageError(`--${name} 은(는) 값을 받지 않습니다.`)
      flags[name] = true
    } else if (strings.has(name)) {
      const value = eq !== -1 ? arg.slice(eq + 1) : argv[++i]
      if (value === undefined || value.startsWith('--')) throw new UsageError(`--${name} 뒤에 값이 필요합니다.`)
      flags[name] = value
    } else {
      throw new UsageError(`알 수 없는 옵션입니다: --${name}`)
    }
  }
  return { _: positional, flags }
}
