import Link from "next/link"

import { SYSTEM_COLUMNS } from "@/lib/ddl"
import {
  listObjects,
  relationTarget,
  type LoadedField,
  type LoadedObject,
} from "@/lib/metadata"
import { listRecords, type RecordRow } from "@/lib/query-builder"
import { getRelationOptions } from "@/lib/record-data"
import { requireTenant } from "@/lib/tenant-context"
import { FieldCell } from "@/components/platform/record/field-cell"
import { RecordForm } from "@/components/platform/record/record-form"
import { Button } from "@/components/ui/button"

// How many secondary (non-title) columns to preview per related row.
const SECONDARY_LIMIT = 3
const ROW_LIMIT = 50

interface Panel {
  object: LoadedObject
  viaField: LoadedField
  rows: RecordRow[]
  relationOptions: Record<string, { id: string; label: string }[]>
  secondary: LoadedField[]
}

// Generic reverse-relation panels for a record's detail page: every OTHER object
// that has a RELATION pointing back to this one becomes a panel listing its
// matching records. Metadata-driven, so custom objects get panels for free. The
// `activity` object is excluded — it has its own richer timeline alongside this.
export async function RelatedPanels({
  lang,
  objectName,
  recordId,
}: {
  lang: string
  objectName: string
  recordId: string
}) {
  const { workspaceId, pgSchema } = await requireTenant()
  const objects = await listObjects(workspaceId)

  const panels: Panel[] = []
  for (const obj of objects) {
    if (obj.nameSingular === objectName || obj.nameSingular === "activity")
      continue
    for (const field of obj.fields) {
      if (relationTarget(field) !== objectName) continue
      const rows = await listRecords(pgSchema, obj.tableName, obj.fieldMap, {
        filters: [{ column: field.name, value: recordId }],
        orderBy: { column: "created_at", dir: "desc" },
        limit: ROW_LIMIT,
      })
      const relationOptions = await getRelationOptions(
        workspaceId,
        pgSchema,
        obj,
      )
      const secondary = obj.fields
        .filter(
          (f) =>
            f.name !== obj.displayField &&
            f.name !== field.name &&
            f.type !== "RELATION" &&
            !(SYSTEM_COLUMNS as readonly string[]).includes(f.name),
        )
        .slice(0, SECONDARY_LIMIT)
      panels.push({
        object: obj,
        viaField: field,
        rows,
        relationOptions,
        secondary,
      })
    }
  }

  if (panels.length === 0) return null

  return (
    <div className="mt-6 space-y-6">
      {panels.map((p) => {
        const key = `${p.object.nameSingular}.${p.viaField.name}`
        return (
          <section key={key} className="rounded-lg border">
            <div className="flex items-center justify-between gap-2 border-b p-4">
              <h2 className="text-sm font-medium">
                {p.object.labelPlural}
                <span className="ms-2 text-muted-foreground">
                  {p.rows.length}
                </span>
              </h2>
              <RecordForm
                objectName={p.object.nameSingular}
                objectLabel={p.object.labelSingular}
                fields={p.object.fields}
                relationOptions={p.relationOptions}
                record={{ [p.viaField.name]: recordId }}
                trigger={
                  <Button size="sm" variant="outline">
                    New {p.object.labelSingular.toLowerCase()}
                  </Button>
                }
              />
            </div>
            {p.rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No {p.object.labelPlural.toLowerCase()} yet.
              </p>
            ) : (
              <ul className="divide-y">
                {p.rows.map((row) => (
                  <li
                    key={String(row.id)}
                    className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
                  >
                    <Link
                      href={`/${lang}/${p.object.namePlural}/${String(row.id)}`}
                      className="font-medium hover:underline"
                    >
                      {String(row[p.object.displayField] ?? row.id)}
                    </Link>
                    {p.secondary.length > 0 ? (
                      <span className="flex items-center gap-3 text-muted-foreground">
                        {p.secondary.map((f) => (
                          <span key={f.name} className="whitespace-nowrap">
                            <FieldCell field={f} value={row[f.name]} />
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
