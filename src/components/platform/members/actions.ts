"use server"

import type { MemberRole } from "@prisma/client"

import { authorize } from "@/lib/authz"
import { db } from "@/lib/db"
import {
  generateInviteToken,
  inviteExpiry,
  inviteUrl,
} from "@/lib/invite-token"
import { isAssignableRole } from "@/lib/permissions"
import { InviteSchema } from "./validation"

export type MembersResult = {
  error?: string
  ok?: boolean
  inviteLink?: string
}

// Invite a person by email with a role. No email infra → we return a copyable
// invite link (the token in its path). Resending to the same email refreshes the
// token in place (the @@unique([workspaceId,email]) upsert), matching Twenty's
// "one pending invite per email" guard + resend behaviour.
export async function inviteMember(
  input: { email: string; role: string },
  lang: string,
): Promise<MembersResult> {
  const authz = await authorize("manage_members")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, subdomain, memberId } = authz.ctx

  const parsed = InviteSchema.safeParse(input)
  if (!parsed.success) return { error: "Enter a valid email and role" }
  const { email, role } = parsed.data

  const alreadyMember = await db.member.findFirst({
    where: { workspaceId, user: { email } },
    select: { id: true },
  })
  if (alreadyMember) return { error: "That person is already a member" }

  const token = generateInviteToken()
  await db.invitation.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    create: {
      workspaceId,
      email,
      role: role as MemberRole,
      token,
      expiresAt: inviteExpiry(),
      invitedById: memberId,
    },
    update: {
      role: role as MemberRole,
      token,
      expiresAt: inviteExpiry(),
      acceptedAt: null,
      invitedById: memberId,
    },
  })

  return { ok: true, inviteLink: inviteUrl(subdomain, lang, token) }
}

export async function resendInvite(
  invitationId: string,
  lang: string,
): Promise<MembersResult> {
  const authz = await authorize("manage_members")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, subdomain } = authz.ctx

  const invite = await db.invitation.findFirst({
    where: { id: invitationId, workspaceId, acceptedAt: null },
  })
  if (!invite) return { error: "Invite not found" }

  const token = generateInviteToken()
  await db.invitation.update({
    where: { id: invite.id },
    data: { token, expiresAt: inviteExpiry() },
  })
  return { ok: true, inviteLink: inviteUrl(subdomain, lang, token) }
}

export async function revokeInvite(
  invitationId: string,
): Promise<MembersResult> {
  const authz = await authorize("manage_members")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId } = authz.ctx

  await db.invitation.deleteMany({
    where: { id: invitationId, workspaceId, acceptedAt: null },
  })
  return { ok: true }
}

export async function changeMemberRole(
  memberId: string,
  role: string,
): Promise<MembersResult> {
  const authz = await authorize("manage_members")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, userId } = authz.ctx

  // isAssignableRole rejects OWNER and any non-role string from the client.
  if (!isAssignableRole(role)) return { error: "Invalid role" }

  const target = await db.member.findFirst({
    where: { id: memberId, workspaceId },
    select: { id: true, role: true, userId: true },
  })
  if (!target) return { error: "Member not found" }
  if (target.role === "OWNER") return { error: "The owner's role can't change" }
  if (target.userId === userId) {
    return { error: "You can't change your own role" }
  }

  await db.member.update({ where: { id: target.id }, data: { role } })
  return { ok: true }
}

export async function removeMember(memberId: string): Promise<MembersResult> {
  const authz = await authorize("manage_members")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, userId } = authz.ctx

  const target = await db.member.findFirst({
    where: { id: memberId, workspaceId },
    select: { id: true, role: true, userId: true },
  })
  if (!target) return { error: "Member not found" }
  if (target.role === "OWNER") return { error: "The owner can't be removed" }
  if (target.userId === userId) return { error: "You can't remove yourself" }

  await db.member.delete({ where: { id: target.id } })
  return { ok: true }
}
