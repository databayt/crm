// Pure data-plane query builders — produce parameterized { text, values } for
// CRUD against a workspace's record tables. No `server-only`/`pg`, so they are
// unit-tested directly. Execution lives in src/lib/query-builder.ts.
//
// Tenant isolation is structural: every statement is fully qualified with the
// caller-resolved pgSchema ("ws_<id>"."table"); we never use search_path. Only
// known business columns (the FieldMap) are written; system columns are managed
// by the engine and never accepted from callers.
import { coerceValue } from "@/lib/field-types"
import { SYSTEM_COLUMNS } from "@/lib/ddl"
import { qualified, quoteIdent } from "@/lib/sql"

export interface SqlQuery {
  text: string
  values: unknown[]
}

// columnName → FieldType. The allowlist of writable/orderable business columns.
export type FieldMap = Record<string, string>

export interface ListOptions {
  limit?: number
  offset?: number
  orderBy?: { column: string; dir: "asc" | "desc" }
}

const MAX_LIMIT = 200

function orderableColumns(fields: FieldMap): Set<string> {
  return new Set<string>([...SYSTEM_COLUMNS, ...Object.keys(fields)])
}

export function buildInsert(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  data: Record<string, unknown>,
): SqlQuery {
  const cols: string[] = []
  const placeholders: string[] = []
  const values: unknown[] = []
  let i = 1
  for (const [key, raw] of Object.entries(data)) {
    if (!(key in fields)) continue // only known business fields are writable
    cols.push(quoteIdent(key))
    placeholders.push(`$${i++}`)
    values.push(coerceValue(fields[key], raw))
  }
  if (cols.length === 0) {
    return {
      text: `INSERT INTO ${qualified(pgSchema, table)} DEFAULT VALUES RETURNING *`,
      values: [],
    }
  }
  return {
    text: `INSERT INTO ${qualified(pgSchema, table)} (${cols.join(
      ", ",
    )}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values,
  }
}

export function buildList(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  opts: ListOptions = {},
): SqlQuery {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), MAX_LIMIT)
  const offset = Math.max(opts.offset ?? 0, 0)

  let orderCol = "created_at"
  let orderDir = "DESC"
  if (opts.orderBy && orderableColumns(fields).has(opts.orderBy.column)) {
    orderCol = opts.orderBy.column
    orderDir = opts.orderBy.dir === "asc" ? "ASC" : "DESC"
  }

  return {
    text: `SELECT * FROM ${qualified(pgSchema, table)} WHERE "deleted_at" IS NULL ORDER BY ${quoteIdent(
      orderCol,
    )} ${orderDir} LIMIT $1 OFFSET $2`,
    values: [limit, offset],
  }
}

export function buildCount(pgSchema: string, table: string): SqlQuery {
  return {
    text: `SELECT count(*)::int AS count FROM ${qualified(
      pgSchema,
      table,
    )} WHERE "deleted_at" IS NULL`,
    values: [],
  }
}

export function buildGetById(
  pgSchema: string,
  table: string,
  id: string,
): SqlQuery {
  return {
    text: `SELECT * FROM ${qualified(
      pgSchema,
      table,
    )} WHERE "id" = $1 AND "deleted_at" IS NULL`,
    values: [id],
  }
}

export function buildUpdate(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  id: string,
  data: Record<string, unknown>,
): SqlQuery {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  for (const [key, raw] of Object.entries(data)) {
    if (!(key in fields)) continue
    sets.push(`${quoteIdent(key)} = $${i++}`)
    values.push(coerceValue(fields[key], raw))
  }
  sets.push(`"updated_at" = now()`)
  values.push(id)
  return {
    text: `UPDATE ${qualified(pgSchema, table)} SET ${sets.join(
      ", ",
    )} WHERE "id" = $${i} AND "deleted_at" IS NULL RETURNING *`,
    values,
  }
}

export function buildSoftDelete(
  pgSchema: string,
  table: string,
  id: string,
): SqlQuery {
  return {
    text: `UPDATE ${qualified(
      pgSchema,
      table,
    )} SET "deleted_at" = now() WHERE "id" = $1 AND "deleted_at" IS NULL`,
    values: [id],
  }
}
