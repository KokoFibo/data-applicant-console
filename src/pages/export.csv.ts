import type { APIRoute } from 'astro'
import { getEnv } from '../lib/env'
import { exportApplicants } from '../lib/api'
import { readFilters, toApiParams } from '../lib/filters'

// Mengekspor pelamar sesuai filter aktif. Dijaga oleh middleware (harus login).
export const GET: APIRoute = async ({ url, locals }) => {
  const env = getEnv(locals)
  let upstream: Response
  try {
    upstream = await exportApplicants(env, toApiParams(readFilters(url)))
  } catch {
    return new Response('Server portal tidak dapat dihubungi.', { status: 502 })
  }
  if (!upstream.ok || !upstream.body) {
    return new Response(`Ekspor gagal (kode ${upstream.status}).`, { status: 502 })
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': upstream.headers.get('Content-Disposition') ?? 'attachment; filename="pelamar.csv"',
    },
  })
}
