// Turn a human label into a safe snake_case SQL identifier (column/table/object
// machine name). Pure — used by the settings UI for live previews and by the
// server actions. The result always satisfies quoteIdent's charset
// ([a-z_][a-z0-9_]*), so a custom field/object can be materialized safely.
export function slugifyIdent(input: string, fallback = "field"): string {
  let s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
  if (!s) s = fallback
  if (!/^[a-z_]/.test(s)) s = `f_${s}`
  return s.slice(0, 60)
}
