import Link from "next/link"
import { notFound } from "next/navigation"

import { getObjectByPlural } from "@/lib/metadata"
import { getRecord } from "@/lib/query-builder"
import { getRelationOptions, resolveRelationLabels } from "@/lib/record-data"
import { requireTenant } from "@/lib/tenant-context"
import { ActivityTimeline } from "@/components/platform/record/activity-timeline"
import { FieldCell } from "@/components/platform/record/field-cell"
import { RecordForm } from "@/components/platform/record/record-form"
import { Button } from "@/components/ui/button"

export async function RecordDetail({
  lang,
  objectPlural,
  recordId,
}: {
  lang: string
  objectPlural: string
  recordId: string
}) {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObjectByPlural(workspaceId, objectPlural)
  if (!object) notFound()

  const record = await getRecord(pgSchema, object.tableName, recordId)
  if (!record) notFound()

  const [relationOptions, relationLabels] = await Promise.all([
    getRelationOptions(workspaceId, pgSchema, object),
    resolveRelationLabels(workspaceId, pgSchema, object, [record]),
  ])

  const title = String(record[object.displayField] ?? object.labelSingular)

  return (
    <div className="container-wrapper py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/${lang}/${object.namePlural}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {object.labelPlural}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        <RecordForm
          objectName={object.nameSingular}
          objectLabel={object.labelSingular}
          fields={object.fields}
          relationOptions={relationOptions}
          record={record}
          trigger={
            <Button size="sm" variant="outline">
              Edit
            </Button>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <dl className="divide-y rounded-lg border">
          {object.fields.map((f) => (
            <div key={f.name} className="grid grid-cols-3 gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{f.label}</dt>
              <dd className="col-span-2 text-sm">
                <FieldCell
                  field={f}
                  value={record[f.name]}
                  relationLabel={
                    relationLabels[f.name]?.[String(record[f.name])]
                  }
                />
              </dd>
            </div>
          ))}
        </dl>
        <ActivityTimeline
          objectName={object.nameSingular}
          recordId={recordId}
        />
      </div>
    </div>
  )
}
