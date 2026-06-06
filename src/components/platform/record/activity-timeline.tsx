import { getObject, relationTarget, selectChoices } from "@/lib/metadata"
import { listRecords } from "@/lib/query-builder"
import { requireTenant } from "@/lib/tenant-context"
import { ActivityComposer } from "@/components/platform/record/activity-composer"
import { FieldCell } from "@/components/platform/record/field-cell"

// Polymorphic activity timeline for a record. Finds the activity field that
// points back to this object (company_id / person_id / opportunity_id) and lists
// activities filtered by it. Activities are themselves a metadata object, so this
// reuses the same query-builder path.
export async function ActivityTimeline({
  objectName,
  recordId,
}: {
  objectName: string
  recordId: string
}) {
  const { workspaceId, pgSchema } = await requireTenant()
  const activity = await getObject(workspaceId, "activity")
  if (!activity) return null

  const relField =
    activity.fields.find((f) => relationTarget(f) === objectName)?.name ?? null

  const rows = relField
    ? await listRecords(pgSchema, activity.tableName, activity.fieldMap, {
        filters: [{ column: relField, value: recordId }],
        orderBy: { column: "created_at", dir: "desc" },
        limit: 50,
      })
    : []

  const typeField = activity.fields.find((f) => f.name === "type")
  const typeChoices = typeField ? selectChoices(typeField) : []

  return (
    <aside className="h-fit rounded-lg border">
      <div className="border-b p-4">
        <h2 className="text-sm font-medium">Activity</h2>
      </div>
      {relField ? (
        <div className="border-b p-4">
          <ActivityComposer
            recordId={recordId}
            relationField={relField}
            typeChoices={typeChoices}
          />
        </div>
      ) : null}
      <div className="divide-y">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          rows.map((a) => (
            <div key={String(a.id)} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {String(a.type ?? "NOTE")}
                </span>
                <span className="text-xs text-muted-foreground">
                  <FieldCell
                    field={{ type: "DATETIME", name: "created_at" }}
                    value={a.created_at}
                  />
                </span>
              </div>
              {a.title ? (
                <div className="mt-1 text-sm font-medium">
                  {String(a.title)}
                </div>
              ) : null}
              {a.body ? (
                <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                  {String(a.body)}
                </p>
              ) : null}
              {a.status ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {String(a.status)}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
