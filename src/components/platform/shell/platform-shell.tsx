import Link from "next/link"

import { logout } from "@/components/auth/actions"
import { Button } from "@/components/ui/button"

const NAV = [
  { key: "dashboard", href: "" },
  { key: "companies", href: "/companies" },
  { key: "people", href: "/people" },
  { key: "opportunities", href: "/opportunities" },
  { key: "pipeline", href: "/pipeline" },
  { key: "settings", href: "/settings" },
] as const

export function PlatformShell({
  lang,
  workspaceName,
  role,
  nav,
  children,
}: {
  lang: string
  workspaceName: string
  role: string
  nav: Record<string, string>
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      <aside className="flex w-60 shrink-0 flex-col gap-1 border-e bg-sidebar p-3 text-sidebar-foreground">
        <div className="px-2 py-3">
          <div className="truncate font-semibold">{workspaceName}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={`/${lang}${item.href}`}
              className="rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
            >
              {nav[item.key] ?? item.key}
            </Link>
          ))}
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
