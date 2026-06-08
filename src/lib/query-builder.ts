import "server-only"

import { pgPool } from "@/lib/db-data"
import {
  buildAggregate,
  buildBulkSoftDelete,
  buildCount,
  buildGetById,
  buildInsert,
  buildList,
  buildMoveRecord,
  buildSelectByIds,
  buildSoftDelete,
  buildUpdate,
  type AcceptedAggregate,
  type AggregateOptions,
  type AggregateSpec,
  type FieldMap,
  type ListOptions,
} from "@/lib/query-sql"
import { qualified } from "@/lib/sql"

export type { FieldMap, ListOptions } from "@/lib/query-sql"

// Tables whose `position` column has been verified/backfilled this process. The
// column is added to new tables by buildCreateTable, but tables materialized
// before `position` existed need a one-time, idempotent heal — done lazily the
// first time a record is inserted into, ordered by, or reordered within them.
const positionEnsured = new Set<string>()

export async function ensurePosition(
  pgSchema: string,
  table: string,
): Promise<void> {
  const key = `${pgSchema}.${table}`
  if (positionEnsured.has(key)) return
  const t = qualified(pgSchema, table)
  await pgPool.query(
    `ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "position" double precision NOT NULL DEFAULT 0`,
  )
  // Seed manual order from creation order for rows that predate the column
  // (still at the default 0). New rows always carry MAX+1 ≥ 1, so position = 0
  // uniquely identifies un-backfilled rows and re-running is a cheap no-op.
  await pgPool.query(
    `UPDATE ${t} AS t SET "position" = o.rn FROM (
       SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS rn
       FROM ${t} WHERE "position" = 0
     ) AS o WHERE t."id" = o."id"`,
  )
  positionEnsured.add(key)
}

// A data-plane record row. System columns are always present; business columns
// vary by object. Callers reshape via metadata.
export interface RecordRow {
  id: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  [column: string]: unknown
}

// The single choke point for data-plane reads/writes. Every call fully-qualifies
// the table with the caller-resolved pgSchema, so tenant isolation is structural.

export async function insertRecord(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  data: Record<string, unknown>,
): Promise<RecordRow> {
  // The insert references "position" (MAX+1 subquery), so the column must exist.
  await ensurePosition(pgSchema, table)
  const q = buildInsert(pgSchema, table, fields, data)
  const { rows } = await pgPool.query<RecordRow>(q.text, q.values)
  return rows[0]
}

export async function listRecords(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  opts?: ListOptions,
): Promise<RecordRow[]> {
  // Ordering by the manual sort order (board / grouped list) needs the column.
  if (opts?.orderBy?.column === "position")
    await ensurePosition(pgSchema, table)
  const q = buildList(pgSchema, table, fields, opts)
  const { rows } = await pgPool.query<RecordRow>(q.text, q.values)
  return rows
}

export async function countRecords(
  pgSchema: string,
  table: string,
  fields?: FieldMap,
  search?: string,
  filters?: ListOptions["filters"],
): Promise<number> {
  const q = buildCount(pgSchema, table, fields, search, filters)
  const { rows } = await pgPool.query<{ count: number }>(q.text, q.values)
  return rows[0]?.count ?? 0
}

export async function getRecord(
  pgSchema: string,
  table: string,
  id: string,
): Promise<RecordRow | null> {
  const q = buildGetById(pgSchema, table, id)
  const { rows } = await pgPool.query<RecordRow>(q.text, q.values)
  return rows[0] ?? null
}

export async function getRecordsByIds(
  pgSchema: string,
  table: string,
  ids: string[],
): Promise<RecordRow[]> {
  if (ids.length === 0) return []
  const q = buildSelectByIds(pgSchema, table, ids)
  const { rows } = await pgPool.query<RecordRow>(q.text, q.values)
  return rows
}

export async function updateRecord(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  id: string,
  data: Record<string, unknown>,
): Promise<RecordRow | null> {
  const q = buildUpdate(pgSchema, table, fields, id, data)
  const { rows } = await pgPool.query<RecordRow>(q.text, q.values)
  return rows[0] ?? null
}

export async function softDeleteRecord(
  pgSchema: string,
  table: string,
  id: string,
): Promise<void> {
  const q = buildSoftDelete(pgSchema, table, id)
  await pgPool.query(q.text, q.values)
}

export async function bulkSoftDeleteRecords(
  pgSchema: string,
  table: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0
  const q = buildBulkSoftDelete(pgSchema, table, ids)
  const res = await pgPool.query(q.text, q.values)
  return res.rowCount ?? 0
}

// Drag-to-reorder / kanban move: write the new fractional position and, when a
// card crosses columns, the destination group value — in a single UPDATE.
export async function moveRecord(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  id: string,
  position: number,
  group?: { column: string; value: unknown },
): Promise<RecordRow | null> {
  await ensurePosition(pgSchema, table)
  const q = buildMoveRecord(pgSchema, table, fields, id, position, group)
  const { rows } = await pgPool.query<RecordRow>(q.text, q.values)
  return rows[0] ?? null
}

export interface AggregateResult {
  rows: Array<Record<string, unknown>>
  aggregates: AcceptedAggregate[]
  grouped: boolean
}

// Run a table-footer aggregate (no groupBy → one row) or a per-column kanban
// aggregate (groupBy the group field → one row per bucket).
export async function aggregateRecords(
  pgSchema: string,
  table: string,
  fields: FieldMap,
  aggs: AggregateSpec[],
  opts?: AggregateOptions,
): Promise<AggregateResult> {
  const q = buildAggregate(pgSchema, table, fields, aggs, opts)
  const { rows } = await pgPool.query<Record<string, unknown>>(q.text, q.values)
  return { rows, aggregates: q.aggregates, grouped: q.grouped }
}
