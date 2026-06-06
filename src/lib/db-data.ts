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

// Re-export the pure identifier helpers so server-only callers can import both
// the pool and the quoting helpers from one place.
export { quoteIdent, qualified } from "@/lib/sql"
