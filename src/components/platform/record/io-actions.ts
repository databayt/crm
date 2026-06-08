"use server"

import { authorize } from "@/lib/authz"
import { toCSV } from "@/lib/csv"
import { getObject } from "@/lib/metadata"
import { insertRecord, listRecords } from "@/lib/query-builder"
import type { FilterGroup } from "@/lib/query-sql"
import { requireTenant } from "@/lib/tenant-context"

export async function exportRecords(
  objectName: string,
  opts?: { search?: string; filters?: FilterGroup; ids?: string[] },
): Promise<{ csv?: string; filename?: string; error?: string }> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }

  let rows = await listRecords(pgSchema, object.tableName, object.fieldMap, {
    limit: 200,
    search: opts?.search,
    filters: opts?.filters,
  })
  // "Export selected" narrows the filtered page to the ticked rows.
  if (opts?.ids?.length) {
    const picked = new Set(opts.ids.map(String))
    rows = rows.filter((r) => picked.has(String(r.id)))
  }
  const headers = object.fields.map((f) => f.label)
  const data = rows.map((r) =>
    object.fields.map((f) => {
      const v = r[f.name]
      return v instanceof Date ? v.toISOString() : (v ?? "")
    }),
  )
  return { csv: toCSV(headers, data), filename: `${object.namePlural}.csv` }
}

export async function importRecords(
  objectName: string,
  rows: Record<string, unknown>[],
): Promise<{ count?: number; failed?: number; error?: string }> {
  const authz = await authorize("edit_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }

  const required = object.fields
    .filter((f) => f.isNullable === false)
    .map((f) => f.name)

  let count = 0
  let failed = 0
  for (const row of rows.slice(0, 1000)) {
    if (required.some((name) => !String(row[name] ?? "").trim())) {
      failed++
      continue
    }
    try {
      await insertRecord(pgSchema, object.tableName, object.fieldMap, row)
      count++
    } catch {
      failed++
    }
  }
  return { count, failed }
}
