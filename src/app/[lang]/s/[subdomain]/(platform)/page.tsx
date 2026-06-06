import Link from "next/link"

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
    <div className="container-wrapper py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {workspace?.name ?? "Dashboard"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your CRM at a glance.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {objects.map((o, i) => (
          <Link
            key={o.id}
            href={`/${lang}/${o.namePlural}`}
            className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
          >
            <div className="text-sm text-muted-foreground">{o.labelPlural}</div>
            <div className="mt-1 text-2xl font-semibold">{counts[i]}</div>
          </Link>
        ))}
      </div>

      {pipeline.length > 0 ? (
        <div className="mt-8 rounded-lg border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Pipeline</h2>
            <span className="text-sm text-muted-foreground">
              {fmtCurrency(totalValue)} total
            </span>
          </div>
          <div className="space-y-3">
            {pipeline.map((p) => (
              <div key={p.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{p.stage}</span>
                  <span className="text-muted-foreground">
                    {p.count} · {fmtCurrency(p.value)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.round((p.value / maxValue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
