import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/tenant-context"

export default async function DashboardPage() {
  const ctx = await getTenantContext()
  const workspace = ctx
    ? await db.workspace.findUnique({
        where: { id: ctx.workspaceId },
        select: { name: true, subdomain: true, createdAt: true },
      })
    : null

  const stats = [
    { label: "Companies", value: 0 },
    { label: "People", value: 0 },
    { label: "Opportunities", value: 0 },
  ]

  return (
    <div className="container-wrapper py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {workspace?.name ?? "Dashboard"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your workspace is ready. CRM records arrive as the metadata engine comes
        online (Phase 2–3).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
