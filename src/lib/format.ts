const nf = new Intl.NumberFormat('id-ID')
const dateOnly = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const dayShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export const num = (n: number | null | undefined): string => nf.format(n ?? 0)

/** "1995-04-02" -> "2 Apr 1995" (tanpa pergeseran zona waktu) */
export function dateText(value?: string | null): string {
  if (!value) return '-'
  const d = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? '-' : dateOnly.format(d)
}

export function dayLabel(value: string): string {
  const d = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? value : dayShort.format(d)
}

/** ISO UTC -> waktu WIB */
export function dateTimeText(value?: string | null): string {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : `${dateTime.format(d)} WIB`
}

export function initials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** 0812-3456-789 / +62812... -> https://wa.me/62812... */
export function waLink(hp?: string | null): string | null {
  let d = (hp ?? '').replace(/[^\d]/g, '')
  if (d.length < 8) return null
  if (d.startsWith('0')) d = `62${d.slice(1)}`
  else if (d.startsWith('8')) d = `62${d}`
  return `https://wa.me/${d}`
}

/** 3201••••••••••123 */
export function maskId(value?: string | null): string {
  const v = (value ?? '').trim()
  if (v.length <= 7) return v ? '•'.repeat(v.length) : '-'
  return `${v.slice(0, 4)}${'•'.repeat(v.length - 7)}${v.slice(-3)}`
}

/** Warna tetap per perusahaan (dari kodenya) */
export function hueOf(code: string): number {
  let h = 0
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export const pct = (n: number, total: number): number => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)

export const STATUS_LABEL: Record<number, string> = { 0: 'Belum dikirim', 1: 'Sudah dikirim', 2: 'Diterima' }
