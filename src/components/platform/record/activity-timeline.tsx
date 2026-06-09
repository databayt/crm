import {
  FileText,
  CheckSquare,
  Mail,
  Phone,
  Calendar,
  Activity,
  Clock,
  User,
} from "lucide-react"

import { getObject, relationTarget, selectChoices } from "@/lib/metadata"
import { listRecords } from "@/lib/query-builder"
import { requireTenant } from "@/lib/tenant-context"
import { ActivityComposer } from "@/components/platform/record/activity-composer"

function getActivityIcon(type: string) {
  switch (type) {
    case "NOTE":
      return FileText
    case "TASK":
      return CheckSquare
    case "EMAIL":
      return Mail
    case "CALL":
      return Phone
    case "MEETING":
      return Calendar
    default:
      return Activity
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case "NOTE":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20"
    case "TASK":
      return "bg-green-500/10 text-green-500 border-green-500/20"
    case "EMAIL":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    case "CALL":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20"
    case "MEETING":
      return "bg-rose-500/10 text-rose-500 border-rose-500/20"
    default:
      return "bg-primary/10 text-primary border-primary/20"
  }
}

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
    <aside className="h-fit rounded-lg border bg-card/40 shadow-xs">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold tracking-tight">Activity</h2>
      </div>
      {relField ? (
        <div className="border-b bg-muted/10 p-4">
          <ActivityComposer
            recordId={recordId}
            relationField={relField}
            typeChoices={typeChoices}
          />
        </div>
      ) : null}
      <div className="p-5">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="mb-2 size-8 stroke-1 text-muted-foreground/45" />
            <p className="text-sm font-medium text-muted-foreground">
              No activity yet.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Use the form above to log notes or events.
            </p>
          </div>
        ) : (
          <div className="relative ms-3 space-y-6 border-s border-border/50">
            {rows.map((a) => {
              const Icon = getActivityIcon(String(a.type))
              const colorClass = getActivityColor(String(a.type))
              const date = a.created_at ? new Date(String(a.created_at)) : null
              const timeStr = date
                ? date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""

              return (
                <div key={String(a.id)} className="group relative ps-6">
                  {/* Timeline icon marker */}
                  <div
                    className={`absolute -start-3 top-0.5 flex size-6 items-center justify-center rounded-full border bg-card text-[10px] shadow-xs ${colorClass}`}
                  >
                    <Icon className="size-3" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground/90 uppercase">
                          {String(a.type ?? "NOTE")}
                        </span>
                        {a.status ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {String(a.status)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                        <User className="size-3 text-muted-foreground/60" />
                        <span>Member</span>
                        <span>•</span>
                        <Clock className="size-3 text-muted-foreground/60" />
                        <span>{timeStr}</span>
                      </div>
                    </div>

                    {a.title ? (
                      <h4 className="mt-1 text-sm font-semibold text-foreground/90">
                        {String(a.title)}
                      </h4>
                    ) : null}

                    {a.body ? (
                      <p className="mt-1 line-clamp-4 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground/95">
                        {String(a.body)}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
