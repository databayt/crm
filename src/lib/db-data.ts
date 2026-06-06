import "server-only"

import { Pool } from "pg"

// The DATA-plane connection — raw `pg`, separate from Prisma (the control plane).
// Uses DIRECT_URL (unpooled) because the metadata engine runs DDL and we never
// rely on session state like `SET search_path`; every statement fully-qualifies
// its table as "ws_<id>"."table". Singleton to survive HMR.
const globalForPg = globalThis as unknown as { pgPool?: Pool }

export const pgPool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DIRECT_URL,
    max: 10,
    // Neon serves a valid cert; rejectUnauthorized:false avoids CA-chain
    // friction across Node versions while still encrypting in transit.
    ssl: { rejectUnauthorized: false },
  })

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pgPool

// SQL identifiers (schema/table/column names) cannot be parameterized, so the
// metadata engine must build them by hand. We whitelist the charset and
// double-quote to defeat injection. Identifier names always originate from
// validated metadata, never from raw user input.
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
