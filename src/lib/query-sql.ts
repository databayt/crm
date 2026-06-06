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
  search?: string
  // Equality filters, e.g. activity.company_id = <id>. Columns are allowlisted
  // against the field map (+ system columns); values are coerced + parameterized.
  filters?: { column: string; value: unknown }[]
}

const MAX_LIMIT = 200

// Field types whose columns participate in free-text search (ILIKE).
const SEARCHABLE_TYPES = new Set(["TEXT", "EMAIL", "URL", "PHONE", "SELECT"])

function orderableColumns(fields: FieldMap): Set<string> {
  return new Set<string>([...SYSTEM_COLUMNS, ...Object.keys(fields)])
}

function searchableColumns(fields: FieldMap): string[] {
  return Object.entries(fields)
    .filter(([, type]) => SEARCHABLE_TYPES.has(type))
    .map(([name]) => name)
}

// Build the "(col ILIKE $n OR ...)" clause for a search term, appending its
// parameter to `values`. Returns "" when there's nothing to search.
function searchClause(
  fields: FieldMap,
  search: string | undefined,
  values: unknown[],
): string {
  const term = search?.trim()
  if (!term) return ""
  const cols = searchableColumns(fields)
  if (cols.length === 0) return ""
  values.push(`%${term}%`)
  const p = `$${values.length}`
  return `(${cols.map((c) => `${quoteIdent(c)} ILIKE ${p}`).join(" OR ")})`
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

  const where = ['"deleted_at" IS NULL']
  const values: unknown[] = []

  const allowed = orderableColumns(fields)
  for (const f of opts.filters ?? []) {
    if (!allowed.has(f.column)) continue
    const v =
      f.column in fields ? coerceValue(fields[f.column], f.value) : f.value
    values.push(v)
    where.push(`${quoteIdent(f.column)} = $${values.length}`)
  }

  const search = searchClause(fields, opts.search, values)
  if (search) where.push(search)

  values.push(limit)
  const limitP = `$${values.length}`
  values.push(offset)
  const offsetP = `$${values.length}`

  return {
    text: `SELECT * FROM ${qualified(pgSchema, table)} WHERE ${where.join(
      " AND ",
    )} ORDER BY ${quoteIdent(orderCol)} ${orderDir} LIMIT ${limitP} OFFSET ${offsetP}`,
    values,
  }
}

export function buildCount(
  pgSchema: string,
  table: string,
  fields?: FieldMap,
  search?: string,
): SqlQuery {
  const where = ['"deleted_at" IS NULL']
  const values: unknown[] = []
  if (fields) {
    const clause = searchClause(fields, search, values)
    if (clause) where.push(clause)
  }
  return {
    text: `SELECT count(*)::int AS count FROM ${qualified(
      pgSchema,
      table,
    )} WHERE ${where.join(" AND ")}`,
    values,
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
