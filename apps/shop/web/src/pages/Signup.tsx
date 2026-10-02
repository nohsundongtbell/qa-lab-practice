import { useState } from 'react'
import { api, ApiError } from '../api'

export function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', zipcode: '', address: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api('POST', '/api/members', form)
      setErrors({})
      setMessage('가입되었습니다. 로그인해 주세요.')
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors((err.body.details?.fields as Record<string, string>) ?? {})
        setMessage(err.message)
      }
    }
  }

  const field = (k: keyof typeof form, label: string, type = 'text') => (
    <label>
      {label}
      <input type={type} value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `${k}-error` : undefined} />
      {errors[k] && <span id={`${k}-error`} className="error">{errors[k]}</span>}
    </label>
  )

  return (
    <section>
      <h1>회원 가입</h1>
      <form onSubmit={submit} className="form" noValidate>
        {field('name', '이름')}
        {field('email', '이메일', 'email')}
        {field('password', '비밀번호', 'password')}
        {field('zipcode', '우편번호')}
        {field('address', '주소')}
        <button type="submit" className="primary">가입하기</button>
        <p role="status" aria-live="polite">{message}</p>
      </form>
    </section>
  )
}
