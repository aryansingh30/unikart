import type { Config } from '@netlify/functions'
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { accounts, sessions } from '../../db/schema.js'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

const SESSION_DAYS = 7
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

type Institution = { code: string; id: string; name: string; domains: string[] }

const INSTITUTIONS: Institution[] = [
  { code: 'MNNIT', id: 'mnnit', name: 'Motilal Nehru National Institute of Technology', domains: ['mnnit.ac.in'] },
  { code: 'IIITA', id: 'iiita', name: 'Indian Institute of Information Technology', domains: ['iiita.ac.in'] },
  { code: 'IIT-BHU', id: 'iitbhu', name: 'Indian Institute of Technology (BHU)', domains: ['iitbhu.ac.in', 'itbhu.ac.in'] },
  { code: 'UOA', id: 'allduniv', name: 'University of Allahabad', domains: ['allduniv.ac.in'] },
]

function findInstitution(code: string): Institution | undefined {
  const c = code.trim().toUpperCase().replace(/[^A-Z]/g, '')
  return INSTITUTIONS.find(
    (i) => i.code.replace(/[^A-Z]/g, '') === c || i.id.toUpperCase() === c || (c === 'ALLDUNIV' && i.code === 'UOA'),
  )
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const ok = (data: unknown, message = 'OK', status = 200) =>
  Response.json({ success: true, message, data, timestamp: new Date().toISOString() }, { status })

const fail = (status: number, message: string) =>
  Response.json({ success: false, message, data: null, timestamp: new Date().toISOString() }, { status })

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, keyB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false
  const expected = Buffer.from(keyB64, 'base64')
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length)
  return timingSafeEqual(expected, actual)
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

async function createSession(accountId: string) {
  const token = randomBytes(32).toString('base64url')
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    accountId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  })
  return token
}

function bearer(req: Request) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : ''
}

async function requireAccount(req: Request) {
  const token = bearer(req)
  if (!token) throw new HttpError(401, 'Not signed in')
  const [row] = await db
    .select({ account: accounts })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)
  if (!row) throw new HttpError(401, 'Session expired. Please sign in again.')
  return row.account
}

function profile(a: typeof accounts.$inferSelect) {
  const inst = findInstitution(a.institutionCode)
  return {
    userId: a.id,
    email: a.email,
    fullName: a.fullName,
    role: a.role,
    designation: a.designation,
    status: a.status,
    institutionId: inst?.id,
    institutionName: inst?.name,
    institutionCode: inst?.code ?? a.institutionCode,
    walletBalance: 0,
    reservedBalance: 0,
    activeBorrowsCount: 0,
    unreadNotificationsCount: 0,
  }
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    throw new HttpError(400, 'Invalid request body')
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

async function register(req: Request) {
  const body = await readJson(req)
  const email = str(body.email).toLowerCase()
  const fullName = str(body.fullName)
  const password = typeof body.password === 'string' ? body.password : ''
  const institutionalId = str(body.institutionalId).toUpperCase()
  const phone = str(body.phone).replace(/\s/g, '')
  const designation = str(body.designation).toUpperCase() === 'FACULTY' ? 'FACULTY' : 'STUDENT'

  if (!email || !password || fullName.length < 2 || !institutionalId) {
    throw new HttpError(400, 'All mandatory registration fields must be provided')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address')
  if (!/^[6-9]\d{9}$/.test(phone)) throw new HttpError(400, 'Enter a valid 10-digit Indian mobile number')
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters long')

  const inst = findInstitution(str(body.institutionCode))
  if (!inst) throw new HttpError(400, 'Select a participating institution')
  if (!inst.domains.some((d) => email.endsWith(`@${d}`))) {
    throw new HttpError(400, `Email must belong to institution domain @${inst.domains[0]}`)
  }

  const [existingEmail] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, email)).limit(1)
  if (existingEmail) throw new HttpError(409, 'An account already exists with this email. Try signing in instead.')

  const [existingMember] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.institutionCode, inst.code), eq(accounts.institutionalId, institutionalId)))
    .limit(1)
  if (existingMember) throw new HttpError(409, `ID ${institutionalId} is already registered at ${inst.code}`)

  let created: typeof accounts.$inferSelect
  try {
    ;[created] = await db
      .insert(accounts)
      .values({
        email,
        fullName,
        phone,
        institutionCode: inst.code,
        institutionalId,
        designation,
        passwordHash: await hashPassword(password),
      })
      .returning()
  } catch (err: any) {
    // Two simultaneous submissions can race past the checks above
    if (err?.code === '23505' || err?.cause?.code === '23505') {
      throw new HttpError(409, 'An account already exists with these details. Try signing in instead.')
    }
    throw err
  }

  const token = await createSession(created.id)
  return ok(
    { token, tokenType: 'Bearer', requires2Fa: false, message: 'Registration successful', user: profile(created) },
    'Registration successful',
    201,
  )
}

async function login(req: Request) {
  const body = await readJson(req)
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) throw new HttpError(400, 'Email and password must be provided')

  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1)
  if (!account) throw new HttpError(401, 'Invalid email or password')

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    const minutes = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60000)
    throw new HttpError(423, `Account is temporarily locked. Please try again in ${minutes} minutes.`)
  }

  if (!(await verifyPassword(password, account.passwordHash))) {
    const attempts = account.failedLoginAttempts + 1
    await db
      .update(accounts)
      .set({
        failedLoginAttempts: attempts >= MAX_FAILED_ATTEMPTS ? 0 : attempts,
        lockedUntil: attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : account.lockedUntil,
      })
      .where(eq(accounts.id, account.id))
    throw new HttpError(401, 'Invalid email or password')
  }

  const [updated] = await db
    .update(accounts)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(accounts.id, account.id))
    .returning()

  const token = await createSession(account.id)
  return ok({ token, tokenType: 'Bearer', requires2Fa: false, message: 'Login successful', user: profile(updated) }, 'Login successful')
}

async function updateProfile(req: Request) {
  const account = await requireAccount(req)
  const body = await readJson(req)
  const fullName = str(body.fullName)
  const phone = str(body.phone).replace(/\s/g, '')
  const changes: Partial<typeof accounts.$inferInsert> = {}
  if (fullName.length >= 2) changes.fullName = fullName
  if (phone) {
    if (!/^[6-9]\d{9}$/.test(phone)) throw new HttpError(400, 'Enter a valid 10-digit Indian mobile number')
    changes.phone = phone
  }
  if (Object.keys(changes).length === 0) return ok(profile(account), 'No changes')
  const [updated] = await db.update(accounts).set(changes).where(eq(accounts.id, account.id)).returning()
  return ok(profile(updated), 'Profile updated')
}

async function logout(req: Request) {
  const token = bearer(req)
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)))
  return ok(null, 'Signed out')
}

export default async (req: Request) => {
  const action = new URL(req.url).pathname.replace(/\/+$/, '').split('/').pop()
  try {
    if (req.method === 'POST' && action === 'register') return await register(req)
    if (req.method === 'POST' && action === 'login') return await login(req)
    if (req.method === 'POST' && action === 'logout') return await logout(req)
    if (req.method === 'GET' && action === 'me') return ok(profile(await requireAccount(req)))
    if (req.method === 'PUT' && action === 'profile') return await updateProfile(req)
    if (req.method === 'POST' && action === 'verify-2fa') {
      return fail(400, 'Staff two-factor sign-in is not available on this deployment.')
    }
    return fail(404, 'Not found')
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.message)
    console.error('Auth function error', err)
    return fail(500, 'Something went wrong on our side. Please try again.')
  }
}

export const config: Config = {
  path: '/api/v1/auth/*',
}
