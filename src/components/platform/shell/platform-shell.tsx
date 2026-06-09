"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Settings,
  Star,
  Building2,
  User,
  Target,
  Activity,
  FileText,
  LogOut,
} from "lucide-react"

import { logout } from "@/components/auth/actions"
import { CommandMenu } from "@/components/platform/command-menu/command-menu"
import { Button } from "@/components/ui/button"

export interface NavObject {
  namePlural: string
  labelPlural: string
  labelSingular: string
  icon?: string | null
}

export interface FavoriteLink {
  id: string
  label: string
  href: string
}

function getIcon(name?: string | null) {
  switch (name) {
    case "building-2":
    case "company":
      return Building2
    case "user":
    case "person":
      return User
    case "target":
    case "opportunity":
      return Target
    case "activity":
      return Activity
    case "settings":
      return Settings
    case "members":
      return Users
    case "pipeline":
      return KanbanSquare
    case "dashboard":
      return LayoutDashboard
    default:
      return FileText
  }
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
  const pathname = usePathname()

  // Generate initials for the workspace avatar badge
  const initials = workspaceName
    ? workspaceName
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "WS"

  const getLinkClass = (href: string) => {
    const isActive = pathname === href || pathname?.startsWith(`${href}/`)
    return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-primary text-primary-foreground shadow-xs"
        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
    }`
  }

  const sectionHeaderClass =
    "px-3 mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="flex w-64 shrink-0 flex-col gap-1 border-e border-border/60 bg-sidebar p-4 text-sidebar-foreground">
        {/* Workspace Banner */}
        <div className="mb-2 flex items-center gap-3 px-1 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 font-semibold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-foreground/90">
              {workspaceName}
            </div>
            <div className="truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {role.replace("_", " ")}
            </div>
          </div>
        </div>

        {/* Command Search */}
        <div className="mb-4">
          <CommandMenu
            lang={lang}
            objects={objects}
            canEdit={canEdit}
            canManageObjects={canManageObjects}
            canManageMembers={canManageMembers}
          />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {/* Workspace Section */}
          <div className={sectionHeaderClass}>
            {nav.workspace ?? "Workspace"}
          </div>

          <Link href={`/${lang}`} className={getLinkClass(`/${lang}`)}>
            <LayoutDashboard className="size-4 shrink-0" />
            <span>{nav.dashboard ?? "Dashboard"}</span>
          </Link>

          <Link
            href={`/${lang}/pipeline`}
            className={getLinkClass(`/${lang}/pipeline`)}
          >
            <KanbanSquare className="size-4 shrink-0" />
            <span>{nav.pipeline ?? "Pipeline"}</span>
          </Link>

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <>
              <div className={sectionHeaderClass}>
                {nav.favorites ?? "Favorites"}
              </div>
              {favorites.map((f) => (
                <Link key={f.id} href={f.href} className={getLinkClass(f.href)}>
                  <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
                  <span className="truncate">{f.label}</span>
                </Link>
              ))}
            </>
          )}

          {/* CRM Objects Section */}
          <div className={sectionHeaderClass}>{nav.objects ?? "Objects"}</div>

          {objects.map((o) => {
            const IconComponent = getIcon(o.icon)
            const href = `/${lang}/${o.namePlural}`
            return (
              <Link
                key={o.namePlural}
                href={href}
                className={getLinkClass(href)}
              >
                <IconComponent className="size-4 shrink-0" />
                <span className="truncate">
                  {nav[o.namePlural] ?? o.labelPlural}
                </span>
              </Link>
            )
          })}

          {/* Settings Section */}
          {(canManageMembers || canManageObjects) && (
            <>
              <div className={sectionHeaderClass}>
                {nav.settings ?? "Settings"}
              </div>

              {canManageMembers && (
                <Link
                  href={`/${lang}/settings/members`}
                  className={getLinkClass(`/${lang}/settings/members`)}
                >
                  <Users className="size-4 shrink-0" />
                  <span>{nav.members ?? "Members"}</span>
                </Link>
              )}

              {canManageObjects && (
                <Link
                  href={`/${lang}/settings`}
                  className={getLinkClass(`/${lang}/settings`)}
                >
                  <Settings className="size-4 shrink-0" />
                  <span>{nav.settings ?? "Settings"}</span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Footer actions */}
        <div className="mt-auto border-t border-border/50 pt-4">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <LogOut className="size-4 shrink-0" />
              <span>{nav.signout ?? "Sign out"}</span>
            </Button>
          </form>
        </div>
      </aside>

      {/* Content Area */}
      <main className="min-w-0 flex-1 overflow-y-auto bg-background/50">
        {children}
      </main>
    </div>
  )
}
