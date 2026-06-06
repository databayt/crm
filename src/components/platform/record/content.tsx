import { notFound } from "next/navigation"

import { db } from "@/lib/db"
import { getObjectByPlural } from "@/lib/metadata"
import { countRecords, listRecords } from "@/lib/query-builder"
import { getRelationOptions, resolveRelationLabels } from "@/lib/record-data"
import { requireTenant } from "@/lib/tenant-context"
import { RecordForm } from "@/components/platform/record/record-form"
import { RecordTable } from "@/components/platform/record/record-table"
import { RecordToolbar } from "@/components/platform/record/record-toolbar"
import type { ViewConfig } from "@/components/platform/record/view-actions"

const PAGE_SIZE = 25

export async function RecordContent({
  lang,
  objectPlural,
  searchParams,
}: {
  lang: string
  objectPlural: string
  searchParams: { q?: string; page?: string; sort?: string; dir?: string }
}) {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObjectByPlural(workspaceId, objectPlural)
  if (!object) notFound()

  const q = searchParams.q ?? ""
  const page = Math.max(1, Number(searchParams.page) || 1)
  const sortCol =
    searchParams.sort && object.fieldMap[searchParams.sort]
      ? searchParams.sort
      : undefined
  const dir = searchParams.dir === "desc" ? "desc" : "asc"

  const [rows, total] = await Promise.all([
    listRecords(pgSchema, object.tableName, object.fieldMap, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      search: q,
      orderBy: sortCol ? { column: sortCol, dir } : undefined,
    }),
    countRecords(pgSchema, object.tableName, object.fieldMap, q),
  ])

  const [relationOptions, relationLabels] = await Promise.all([
    getRelationOptions(workspaceId, pgSchema, object),
    resolveRelationLabels(workspaceId, pgSchema, object, rows),
  ])

  const views = await db.view.findMany({
    where: { workspaceId, objectId: object.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, config: true },
  })

  const tableFields = object.fields.map((f) => ({
    name: f.name,
    label: f.label,
    type: f.type,
  }))

  return (
    <div className="container-wrapper py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {object.labelPlural}
          </h1>
        </div>
        <RecordForm
          objectName={object.nameSingular}
          objectLabel={object.labelSingular}
          fields={object.fields}
          relationOptions={relationOptions}
        />
      </div>
      <div className="mb-4">
        <RecordToolbar
          objectName={object.nameSingular}
          views={views.map((v) => ({
            id: v.id,
            name: v.name,
            config: (v.config ?? {}) as unknown as ViewConfig,
          }))}
          fields={object.fields.map((f) => ({ name: f.name, label: f.label }))}
        />
      </div>
      <RecordTable
        objectName={object.nameSingular}
        basePath={`/${lang}/${object.namePlural}`}
        fields={tableFields}
        rows={rows}
        total={total}
        pageSize={PAGE_SIZE}
        relationLabels={relationLabels}
        displayField={object.displayField}
      />
    </div>
  )
}
