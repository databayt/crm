// Pure SQL identifier helpers — no `server-only`, no `pg`, so the metadata
// engine's SQL builders that use them stay unit-testable.
//
// SQL identifiers (schema/table/column names) cannot be parameterized, so the
// engine builds them by hand. We whitelist the charset and double-quote to
// defeat injection. Identifier names always originate from validated metadata,
// never from raw user input.
const IDENT_RE = /^[a-z_][a-z0-9_]*$/i

export function quoteIdent(name: string): string {
  if (!IDENT_RE.test(name) || name.length > 63) {
    throw new Error(`Unsafe SQL identifier: ${JSON.stringify(name)}`)
  }
  return `"${name.replace(/"/g, '""')}"`
}

export function qualified(schema: string, table: string): string {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`
}
