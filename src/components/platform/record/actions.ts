"use server"

import { authorize } from "@/lib/authz"
import { getObject } from "@/lib/metadata"
import {
  bulkSoftDeleteRecords,
  getRecord,
  insertRecord,
  softDeleteRecord,
  updateRecord as dbUpdateRecord,
} from "@/lib/query-builder"
import { requireTenant } from "@/lib/tenant-context"

export type RecordResult = {
  error?: string
  ok?: boolean
  id?: string
  count?: number
}

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
  const authz = await authorize("edit_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
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
  const authz = await authorize("edit_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
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
  const authz = await authorize("edit_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }
  await softDeleteRecord(pgSchema, object.tableName, id)
  return { ok: true }
}

// Patch a single field of one record (inline cell editing). Unlike updateRecord,
// this only validates the EDITED field's own required-ness — it must not reject
// because some *other* required field isn't part of this one-field patch (the
// checkRequired trap). buildUpdate writes only the provided column, so the rest
// of the row is untouched.
export async function updateField(
  objectName: string,
  id: string,
  column: string,
  value: unknown,
): Promise<RecordResult> {
  const authz = await authorize("edit_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }

  const field = object.fields.find((f) => f.name === column)
  if (!field) return { error: "Unknown field" }
  if (field.isNullable === false && !String(value ?? "").trim())
    return { error: `${field.label} is required` }

  const row = await dbUpdateRecord(
    pgSchema,
    object.tableName,
    object.fieldMap,
    id,
    {
      [column]: value,
    },
  )
  if (!row) return { error: "Record not found" }
  return { ok: true, id: String(row.id) }
}

export async function bulkDeleteRecords(
  objectName: string,
  ids: string[],
): Promise<RecordResult> {
  const authz = await authorize("edit_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }
  const clean = ids.map(String).filter(Boolean)
  if (clean.length === 0) return { ok: true, count: 0 }
  const count = await bulkSoftDeleteRecords(pgSchema, object.tableName, clean)
  return { ok: true, count }
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
