import fs from 'node:fs'

/** .env 텍스트를 { KEY: value } 로 읽는다 (주석·빈 줄 무시). */
export function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

/** 다른 줄은 그대로 두고 KEY=value 한 줄만 바꾼다 (없으면 끝에 추가). */
export function setEnvVar(text, key, value) {
  const lines = text.split(/\r?\n/)
  const re = new RegExp(`^\\s*${key}\\s*=`)
  let found = false
  const next = lines.map((line) => {
    if (!found && re.test(line) && !line.trim().startsWith('#')) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) {
    if (next.length && next[next.length - 1] === '') next.splice(next.length - 1, 0, `${key}=${value}`)
    else next.push(`${key}=${value}`, '')
  }
  return next.join('\n')
}

export function readEnvFile(file) {
  try {
    return parseEnv(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

/** .env 가 없으면 .env.example 을 복사해 만든다. 새로 만들었으면 true. */
export function ensureEnvFile({ env, envExample }) {
  if (fs.existsSync(env)) return false
  fs.copyFileSync(envExample, env)
  return true
}
