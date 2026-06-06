import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { listObjects } from "@/lib/metadata"
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

  return (
    <PlatformShell
      lang={lang}
      workspaceName={workspace?.name ?? ctx.subdomain}
      role={ctx.role ?? (ctx.isPlatformAdmin ? "PLATFORM_ADMIN" : "MEMBER")}
      nav={dict.nav}
      objects={objects.map((o) => ({
        namePlural: o.namePlural,
        labelPlural: o.labelPlural,
      }))}
    >
      {children}
    </PlatformShell>
  )
}
