import "server-only"

import { getObject, relationTarget, type LoadedObject } from "@/lib/metadata"
import { listRecords } from "@/lib/query-builder"

export interface RelationOption {
  id: string
  label: string
}

function displayLabel(obj: LoadedObject, row: Record<string, unknown>): string {
  const primary = row[obj.displayField]
  if (primary != null && primary !== "") return String(primary)
  const fn = row["first_name"]
  const ln = row["last_name"]
  if (fn || ln) return [fn, ln].filter(Boolean).join(" ")
  return String(row["id"] ?? "")
}

// For each RELATION field, load the target object's records as picker options.
export async function getRelationOptions(
  workspaceId: string,
  pgSchema: string,
  object: LoadedObject,
): Promise<Record<string, RelationOption[]>> {
  const map: Record<string, RelationOption[]> = {}
  for (const field of object.fields) {
    const target = relationTarget(field)
    if (!target) continue
    const targetObj = await getObject(workspaceId, target)
    if (!targetObj) {
      map[field.name] = []
      continue
    }
    const rows = await listRecords(
      pgSchema,
      targetObj.tableName,
      targetObj.fieldMap,
      { limit: 100 },
    )
    map[field.name] = rows.map((r) => ({
      id: String(r.id),
      label: displayLabel(targetObj, r),
    }))
  }
  return map
}

// Resolve the RELATION ids present in `rows` to display labels, for table cells.
export async function resolveRelationLabels(
  workspaceId: string,
  pgSchema: string,
  object: LoadedObject,
  rows: Record<string, unknown>[],
): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = {}
  for (const field of object.fields) {
    const target = relationTarget(field)
    if (!target) continue

    const ids = new Set<string>()
    for (const r of rows) {
      const v = r[field.name]
      if (v) ids.add(String(v))
    }
    if (ids.size === 0) {
      result[field.name] = {}
      continue
    }

    const targetObj = await getObject(workspaceId, target)
    if (!targetObj) {
      result[field.name] = {}
      continue
    }
    const trows = await listRecords(
      pgSchema,
      targetObj.tableName,
      targetObj.fieldMap,
      { limit: 200 },
    )
    const labels: Record<string, string> = {}
    for (const tr of trows) {
      const id = String(tr.id)
      if (ids.has(id)) labels[id] = displayLabel(targetObj, tr)
    }
    result[field.name] = labels
  }
  return result
}
