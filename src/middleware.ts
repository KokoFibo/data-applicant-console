import { defineMiddleware } from 'astro:middleware'
import { getEnv, missingEnv } from './lib/env'
import { readSession, SESSION_COOKIE } from './lib/auth'

const PUBLIC_PATHS = new Set(['/login'])

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https:", // foto dokumen dibuka dari S3 lewat tautan bertanda tangan
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ')

function secure(response: Response, isHttps: boolean): Response {
  const res = new Response(response.body, response) // salinan agar header bisa diubah
  res.headers.set('Cache-Control', 'no-store') // data pribadi: jangan pernah disimpan cache
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('Content-Security-Policy', CSP)
  if (isHttps) res.headers.set('Strict-Transport-Security', 'max-age=31536000')
  return res
}

export const onRequest = defineMiddleware(async (context, next) => {
  const isHttps = context.url.protocol === 'https:'
  const env = getEnv(context.locals)

  const missing = missingEnv(env)
  if (missing.length) {
    return secure(
      new Response(`Konfigurasi belum lengkap. Variabel yang belum diisi: ${missing.join(', ')}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
      isHttps
    )
  }

  const session = await readSession(env.SESSION_SECRET, context.cookies.get(SESSION_COOKIE)?.value)
  if (session) context.locals.user = { email: session.sub }

  if (!session && !PUBLIC_PATHS.has(context.url.pathname)) {
    if (context.request.method === 'GET' || context.request.method === 'HEAD') {
      const next = encodeURIComponent(context.url.pathname + context.url.search)
      return secure(context.redirect(`/login?next=${next}`, 302), isHttps)
    }
    return secure(new Response('Unauthorized', { status: 401 }), isHttps)
  }

  return secure(await next(), isHttps)
})
