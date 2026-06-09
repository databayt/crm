import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { listObjects } from "@/lib/metadata"
import { can } from "@/lib/permissions"
import { getTenantContext } from "@/lib/tenant-context"
import type { Locale } from "@/components/internationalization/config"
import { getDictionary } from "@/components/internationalization/dictionaries"
import { PlatformShell } from "@/components/platform/shell/platform-shell"

export default async function PlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string; subdomain: string }>
}) {
  const { lang } = await params
  const ctx = await getTenantContext()

  // Unknown subdomain or signed-out → login. Signed in but not a member → join.
  if (!ctx) redirect(`/${lang}/login`)
  if (!ctx.userId) redirect(`/${lang}/login`)
  if (!ctx.memberId && !ctx.isPlatformAdmin) redirect(`/${lang}/join`)

  const [workspace, dict, objects] = await Promise.all([
    db.workspace.findUnique({
      where: { id: ctx.workspaceId },
      select: { name: true },
    }),
    getDictionary(lang as Locale),
    listObjects(ctx.workspaceId),
  ])

  // Sidebar favorites for the current member (object id → plural for the link).
  const rawFavorites = ctx.memberId
    ? await db.favorite.findMany({
        where: { workspaceId: ctx.workspaceId, memberId: ctx.memberId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, label: true, objectId: true, recordId: true },
      })
    : []
  const pluralById = new Map(objects.map((o) => [o.id, o.namePlural]))
  const favorites = rawFavorites.flatMap((f) => {
    const plural = f.objectId ? pluralById.get(f.objectId) : undefined
    if (!plural) return []
    const href = f.recordId
      ? `/${lang}/${plural}/${f.recordId}`
      : `/${lang}/${plural}`
    return [{ id: f.id, label: f.label, href }]
  })

  const pa = ctx.isPlatformAdmin
  return (
    <PlatformShell
      lang={lang}
      workspaceName={workspace?.name ?? ctx.subdomain}
      role={ctx.role ?? (pa ? "PLATFORM_ADMIN" : "MEMBER")}
      nav={dict.nav}
      objects={objects.map((o) => ({
        namePlural: o.namePlural,
        labelPlural: o.labelPlural,
        labelSingular: o.labelSingular,
        icon: o.icon,
      }))}
      canManageObjects={can(ctx.role, "manage_objects", pa)}
      canManageMembers={can(ctx.role, "manage_members", pa)}
      canEdit={can(ctx.role, "edit_records", pa)}
      favorites={favorites}
    >
      {children}
    </PlatformShell>
  )
}
