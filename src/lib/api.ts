import type { AppEnv } from './env'

export interface CompanyRef { code: string; name: string }

export interface Row {
  id: number
  applicant_id: string
  company: CompanyRef | null
  nama: string | null
  email: string
  hp: string | null
  gender: string | null
  tempat_lahir: string | null
  tgl_lahir: string | null
  umur: number | null
  agama: string | null
  etnis: string | null
  pendidikan: string | null
  jurusan: string | null
  nama_kampus: string | null
  status: number
  email_verified: boolean
  files_count: number
  created_at: string | null
}

export interface Detail extends Row {
  telp: string | null
  status_pernikahan: string | null
  golongan_darah: string | null
  ptkp: string | null
  nama_contact_darurat: string | null
  contact_darurat_1: string | null
  hubungan_1: string | null
  nama_contact_darurat_2: string | null
  contact_darurat_2: string | null
  hubungan_2: string | null
  jenis_identitas: string | null
  no_identitas: string | null
  alamat_identitas: string | null
  alamat_tinggal_sekarang: string | null
  updated_at: string | null
}

export interface FileItem { id: number; type: string | null; label: string; original_name: string; url: string | null; created_at: string | null }
export interface ListResponse {
  data: Row[]
  meta: { total: number; per_page: number; current_page: number; last_page: number; from: number | null; to: number | null }
}
export interface FacetItem { value: string; label: string; n: number }
export interface MetaResponse { companies: CompanyRef[]; unassigned: number; facets: Record<string, FacetItem[]> }
export interface CountItem { label: string; n: number }
export interface SummaryResponse {
  totals: { total: number; sent: number; verified: number; last7: number; unassigned: number }
  by_company: { code: string; name: string; total: number; sent: number }[]
  series: { date: string; n: number }[]
  distributions: Record<'etnis' | 'pendidikan' | 'gender' | 'agama' | 'status_pernikahan', CountItem[]>
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function request(env: AppEnv, path: string, params?: URLSearchParams): Promise<Response> {
  const url = `${env.API_BASE_URL.replace(/\/+$/, '')}/api/admin${path}${params ? `?${params.toString()}` : ''}`
  return fetch(url, {
    headers: { Authorization: `Bearer ${env.API_TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
}

async function getJson<T>(env: AppEnv, path: string, params?: URLSearchParams): Promise<T> {
  let res: Response
  try {
    res = await request(env, path, params)
  } catch {
    throw new ApiError(0, 'Server portal tidak dapat dihubungi (timeout atau koneksi terputus).')
  }
  if (res.status === 401) throw new ApiError(401, 'Token API ditolak oleh server portal. Periksa API_TOKEN dan ADMIN_API_TOKEN_HASH.')
  if (res.status === 404) throw new ApiError(404, 'Data tidak ditemukan atau rute API admin belum terpasang di Laravel.')
  if (!res.ok) throw new ApiError(res.status, `Server portal menjawab kesalahan ${res.status}.`)
  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError(502, 'Jawaban server portal bukan JSON. Periksa API_BASE_URL dan konfigurasi Nginx.')
  }
}

let metaCache: { at: number; key: string; value: MetaResponse } | null = null

/** Daftar perusahaan + pilihan filter. Di-cache singkat (60 dtk) per isolate. */
export async function getMeta(env: AppEnv): Promise<MetaResponse> {
  const key = env.API_BASE_URL
  if (metaCache && metaCache.key === key && Date.now() - metaCache.at < 60_000) return metaCache.value
  const value = await getJson<MetaResponse>(env, '/meta')
  metaCache = { at: Date.now(), key, value }
  return value
}

export const getSummary = (env: AppEnv) => getJson<SummaryResponse>(env, '/summary')
export const listApplicants = (env: AppEnv, params: URLSearchParams) => getJson<ListResponse>(env, '/applicants', params)
export const getApplicant = (env: AppEnv, id: number) => getJson<{ applicant: Detail; files: FileItem[] }>(env, `/applicants/${id}`)
export const exportApplicants = (env: AppEnv, params: URLSearchParams) => request(env, '/applicants/export', params)
