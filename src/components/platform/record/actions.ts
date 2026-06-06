"use server"

import { getObject } from "@/lib/metadata"
import {
  getRecord,
  insertRecord,
  softDeleteRecord,
  updateRecord as dbUpdateRecord,
} from "@/lib/query-builder"
import { requireTenant } from "@/lib/tenant-context"

export type RecordResult = { error?: string; ok?: boolean; id?: string }

function checkRequired(
  fields: { name: string; label: string; isNullable: boolean }[],
  values: Record<string, unknown>,
): string | null {
  for (const f of fields) {
    if (f.isNullable === false && !values[f.name])
      return `${f.label} is required`
  }
  return null
}

export async function createRecord(
  objectName: string,
  values: Record<string, unknown>,
): Promise<RecordResult> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }

  const missing = checkRequired(object.fields, values)
  if (missing) return { error: missing }

  const row = await insertRecord(
    pgSchema,
    object.tableName,
    object.fieldMap,
    values,
  )
  return { ok: true, id: String(row.id) }
}

export async function updateRecord(
  objectName: string,
  id: string,
  values: Record<string, unknown>,
): Promise<RecordResult> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }

  const missing = checkRequired(object.fields, values)
  if (missing) return { error: missing }

  const row = await dbUpdateRecord(
    pgSchema,
    object.tableName,
    object.fieldMap,
    id,
    values,
  )
  if (!row) return { error: "Record not found" }
  return { ok: true, id: String(row.id) }
}

export async function deleteRecord(
  objectName: string,
  id: string,
): Promise<RecordResult> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }
  await softDeleteRecord(pgSchema, object.tableName, id)
  return { ok: true }
}

export async function fetchRecord(
  objectName: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, objectName)
  if (!object) return null
  return getRecord(pgSchema, object.tableName, id)
}
