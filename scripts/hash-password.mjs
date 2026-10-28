// Membuat hash password untuk ADMIN_PASSWORD_HASH.
//   npm run hash-password -- "password-anda"
// Format: pbkdf2-sha256$<iterasi>$<salt>$<hash>  (100.000 iterasi = batas maksimum di Cloudflare Workers)
import { webcrypto as crypto } from 'node:crypto'

const password = process.argv[2]
if (!password || password.length < 12) {
  console.error('Gunakan password minimal 12 karakter:\n  npm run hash-password -- "password-anda"')
  process.exit(1)
}

const b64u = (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const iterations = 100000
const salt = crypto.getRandomValues(new Uint8Array(16))
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)

console.log(`pbkdf2-sha256$${iterations}$${b64u(salt)}$${b64u(new Uint8Array(bits))}`)
