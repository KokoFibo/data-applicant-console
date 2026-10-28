// Login satu pengguna (tanpa registrasi) memakai Web Crypto, tanpa pustaka tambahan.
const enc = new TextEncoder()
const dec = new TextDecoder()

export const SESSION_COOKIE = 'admin_session'
export const SESSION_TTL = 8 * 60 * 60 // 8 jam

export function b64u(bytes: Uint8Array): string {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64u(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Perbandingan waktu-tetap */
export function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

export async function hashPassword(password: string, iterations = 100000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2-sha256$${iterations}$${b64u(salt)}$${b64u(await pbkdf2(password, salt, iterations))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterText, saltText, hashText] = (stored || '').split('$')
    const iterations = parseInt(iterText, 10)
    if (scheme !== 'pbkdf2-sha256' || !saltText || !hashText) return false
    if (!(iterations >= 10000 && iterations <= 100000)) return false
    const derived = await pbkdf2(password, fromB64u(saltText), iterations)
    return safeEqual(derived, fromB64u(hashText))
  } catch {
    return false
  }
}

// Hash palsu dengan format valid: dipakai agar waktu respons sama saat email salah.
export const DUMMY_HASH = `pbkdf2-sha256$100000$${'A'.repeat(22)}$${'A'.repeat(43)}`

export function sameText(a: string, b: string): boolean {
  return safeEqual(enc.encode(a.trim().toLowerCase()), enc.encode(b.trim().toLowerCase()))
}

// ---- Sesi: token bertanda tangan HMAC dalam cookie HttpOnly ----
export interface Session {
  sub: string
  iat: number
  exp: number
}

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

export async function createSession(secret: string, sub: string, ttl = SESSION_TTL): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = b64u(enc.encode(JSON.stringify({ sub, iat: now, exp: now + ttl } satisfies Session)))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload)))
  return `${payload}.${b64u(sig)}`
}

export async function readSession(secret: string, token: string | undefined): Promise<Session | null> {
  try {
    if (!token) return null
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64u(sig), enc.encode(payload))
    if (!valid) return null
    const session = JSON.parse(dec.decode(fromB64u(payload))) as Session
    if (typeof session.exp !== 'number' || session.exp < Date.now() / 1000) return null
    return session
  } catch {
    return null
  }
}

// ---- Pembatas percobaan login (opsional, butuh KV bernama LOGIN_KV) ----
const MAX_FAILS = 5
const LOCK_SECONDS = 15 * 60

export async function lockRemaining(kv: KvLike | undefined, ip: string): Promise<number> {
  if (!kv) return 0
  const count = parseInt((await kv.get(`login-fail:${ip}`)) ?? '0', 10)
  return count >= MAX_FAILS ? LOCK_SECONDS : 0
}

export async function recordFailure(kv: KvLike | undefined, ip: string): Promise<void> {
  if (!kv) return
  const count = parseInt((await kv.get(`login-fail:${ip}`)) ?? '0', 10)
  await kv.put(`login-fail:${ip}`, String(count + 1), { expirationTtl: LOCK_SECONDS })
}

export async function clearFailures(kv: KvLike | undefined, ip: string): Promise<void> {
  if (kv) await kv.delete(`login-fail:${ip}`)
}

/** Hanya path internal yang boleh dijadikan tujuan setelah login. */
export function safeNext(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/'
}
