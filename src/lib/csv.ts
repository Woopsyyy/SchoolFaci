export type CsvCell = string | number | null | undefined

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const escape = (v: CsvCell): string => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const csv = toCsv(headers, rows)
  // BOM keeps Excel from mangling UTF-8 (needed for the em dashes / names)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function timestampSlug(): string {
  return new Date().toISOString().slice(0, 10)
}