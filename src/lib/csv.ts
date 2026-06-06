// Pure CSV read/write — no server-only/pg, so it's used on both client (import
// parse) and server (export build), and is unit-tested. RFC-4180-ish: quotes
// fields containing comma/quote/newline, escapes quotes by doubling.

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")]
  for (const row of rows) lines.push(row.map(csvEscape).join(","))
  return lines.join("\r\n")
}

// Parse CSV text into a matrix of strings. Handles quoted fields, escaped
// quotes, and commas/newlines inside quotes. Blank trailing lines are dropped.
export function parseCSV(text: string): string[][] {
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ",") {
      row.push(field)
      field = ""
      i++
      continue
    }
    if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      i++
      continue
    }
    field += c
    i++
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Drop fully-empty rows.
  return rows.filter((r) => r.some((cell) => cell !== ""))
}
