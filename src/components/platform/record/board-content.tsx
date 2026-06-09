import { getObjectByPlural, isGroupable, selectChoices } from "@/lib/metadata"
import { aggregateRecords, listRecords } from "@/lib/query-builder"
import type { LoadedField, LoadedObject } from "@/lib/metadata"
import { resolveRelationLabels } from "@/lib/record-data"
import { requireTenant } from "@/lib/tenant-context"
import {
  type BoardCard,
  type BoardColumn,
  RecordBoard,
} from "@/components/platform/record/board"

const BOARD_LIMIT = 200

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

// Format a card's secondary metric (the value shown on the card + summed in the
// footer). CURRENCY → currency; NUMBER → grouped number; else plain string.
function fmtMetric(field: LoadedField, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return field.type === "CURRENCY" ? fmtCurrency(n) : n.toLocaleString()
}

// Pick the numeric field to aggregate on a board (first CURRENCY, else NUMBER).
function pickMetricField(object: LoadedObject): LoadedField | null {
  return (
    object.fields.find((f) => f.type === "CURRENCY") ??
    object.fields.find((f) => f.type === "NUMBER") ??
    null
  )
}

// Generic kanban: any object grouped by any SELECT field. Cards are ordered by
// the manual `position`; each column footer shows the TRUE count + summed metric
// (from a GROUP BY aggregate, so it's correct even when a column is truncated).
export async function BoardContent({
  lang,
  objectPlural,
  groupBy,
}: {
  lang: string
  objectPlural: string
  groupBy?: string
}) {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObjectByPlural(workspaceId, objectPlural)
  if (!object) {
    return (
      <div className="container-wrapper py-8">
        <p className="text-muted-foreground">Unknown object.</p>
      </div>
    )
  }

  const groupables = object.fields.filter(isGroupable)
  const groupField =
    (groupBy && groupables.find((f) => f.name === groupBy)) ??
    groupables[0] ??
    null

  if (!groupField) {
    return (
      <div className="container-wrapper py-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          {object.labelPlural}
        </h1>
        <p className="text-muted-foreground">
          This object has no SELECT field to group a board by.
        </p>
      </div>
    )
  }

  const choices = selectChoices(groupField)
  // Buckets = the field's choices, plus a trailing "No value" bucket when the
  // field is nullable (Twenty's rule). "" keys the No-value bucket.
  const buckets = groupField.isNullable ? [...choices, ""] : [...choices]

  const metricField = pickMetricField(object)
  const subtitleField = object.fields.find((f) => f.type === "RELATION") ?? null

  // One ordered fetch (cards) + one GROUP BY aggregate (true totals per column).
  const [rows, agg] = await Promise.all([
    listRecords(pgSchema, object.tableName, object.fieldMap, {
      limit: BOARD_LIMIT,
      orderBy: { column: "position", dir: "asc" },
    }),
    aggregateRecords(
      pgSchema,
      object.tableName,
      object.fieldMap,
      metricField ? [{ column: metricField.name, op: "SUM" as const }] : [],
      { groupBy: groupField.name },
    ),
  ])

  const relationLabels = subtitleField
    ? await resolveRelationLabels(workspaceId, pgSchema, object, rows)
    : {}

  // group value → { count, sum }. The No-value group comes back as SQL NULL.
  const sumAlias = agg.aggregates[0]?.alias
  const aggMap: Record<string, { count: number; sum: number | null }> = {}
  for (const r of agg.rows) {
    const key = r.group_value == null ? "" : String(r.group_value)
    aggMap[key] = {
      count: Number(r.group_count ?? 0),
      sum: sumAlias && r[sumAlias] != null ? Number(r[sumAlias]) : null,
    }
  }

  // Values present in the data but not in the field's current choices (a renamed
  // or removed option, legacy rows) still get a trailing column — otherwise their
  // cards would silently vanish from the board.
  const unmapped = Object.keys(aggMap)
    .filter((v) => !buckets.includes(v))
    .sort()
  const allBuckets = [...buckets, ...unmapped]

  const cardsByGroup: Record<string, BoardCard[]> = {}
  for (const b of allBuckets) cardsByGroup[b] = []
  for (const r of rows) {
    const raw = r[groupField.name]
    const v = raw == null || raw === "" ? "" : String(raw)
    // Every distinct value has a bucket now; "" catches empty values when the
    // field is nullable, else such a row falls through (shouldn't happen).
    const key = allBuckets.includes(v) ? v : allBuckets.includes("") ? "" : null
    if (key === null) continue
    cardsByGroup[key].push({
      id: String(r.id),
      title: String(r[object.displayField] ?? "Untitled"),
      subtitle: subtitleField
        ? (relationLabels[subtitleField.name]?.[
            String(r[subtitleField.name] ?? "")
          ] ?? null)
        : null,
      meta: metricField ? fmtMetric(metricField, r[metricField.name]) : null,
      position: Number(r.position ?? 0),
    })
  }

  const columns: BoardColumn[] = allBuckets.map((value) => {
    const a = aggMap[value]
    const count = a?.count ?? cardsByGroup[value]?.length ?? 0
    const metric =
      metricField && a?.sum != null
        ? `Σ ${fmtMetric(metricField, a.sum)}`
        : null
    return {
      value,
      label: value === "" ? "No value" : value,
      count,
      metric,
    }
  })

  return (
    <div className="container-wrapper py-8">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {object.labelPlural}
        </h1>
        <span className="text-sm text-muted-foreground">
          grouped by {groupField.label}
        </span>
      </div>
      <RecordBoard
        basePath={`/${lang}/${object.namePlural}`}
        objectName={object.nameSingular}
        groupField={groupField.name}
        columns={columns}
        cardsByGroup={cardsByGroup}
        displayField={object.displayField}
      />
    </div>
  )
}
