import { useState } from 'react'
import { api, ApiError, auth } from '../api'

export function LoginPage({ onLogin }: { onLogin: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { token } = await api<{ token: string }>('POST', '/api/auth/login', { email, password })
      auth.set(token)
      await onLogin()
      location.hash = '/products'
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : '로그인하지 못했습니다.')
    }
  }

  return (
    <section>
      <h1>로그인</h1>
      <form onSubmit={submit} className="form">
        <label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <button type="submit" className="primary">로그인</button>
        <p role="alert">{message}</p>
      </form>
    </section>
  )
}
