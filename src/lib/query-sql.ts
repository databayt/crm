// Pure data-plane query builders — produce parameterized { text, values } for
// CRUD against a workspace's record tables. No `server-only`/`pg`, so they are
// unit-tested directly. Execution lives in src/lib/query-builder.ts.
//
// Tenant isolation is structural: every statement is fully qualified with the
// caller-resolved pgSchema ("ws_<id>"."table"); we never use search_path. Only
// known business columns (the FieldMap) are written/filtered; system columns are
// managed by the engine and never accepted from callers.
import { coerceValue } from "@/lib/field-types"
import { SYSTEM_COLUMNS } from "@/lib/ddl"
import { qualified, quoteIdent } from "@/lib/sql"

export interface SqlQuery {
  text: string
  values: unknown[]
}

// columnName → FieldType. The allowlist of writable/orderable/filterable columns.
export type FieldMap = Record<string, string>

// ── Filtering ───────────────────────────────────────────────────────────────
export type FilterOp =
  | "eq"
  | "neq"
  | "contains"
  | "starts_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "is_empty"
  | "is_not_empty"

export interface RecordFilter {
  column: string
  op: FilterOp
  value?: unknown
}
export interface FilterGroup {
  logic?: "AND" | "OR"
  filters: RecordFilter[]
}
// Legacy equality sugar still accepted by ListOptions.filters and buildCount.
export type LegacyFilter = { column: string; value: unknown }

export interface ListOptions {
  limit?: number
  offset?: number
  orderBy?: { column: string; dir: "asc" | "desc" }
  search?: string
  filters?: FilterGroup | RecordFilter[] | LegacyFilter[]
}

const MAX_LIMIT = 200
// Field types whose columns participate in free-text search (ILIKE).
const SEARCHABLE_TYPES = new Set(["TEXT", "EMAIL", "URL", "PHONE", "SELECT"])
// Field types that accept text operators vs ordered (comparison) operators.
const TEXTY = new Set(["TEXT", "EMAIL", "URL", "PHONE", "SELECT", "RELATION"])
const ORDERED = new Set(["NUMBER", "CURRENCY", "RATING", "DATE", "DATETIME"])

function orderableColumns(fields: FieldMap): Set<string> {
  return new Set<string>([...SYSTEM_COLUMNS, ...Object.keys(fields)])
}

function searchableColumns(fields: FieldMap): string[] {
  return Object.entries(fields)
    .filter(([, type]) => SEARCHABLE_TYPES.has(type))
    .map(([name]) => name)
}

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

// Normalize the loose `filters` option into a FilterGroup (array → AND-of-eq).
function normalizeFilters(f: ListOptions["filters"]): FilterGroup | undefined {
  if (!f) return undefined
  if (Array.isArray(f)) {
    return {
      logic: "AND",
      filters: f.map((x) =>
        "op" in x
          ? x
          : { column: x.column, op: "eq" as FilterOp, value: x.value },
      ),
    }
  }
  return f
}

function opAllowedFor(type: string, op: FilterOp): boolean {
  if (op === "eq" || op === "neq" || op === "is_empty" || op === "is_not_empty")
    return true
  if (op === "contains" || op === "starts_with") return TEXTY.has(type)
  return ORDERED.has(type) // gt / gte / lt / lte
}

// Build a WHERE fragment from a filter group, appending params to `values`. Only
// business columns (present in `fields`) are filterable; each operator is gated
// by the field type, so a crafted param can never inject SQL or error the query.
function filterClause(
  fields: FieldMap,
  group: FilterGroup | undefined,
  values: unknown[],
): string {
  if (!group?.filters?.length) return ""
  const parts: string[] = []
  for (const f of group.filters) {
    if (!(f.column in fields)) continue
    const type = fields[f.column]
    if (!opAllowedFor(type, f.op)) continue
    const col = quoteIdent(f.column)

    if (f.op === "is_empty") {
      parts.push(`(${col} IS NULL OR ${col}::text = '')`)
      continue
    }
    if (f.op === "is_not_empty") {
      parts.push(`(${col} IS NOT NULL AND ${col}::text <> '')`)
      continue
    }

    const v = coerceValue(type, f.value)
    if (v === null || v === undefined) continue

    if (f.op === "contains") {
      values.push(`%${String(v)}%`)
      parts.push(`${col} ILIKE $${values.length}`)
      continue
    }
    if (f.op === "starts_with") {
      values.push(`${String(v)}%`)
      parts.push(`${col} ILIKE $${values.length}`)
      continue
    }
    const sqlOp = {
      eq: "=",
      neq: "<>",
      gt: ">",
      gte: ">=",
      lt: "<",
      lte: "<=",
    }[f.op]
    if (!sqlOp) continue
    values.push(v)
    parts.push(`${col} ${sqlOp} $${values.length}`)
  }
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  const logic = group.logic === "OR" ? " OR " : " AND "
  return `(${parts.join(logic)})`
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

  const fclause = filterClause(fields, normalizeFilters(opts.filters), values)
  if (fclause) where.push(fclause)

  const sclause = searchClause(fields, opts.search, values)
  if (sclause) where.push(sclause)

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
  filters?: ListOptions["filters"],
): SqlQuery {
  const where = ['"deleted_at" IS NULL']
  const values: unknown[] = []
  if (fields) {
    const fclause = filterClause(fields, normalizeFilters(filters), values)
    if (fclause) where.push(fclause)
    const sclause = searchClause(fields, search, values)
    if (sclause) where.push(sclause)
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

export function buildBulkSoftDelete(
  pgSchema: string,
  table: string,
  ids: string[],
): SqlQuery {
  return {
    text: `UPDATE ${qualified(
      pgSchema,
      table,
    )} SET "deleted_at" = now() WHERE "id"::text = ANY($1) AND "deleted_at" IS NULL`,
    values: [ids],
  }
}

// Fetch exactly the rows for a set of ids (single ANY param). Used to resolve
// RELATION labels precisely, instead of scanning the first N target rows and
// silently dropping labels for ids beyond that window.
export function buildSelectByIds(
  pgSchema: string,
  table: string,
  ids: string[],
): SqlQuery {
  return {
    text: `SELECT * FROM ${qualified(
      pgSchema,
      table,
    )} WHERE "id"::text = ANY($1) AND "deleted_at" IS NULL`,
    values: [ids],
  }
}
