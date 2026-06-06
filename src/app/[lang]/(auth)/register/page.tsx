import Link from "next/link"

import { RegisterForm } from "@/components/auth/register-form"
import { AuthShell } from "@/components/template/auth-shell"

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  return (
    <AuthShell
      lang={lang}
      title="Create your account"
      subtitle="Start your CRM in a minute"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/${lang}/login`}
            className="underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
