import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { can } from "@/lib/permissions"
import { getTenantContext } from "@/lib/tenant-context"
import { MembersManager } from "@/components/platform/members/members-manager"

// Members settings — the roster + pending invites + invite form. Gated server-
// side to manage_members (the sidebar link is also hidden for everyone else).
export async function MembersContent({ lang }: { lang: string }) {
  const ctx = await getTenantContext()
  if (!ctx?.userId) redirect(`/${lang}/login`)
  if (!can(ctx.role, "manage_members", ctx.isPlatformAdmin))
    redirect(`/${lang}`)

  const [members, invites] = await Promise.all([
    db.member.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.invitation.findMany({
      where: { workspaceId: ctx.workspaceId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true },
    }),
  ])

  return (
    <div className="container-wrapper py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Members</h1>
      <MembersManager
        lang={lang}
        members={members.map((m) => ({
          id: m.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          isSelf: m.userId === ctx.userId,
          isOwner: m.role === "OWNER",
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
        }))}
      />
    </div>
  )
}
