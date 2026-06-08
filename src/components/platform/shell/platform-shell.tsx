import Link from "next/link"
import { Star } from "lucide-react"

import { logout } from "@/components/auth/actions"
import { CommandMenu } from "@/components/platform/command-menu/command-menu"
import { Button } from "@/components/ui/button"

export interface NavObject {
  namePlural: string
  labelPlural: string
  labelSingular: string
}

export interface FavoriteLink {
  id: string
  label: string
  href: string
}

export function PlatformShell({
  lang,
  workspaceName,
  role,
  nav,
  objects,
  canManageObjects,
  canManageMembers,
  canEdit,
  favorites,
  children,
}: {
  lang: string
  workspaceName: string
  role: string
  nav: Record<string, string>
  objects: NavObject[]
  canManageObjects: boolean
  canManageMembers: boolean
  canEdit: boolean
  favorites: FavoriteLink[]
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
        <div className="mb-2">
          <CommandMenu
            lang={lang}
            objects={objects}
            canEdit={canEdit}
            canManageObjects={canManageObjects}
            canManageMembers={canManageMembers}
          />
        </div>
        <nav className="flex flex-col gap-0.5">
          <Link href={`/${lang}`} className={linkClass}>
            {nav.dashboard ?? "Dashboard"}
          </Link>

          {favorites.length > 0 ? (
            <div className="mt-2 mb-1">
              <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                {nav.favorites ?? "Favorites"}
              </div>
              {favorites.map((f) => (
                <Link
                  key={f.id}
                  href={f.href}
                  className={`${linkClass} flex items-center gap-2`}
                >
                  <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                  <span className="truncate">{f.label}</span>
                </Link>
              ))}
            </div>
          ) : null}

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
          {canManageMembers ? (
            <Link href={`/${lang}/settings/members`} className={linkClass}>
              {nav.members ?? "Members"}
            </Link>
          ) : null}
          {canManageObjects ? (
            <Link href={`/${lang}/settings`} className={linkClass}>
              {nav.settings ?? "Settings"}
            </Link>
          ) : null}
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
