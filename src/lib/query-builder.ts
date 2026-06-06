import "server-only"

import { pgPool } from "@/lib/db-data"
import {
  buildCount,
  buildGetById,
  buildInsert,
  buildList,
  buildSoftDelete,
  buildUpdate,
  type FieldMap,
  type ListOptions,
} from "@/lib/query-sql"

export type { FieldMap, ListOptions } from "@/lib/query-sql"

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
  const q = buildList(pgSchema, table, fields, opts)
  const { rows } = await pgPool.query<RecordRow>(q.text, q.values)
  return rows
}

export async function countRecords(
  pgSchema: string,
  table: string,
): Promise<number> {
  const q = buildCount(pgSchema, table)
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
