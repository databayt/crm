import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"
import { AuthShell } from "@/components/template/auth-shell"

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { lang } = await params
  const { callbackUrl } = await searchParams

  return (
    <AuthShell
      lang={lang}
      title="Welcome back"
      subtitle="Sign in to your CRM"
      footer={
        <>
          No account?{" "}
          <Link
            href={`/${lang}/register`}
            className="underline underline-offset-4"
          >
            Create one
          </Link>
        </>
      }
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  )
}
