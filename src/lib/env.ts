/**
 * Satu-satunya tempat yang membaca environment Cloudflare.
 * Adapter v12 (Pages): Astro.locals.runtime.env
 * Jika nanti pindah ke Workers (adapter v13): ganti isi fungsi ini dengan
 *   import { env } from 'cloudflare:workers'; return env as unknown as AppEnv
 */
export type AppEnv = Env

const REQUIRED = ['ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET', 'API_BASE_URL', 'API_TOKEN'] as const

export function getEnv(locals: unknown): AppEnv {
  const runtime = (locals as { runtime?: { env?: unknown } }).runtime
  return (runtime?.env ?? {}) as AppEnv
}

export function missingEnv(env: Partial<AppEnv>): string[] {
  return REQUIRED.filter((key) => !env[key])
}
