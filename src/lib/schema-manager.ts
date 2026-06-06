import "server-only"

import { pgPool, quoteIdent } from "@/lib/db-data"

// The metadata engine's DDL layer. Phase 1 provisions an empty per-workspace
// schema at /join; Phase 2 adds materializeObject()/addField() to create the
// actual record tables from FieldMetadata.

// Derive a safe Postgres schema name from the (unique) workspace subdomain.
// Subdomains are [a-z0-9-]; hyphens → underscores; the "ws_" prefix guarantees a
// valid identifier. Injective over the allowed charset, so schema names stay
// unique and collision-free.
export function workspaceSchemaName(subdomain: string): string {
  return `ws_${subdomain.replace(/-/g, "_")}`
}

export async function createWorkspaceSchema(pgSchema: string): Promise<void> {
  await pgPool.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(pgSchema)}`)
}

export async function dropWorkspaceSchema(pgSchema: string): Promise<void> {
  await pgPool.query(`DROP SCHEMA IF EXISTS ${quoteIdent(pgSchema)} CASCADE`)
}

export async function workspaceSchemaExists(
  pgSchema: string,
): Promise<boolean> {
  const { rows } = await pgPool.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS exists`,
    [pgSchema],
  )
  return rows[0]?.exists ?? false
}
