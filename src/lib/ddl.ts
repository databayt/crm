// Pure DDL builders — produce CREATE/ALTER TABLE statements from field metadata.
// No `server-only`/`pg`, so they are unit-tested directly. Execution lives in
// src/lib/schema-manager.ts.
import { pgTypeFor } from "@/lib/field-types"
import { qualified, quoteIdent } from "@/lib/sql"

// Every materialized table carries these system columns automatically; they are
// NOT part of FieldMetadata, and a field may never reuse one of these names.
export const SYSTEM_COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
] as const

export interface FieldColumn {
  name: string
  type: string // a FieldType value
  isNullable?: boolean
}

export function assertNotSystemColumn(name: string): void {
  if ((SYSTEM_COLUMNS as readonly string[]).includes(name)) {
    throw new Error(`"${name}" is a reserved system column`)
  }
}

function columnClause(f: FieldColumn): string {
  assertNotSystemColumn(f.name)
  return `${quoteIdent(f.name)} ${pgTypeFor(f.type)}${
    f.isNullable === false ? " NOT NULL" : ""
  }`
}

export function buildCreateTable(
  pgSchema: string,
  table: string,
  fields: FieldColumn[],
): string {
  const cols = [
    `"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()`,
    `"created_at" timestamptz NOT NULL DEFAULT now()`,
    `"updated_at" timestamptz NOT NULL DEFAULT now()`,
    `"deleted_at" timestamptz`,
    ...fields.map(columnClause),
  ]
  return `CREATE TABLE IF NOT EXISTS ${qualified(pgSchema, table)} (\n  ${cols.join(
    ",\n  ",
  )}\n)`
}

export function buildAddColumn(
  pgSchema: string,
  table: string,
  field: FieldColumn,
): string {
  return `ALTER TABLE ${qualified(pgSchema, table)} ADD COLUMN IF NOT EXISTS ${columnClause(
    field,
  )}`
}

export function buildDropColumn(
  pgSchema: string,
  table: string,
  columnName: string,
): string {
  assertNotSystemColumn(columnName)
  return `ALTER TABLE ${qualified(pgSchema, table)} DROP COLUMN IF EXISTS ${quoteIdent(
    columnName,
  )}`
}
