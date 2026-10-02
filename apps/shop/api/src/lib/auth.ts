import { randomBytes } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import type { Db } from '../db/pool.js'
import { ApiError } from './errors.js'

export interface AuthMember {
  id: number
  email: string
  name: string
  zipcode: string
  address: string
  role: 'CUSTOMER' | 'ADMIN'
  totalSpent: number
}

declare module 'fastify' {
  interface FastifyRequest {
    member?: AuthMember
  }
}

export function newToken(): string {
  return randomBytes(24).toString('hex')
}

export async function authenticate(db: Db, req: FastifyRequest): Promise<AuthMember> {
  const header = req.headers.authorization ?? ''
  const match = /^Bearer\s+(\S+)$/i.exec(header)
  if (!match) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.')
  const r = await db.query(
    `SELECT m.id, m.email, m.name, m.zipcode, m.address, m.role, m.total_spent
       FROM auth_tokens t JOIN members m ON m.id = t.member_id WHERE t.token = $1`,
    [match[1]],
  )
  if (r.rowCount === 0) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.')
  const row = r.rows[0]
  const member: AuthMember = {
    id: row.id, email: row.email, name: row.name, zipcode: row.zipcode.trim(), address: row.address,
    role: row.role, totalSpent: row.total_spent,
  }
  req.member = member
  return member
}

export async function requireAdmin(db: Db, req: FastifyRequest): Promise<AuthMember> {
  const member = await authenticate(db, req)
  if (member.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', '관리자만 할 수 있습니다.')
  return member
}
