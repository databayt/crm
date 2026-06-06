import Link from "next/link"

import { db } from "@/lib/db"
import { listObjects } from "@/lib/metadata"
import { countRecords } from "@/lib/query-builder"
import { getTenantContext } from "@/lib/tenant-context"

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
    </div>
  )
}
