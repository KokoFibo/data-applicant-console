/// <reference path="../.astro/types.d.ts" />

interface KvLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface Env {
  ADMIN_EMAIL: string
  ADMIN_PASSWORD_HASH: string
  SESSION_SECRET: string
  API_BASE_URL: string
  API_TOKEN: string
  LOGIN_KV?: KvLike
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>

declare namespace App {
  interface Locals extends Runtime {
    user?: { email: string }
  }
}
