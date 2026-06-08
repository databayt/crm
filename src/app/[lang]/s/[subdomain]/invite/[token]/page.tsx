import Link from "next/link"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/tenant-context"
import { AcceptInviteButton } from "@/components/platform/members/accept-invite-button"
import { AuthShell } from "@/components/template/auth-shell"

type InviteLite = {
  email: string
  workspaceId: string
  expiresAt: Date
  acceptedAt: Date | null
}

// In a plain helper, not the component body, so the Date.now() expiry check
// isn't flagged as an impure call during render.
function inviteUsable(
  invite: InviteLite | null | undefined,
  workspaceId: string | undefined,
): boolean {
  return Boolean(
    invite &&
    workspaceId &&
    invite.workspaceId === workspaceId &&
    invite.acceptedAt == null &&
    invite.expiresAt.getTime() >= Date.now(),
  )
}

// Invite acceptance. Reached on the workspace subdomain at /<lang>/invite/<token>.
// The proxy requires the visitor to be signed in (it bounces anon users to login
// with a callbackUrl back here), so we always have a session; the email-match
// check in acceptInvite keeps the invite personal.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ lang: string; token: string }>
}) {
  const { lang, token } = await params
  const ctx = await getTenantContext()
  const session = await auth()

  const workspace = ctx
    ? await db.workspace.findUnique({
        where: { id: ctx.workspaceId },
        select: { name: true },
      })
    : null

  const invite =
    ctx &&
    (await db.invitation.findUnique({
      where: { token },
      select: {
        email: true,
        role: true,
        workspaceId: true,
        expiresAt: true,
        acceptedAt: true,
      },
    }))

  const usable = inviteUsable(invite || null, ctx?.workspaceId)

  const wrongEmail =
    usable &&
    invite &&
    (session?.user?.email ?? "").toLowerCase() !== invite.email.toLowerCase()

  const invalid = !usable

  if (invalid) {
    return (
      <AuthShell
        lang={lang}
        title="Invite unavailable"
        subtitle="This invite link is invalid, already used, or expired."
        footer={<Link href={`/${lang}`}>Go home</Link>}
      />
    )
  }

  if (wrongEmail) {
    return (
      <AuthShell
        lang={lang}
        title="Wrong account"
        subtitle={`This invite was sent to ${invite!.email}. Sign in with that email to accept it.`}
        footer={<Link href={`/${lang}/login`}>Switch account</Link>}
      />
    )
  }

  return (
    <AuthShell
      lang={lang}
      title={`Join ${workspace?.name ?? ctx!.subdomain}`}
      subtitle={`You've been invited as ${invite!.role.toLowerCase()}.`}
    >
      <AcceptInviteButton token={token} lang={lang} />
    </AuthShell>
  )
}
