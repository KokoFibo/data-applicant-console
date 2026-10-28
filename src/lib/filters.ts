// Membaca/menulis filter daftar pelamar dari URL. Satu sumber kebenaran untuk halaman, tautan, dan API.
export const MULTI_KEYS = ['company', 'gender', 'agama', 'etnis', 'pendidikan', 'status_pernikahan', 'golongan_darah', 'ptkp'] as const
export type MultiKey = (typeof MULTI_KEYS)[number]

export const SORTS: Record<string, string> = {
  created_at: 'Terbaru mendaftar',
  nama: 'Nama',
  company: 'Perusahaan',
  tgl_lahir: 'Tanggal lahir',
  etnis: 'Etnis',
  pendidikan: 'Pendidikan',
  status: 'Status',
}
export const PER_PAGE = [10, 25, 50, 100]

export interface Filters {
  multi: Record<MultiKey, string[]>
  q: string
  status: '' | 'sent' | 'draft'
  verified: '' | 'yes' | 'no'
  min_age: string
  max_age: string
  from: string
  to: string
  sort: string
  dir: 'asc' | 'desc'
  per_page: number
  page: number
}

const clean = (values: string[]): string[] =>
  [...new Set(values.map((v) => v.trim()).filter((v) => v !== '' && v.length <= 60))].slice(0, 30)

const digits = (v: string | null): string => (v && /^\d{1,3}$/.test(v.trim()) ? v.trim() : '')
const day = (v: string | null): string => (v && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : '')

export function emptyFilters(): Filters {
  const multi = {} as Record<MultiKey, string[]>
  for (const key of MULTI_KEYS) multi[key] = []
  return { multi, q: '', status: '', verified: '', min_age: '', max_age: '', from: '', to: '', sort: 'created_at', dir: 'desc', per_page: 25, page: 1 }
}

export function readFilters(source: URL | URLSearchParams): Filters {
  const params = source instanceof URL ? source.searchParams : source
  const f = emptyFilters()

  for (const key of MULTI_KEYS) {
    f.multi[key] = clean([...params.getAll(key), ...params.getAll(`${key}[]`)])
  }
  f.q = (params.get('q') ?? '').trim().slice(0, 100)
  const status = params.get('status')
  f.status = status === 'sent' || status === 'draft' ? status : ''
  const verified = params.get('verified')
  f.verified = verified === 'yes' || verified === 'no' ? verified : ''
  f.min_age = digits(params.get('min_age'))
  f.max_age = digits(params.get('max_age'))
  f.from = day(params.get('from'))
  f.to = day(params.get('to'))

  const sort = params.get('sort') ?? ''
  f.sort = sort in SORTS ? sort : 'created_at'
  f.dir = params.get('dir') === 'asc' ? 'asc' : 'desc'
  const per = parseInt(params.get('per_page') ?? '', 10)
  f.per_page = PER_PAGE.includes(per) ? per : 25
  const page = parseInt(params.get('page') ?? '', 10)
  f.page = Number.isFinite(page) && page > 0 ? Math.min(page, 100000) : 1
  return f
}

/** Parameter untuk API Laravel (array memakai key[]). */
export function toApiParams(f: Filters, overrides: Partial<Pick<Filters, 'page' | 'per_page'>> = {}): URLSearchParams {
  const p = new URLSearchParams()
  for (const key of MULTI_KEYS) for (const v of f.multi[key]) p.append(`${key}[]`, v)
  for (const key of ['q', 'status', 'verified', 'min_age', 'max_age', 'from', 'to'] as const) {
    if (f[key]) p.set(key, f[key])
  }
  p.set('sort', f.sort)
  p.set('dir', f.dir)
  p.set('per_page', String(overrides.per_page ?? f.per_page))
  p.set('page', String(overrides.page ?? f.page))
  return p
}

/** Query string untuk tautan di aplikasi ini (nilai default tidak ditulis). */
export function toQuery(f: Filters): string {
  const p = new URLSearchParams()
  for (const key of MULTI_KEYS) for (const v of f.multi[key]) p.append(key, v)
  for (const key of ['q', 'status', 'verified', 'min_age', 'max_age', 'from', 'to'] as const) {
    if (f[key]) p.set(key, f[key])
  }
  if (f.sort !== 'created_at') p.set('sort', f.sort)
  if (f.dir !== 'desc') p.set('dir', f.dir)
  if (f.per_page !== 25) p.set('per_page', String(f.per_page))
  if (f.page > 1) p.set('page', String(f.page))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function patch(f: Filters, changes: Partial<Omit<Filters, 'multi'>> & { multi?: Partial<Record<MultiKey, string[]>> }): Filters {
  const { multi, ...rest } = changes
  const next: Filters = { ...f, ...rest, multi: { ...f.multi, ...(multi ?? {}) } as Record<MultiKey, string[]> }
  if (!('page' in changes)) next.page = 1 // mengubah filter selalu kembali ke halaman 1
  return next
}

export function activeCount(f: Filters): number {
  let n = MULTI_KEYS.reduce((sum, k) => sum + f.multi[k].length, 0)
  for (const key of ['q', 'status', 'verified', 'min_age', 'max_age', 'from', 'to'] as const) if (f[key]) n++
  return n
}

export interface Chip {
  group: string
  label: string
  remove: Filters
}

export const GROUP_LABEL: Record<MultiKey, string> = {
  company: 'Perusahaan',
  gender: 'Jenis kelamin',
  agama: 'Agama',
  etnis: 'Etnis',
  pendidikan: 'Pendidikan',
  status_pernikahan: 'Status pernikahan',
  golongan_darah: 'Gol. darah',
  ptkp: 'PTKP',
}

export function chips(f: Filters, label: (key: MultiKey, value: string) => string): Chip[] {
  const out: Chip[] = []
  for (const key of MULTI_KEYS) {
    for (const v of f.multi[key]) {
      out.push({ group: GROUP_LABEL[key], label: label(key, v), remove: patch(f, { multi: { [key]: f.multi[key].filter((x) => x !== v) } }) })
    }
  }
  if (f.q) out.push({ group: 'Cari', label: f.q, remove: patch(f, { q: '' }) })
  if (f.status) out.push({ group: 'Status', label: f.status === 'sent' ? 'Sudah dikirim' : 'Belum dikirim', remove: patch(f, { status: '' }) })
  if (f.verified) out.push({ group: 'Email', label: f.verified === 'yes' ? 'Terverifikasi' : 'Belum verifikasi', remove: patch(f, { verified: '' }) })
  if (f.min_age) out.push({ group: 'Umur min.', label: `${f.min_age} th`, remove: patch(f, { min_age: '' }) })
  if (f.max_age) out.push({ group: 'Umur maks.', label: `${f.max_age} th`, remove: patch(f, { max_age: '' }) })
  if (f.from) out.push({ group: 'Daftar dari', label: f.from, remove: patch(f, { from: '' }) })
  if (f.to) out.push({ group: 'Daftar sampai', label: f.to, remove: patch(f, { to: '' }) })
  return out
}
