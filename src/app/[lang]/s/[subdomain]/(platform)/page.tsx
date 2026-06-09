import Link from "next/link"
import {
  Building2,
  User,
  Target,
  Activity,
  FileText,
  CheckSquare,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react"

import { db } from "@/lib/db"
import { listObjects, selectChoices } from "@/lib/metadata"
import { countRecords, listRecords } from "@/lib/query-builder"
import { getTenantContext } from "@/lib/tenant-context"

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function getObjectIcon(name: string) {
  switch (name) {
    case "company":
      return Building2
    case "person":
      return User
    case "opportunity":
      return Target
    case "activity":
      return Activity
    default:
      return FileText
  }
}

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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const ctx = await getTenantContext()
  if (!ctx) return null

  const [workspace, objects] = await Promise.all([
    db.workspace.findUnique({
      where: { id: ctx.workspaceId },
      select: { name: true },
    }),
    listObjects(ctx.workspaceId),
  ])
  const counts = await Promise.all(
    objects.map((o) => countRecords(ctx.pgSchema, o.tableName)),
  )

  // Fetch recent activities
  const activityObj = objects.find((o) => o.nameSingular === "activity")
  let recentActivities: Record<string, unknown>[] = []
  if (activityObj) {
    recentActivities = await listRecords(
      ctx.pgSchema,
      activityObj.tableName,
      activityObj.fieldMap,
      {
        limit: 5,
        orderBy: { column: "created_at", dir: "desc" },
      },
    )
  }

  // Pipeline summary: opportunities grouped by stage with total value.
  const opp = objects.find((o) => o.nameSingular === "opportunity")
  const stageField = opp?.fields.find((f) => f.name === "stage")
  const stages = stageField ? selectChoices(stageField) : []
  let pipeline: { stage: string; count: number; value: number }[] = []
  if (opp && stages.length > 0) {
    const rows = await listRecords(ctx.pgSchema, opp.tableName, opp.fieldMap, {
      limit: 200,
    })
    const agg = new Map<string, { count: number; value: number }>(
      stages.map((s) => [s, { count: 0, value: 0 }]),
    )
    for (const r of rows) {
      const st = stages.includes(String(r.stage)) ? String(r.stage) : stages[0]
      const e = agg.get(st)!
      e.count++
      e.value += Number(r.amount) || 0
    }
    pipeline = stages.map((s) => ({ stage: s, ...agg.get(s)! }))
  }
  const maxValue = Math.max(1, ...pipeline.map((p) => p.value))
  const totalValue = pipeline.reduce((a, p) => a + p.value, 0)

  return (
    <div className="container-wrapper space-y-10 py-10">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1.5 border-b border-border/50 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary/80 uppercase">
            <Sparkles className="size-3.5" />
            <span>Workspace Home</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground/90">
            {workspace?.name ?? "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            A beautiful, live snapshot of your team&apos;s deals and
            interactions.
          </p>
        </div>
        <div className="self-start rounded-lg border border-border/40 bg-muted/65 px-3 py-1.5 text-xs font-medium text-muted-foreground md:self-auto md:text-end">
          Subdomain:{" "}
          <span className="font-semibold text-foreground">{ctx.subdomain}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {objects.map((o, i) => {
          const IconComponent = getObjectIcon(o.nameSingular)
          return (
            <Link
              key={o.id}
              href={`/${lang}/${o.namePlural}`}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/15 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground/80">
                  {o.labelPlural}
                </span>
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <IconComponent className="size-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold tracking-tight">
                  {counts[i]}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/80">
                <span>View all records</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Dashboard Subsections Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pipeline Summary (Left 3 columns) */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs lg:col-span-3">
          <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground/90">
                <TrendingUp className="size-4.5 text-primary/80" />
                <span>Deal Pipeline</span>
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Summary of pipeline stages value.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {fmtCurrency(totalValue)} total
            </span>
          </div>

          {pipeline.length > 0 ? (
            <div className="space-y-4">
              {pipeline.map((p) => (
                <div key={p.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium sm:text-sm">
                    <span className="text-foreground/85">{p.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {p.count} deals
                      </span>
                      <span className="font-semibold text-foreground">
                        {fmtCurrency(p.value)}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{
                        width: `${Math.round((p.value / maxValue) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Target className="mb-2 size-10 stroke-1 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No active pipeline stages.
              </p>
            </div>
          )}
        </div>

        {/* Recent Activities (Right 2 columns) */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs lg:col-span-2">
          <div className="mb-6 border-b border-border/40 pb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground/90">
              <Activity className="size-4.5 text-primary/80" />
              <span>Recent Activities</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Latest logs across your workspace.
            </p>
          </div>

          {recentActivities.length > 0 ? (
            <div className="relative ms-3 space-y-5 border-s border-border/50">
              {recentActivities.map((act) => {
                const Icon = getActivityIcon(String(act.type))
                const colorClass = getActivityColor(String(act.type))
                const date = act.created_at
                  ? new Date(String(act.created_at))
                  : null
                const timeStr = date
                  ? date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""

                return (
                  <div key={String(act.id)} className="group relative ps-6">
                    {/* Bullet marker with icon */}
                    <div
                      className={`absolute -start-3 top-0.5 flex size-6 items-center justify-center rounded-full border bg-card text-[10px] shadow-xs ${colorClass}`}
                    >
                      <Icon className="size-3" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {timeStr}
                      </span>
                      <h4 className="truncate text-sm font-semibold text-foreground/90 transition-colors group-hover:text-primary">
                        {String(act.title || "Untitled log")}
                      </h4>
                      {act.body ? (
                        <p className="mt-1 line-clamp-2 rounded-lg border border-border/30 bg-muted/30 p-2 text-xs leading-relaxed text-muted-foreground/95">
                          {String(act.body)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-2 size-10 stroke-1 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No recent activity logged.
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
                Log activities (notes, tasks, calls, meetings) in detail views.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
