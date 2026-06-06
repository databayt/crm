import "server-only"

import { pgPool, quoteIdent } from "@/lib/db-data"
import {
  buildAddColumn,
  buildCreateTable,
  buildDropColumn,
  type FieldColumn,
} from "@/lib/ddl"

export { SYSTEM_COLUMNS, type FieldColumn } from "@/lib/ddl"

// The metadata engine's DDL execution layer. Pure statement construction lives
// in src/lib/ddl.ts (unit-tested); this file just runs the statements against
// the data-plane pool.

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

export async function materializeObject(
  pgSchema: string,
  table: string,
  fields: FieldColumn[],
): Promise<void> {
  await pgPool.query(buildCreateTable(pgSchema, table, fields))
}

export async function addColumn(
  pgSchema: string,
  table: string,
  field: FieldColumn,
): Promise<void> {
  await pgPool.query(buildAddColumn(pgSchema, table, field))
}

export async function dropColumn(
  pgSchema: string,
  table: string,
  columnName: string,
): Promise<void> {
  await pgPool.query(buildDropColumn(pgSchema, table, columnName))
}
