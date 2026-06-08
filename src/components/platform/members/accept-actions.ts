"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/tenant-context"

export type AcceptResult = { error?: string; ok?: boolean; subdomain?: string }

// Accept an invite link: bind the signed-in user to the workspace with the
// invited role. The invite is personal — the signed-in user's email must match
// the invited email (Twenty's context.email === email check), so a forwarded
// link can't be redeemed by the wrong person.
export async function acceptInvite(token: string): Promise<AcceptResult> {
  const ctx = await getTenantContext()
  if (!ctx) return { error: "Unknown workspace" }

  const session = await auth()
  const userId = session?.user?.id
  const userEmail = session?.user?.email ?? ""
  if (!userId) return { error: "Please sign in to accept this invite" }

  const invite = await db.invitation.findUnique({ where: { token } })
  if (!invite || invite.workspaceId !== ctx.workspaceId) {
    return { error: "This invite link is invalid" }
  }
  if (invite.acceptedAt) return { error: "This invite has already been used" }
  if (invite.expiresAt.getTime() < Date.now()) {
    return { error: "This invite has expired" }
  }
  if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return { error: `This invite was sent to ${invite.email}` }
  }

  // Idempotent + race-safe: member.upsert can run twice harmlessly, and the
  // acceptedAt flip is a compare-and-set (WHERE acceptedAt IS NULL) so a
  // concurrent second accept of the same invite is simply a no-op.
  await db.member.upsert({
    where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    create: { userId, workspaceId: invite.workspaceId, role: invite.role },
    update: { role: invite.role },
  })
  await db.invitation.updateMany({
    where: { id: invite.id, acceptedAt: null },
    data: { acceptedAt: new Date() },
  })

  return { ok: true, subdomain: ctx.subdomain }
}
