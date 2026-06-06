import Link from "next/link"

import { logout } from "@/components/auth/actions"
import { Button } from "@/components/ui/button"

export interface NavObject {
  namePlural: string
  labelPlural: string
}

export function PlatformShell({
  lang,
  workspaceName,
  role,
  nav,
  objects,
  children,
}: {
  lang: string
  workspaceName: string
  role: string
  nav: Record<string, string>
  objects: NavObject[]
  children: React.ReactNode
}) {
  const linkClass =
    "hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm transition-colors"

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-60 shrink-0 flex-col gap-1 border-e bg-sidebar p-3 text-sidebar-foreground">
        <div className="px-2 py-3">
          <div className="truncate font-semibold">{workspaceName}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          <Link href={`/${lang}`} className={linkClass}>
            {nav.dashboard ?? "Dashboard"}
          </Link>
          {objects.map((o) => (
            <Link
              key={o.namePlural}
              href={`/${lang}/${o.namePlural}`}
              className={linkClass}
            >
              {nav[o.namePlural] ?? o.labelPlural}
            </Link>
          ))}
          <Link href={`/${lang}/pipeline`} className={linkClass}>
            {nav.pipeline ?? "Pipeline"}
          </Link>
        </nav>
        <form action={logout} className="mt-auto">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            Sign out
          </Button>
        </form>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
