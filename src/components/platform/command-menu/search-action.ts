"use server"

import { listObjects } from "@/lib/metadata"
import { listRecords } from "@/lib/query-builder"
import { requireTenant } from "@/lib/tenant-context"

export interface SearchHit {
  recordId: string
  label: string
}
export interface SearchGroup {
  namePlural: string
  objectLabel: string
  hits: SearchHit[]
}

// Cross-object record search for the command menu. Reuses ListOptions.search
// (ILIKE across each object's text columns — no new SQL) and runs one capped
// query per object in parallel. The pragmatic analog of Twenty's multi-object
// `search` query (we lack Postgres FTS ranking, so it's ILIKE by display field).
export async function searchRecords(q: string): Promise<SearchGroup[]> {
  // Cap the term server-side: the 250ms client debounce is UX, not a boundary —
  // an oversized ILIKE pattern would be a needless query cost.
  const term = q.trim().slice(0, 200)
  if (term.length < 2) return []

  const { workspaceId, pgSchema } = await requireTenant()
  const objects = await listObjects(workspaceId)

  const groups = await Promise.all(
    objects.map(async (obj) => {
      const rows = await listRecords(pgSchema, obj.tableName, obj.fieldMap, {
        search: term,
        limit: 5,
      })
      return {
        namePlural: obj.namePlural,
        objectLabel: obj.labelPlural,
        hits: rows.map((r) => ({
          recordId: String(r.id),
          label: String(r[obj.displayField] ?? "Untitled"),
        })),
      }
    }),
  )

  return groups.filter((g) => g.hits.length > 0)
}
