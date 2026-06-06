import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { workspaceUrl } from "@/lib/urls"
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form"
import { AuthShell } from "@/components/template/auth-shell"

export default async function JoinPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${lang}/login`)

  // Returning user who already belongs to a workspace → send them straight in.
  const membership = await db.member.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { workspace: { select: { subdomain: true } } },
  })
  if (membership) redirect(workspaceUrl(membership.workspace.subdomain, lang))

  return (
    <AuthShell
      lang={lang}
      title="Create a workspace"
      subtitle="Your CRM lives at its own subdomain"
    >
      <CreateWorkspaceForm lang={lang} />
    </AuthShell>
  )
}
