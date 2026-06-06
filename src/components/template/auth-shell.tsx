import Link from "next/link"

export function AuthShell({
  lang,
  title,
  subtitle,
  children,
  footer,
}: {
  lang: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href={`/${lang}`}
            className="text-lg font-semibold tracking-tight"
          >
            CRM
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children}
        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  )
}
