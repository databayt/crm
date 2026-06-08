"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  searchRecords,
  type SearchGroup,
} from "@/components/platform/command-menu/search-action"

export interface CommandObject {
  namePlural: string
  labelPlural: string
  labelSingular: string
}

// Cmd/Ctrl+K command palette: jump to objects/pipeline/settings, quick-create,
// and live cross-object record search. Built on cmdk (shadcn command) — we drive
// filtering ourselves (shouldFilter=false) so server search results always show
// while the static navigate/create commands filter by substring.
export function CommandMenu({
  lang,
  objects,
  canEdit,
  canManageObjects,
  canManageMembers,
}: {
  lang: string
  objects: CommandObject[]
  canEdit: boolean
  canManageObjects: boolean
  canManageMembers: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [, startSearch] = useTransition()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // Debounced cross-object record search. Skipped (and cleared) when the dialog
  // is closed so a pending timer can't fire a search after close.
  useEffect(() => {
    const term = query.trim()
    if (!open || term.length < 2) {
      setGroups([])
      return
    }
    const t = setTimeout(() => {
      startSearch(async () => setGroups(await searchRecords(term)))
    }, 250)
    return () => clearTimeout(t)
  }, [query, open])

  const navItems = useMemo(() => {
    const items = objects.map((o) => ({
      key: `nav-${o.namePlural}`,
      label: `Go to ${o.labelPlural}`,
      href: `/${lang}/${o.namePlural}`,
    }))
    items.push({
      key: "nav-pipeline",
      label: "Go to Pipeline",
      href: `/${lang}/pipeline`,
    })
    if (canManageMembers)
      items.push({
        key: "nav-members",
        label: "Go to Members",
        href: `/${lang}/settings/members`,
      })
    if (canManageObjects)
      items.push({
        key: "nav-settings",
        label: "Go to Settings",
        href: `/${lang}/settings`,
      })
    return items
  }, [objects, lang, canManageMembers, canManageObjects])

  const createItems = useMemo(
    () =>
      canEdit
        ? objects.map((o) => ({
            key: `create-${o.namePlural}`,
            label: `Create ${o.labelSingular}`,
            href: `/${lang}/${o.namePlural}`,
          }))
        : [],
    [objects, lang, canEdit],
  )

  const q = query.trim().toLowerCase()
  const matches = (label: string) => !q || label.toLowerCase().includes(q)
  const nav = navItems.filter((i) => matches(i.label))
  const create = createItems.filter((i) => matches(i.label))

  const go = (href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent"
      >
        <SearchIcon className="size-4" />
        <span>Search…</span>
        <CommandShortcut className="ms-auto">⌘K</CommandShortcut>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search records or jump to…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>

            {nav.length > 0 ? (
              <CommandGroup heading="Navigate">
                {nav.map((i) => (
                  <CommandItem
                    key={i.key}
                    value={i.key}
                    onSelect={() => go(i.href)}
                  >
                    {i.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {create.length > 0 ? (
              <CommandGroup heading="Create">
                {create.map((i) => (
                  <CommandItem
                    key={i.key}
                    value={i.key}
                    onSelect={() => go(i.href)}
                  >
                    <PlusIcon />
                    {i.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {groups.map((g) => (
              <CommandGroup key={g.namePlural} heading={g.objectLabel}>
                {g.hits.map((h) => (
                  <CommandItem
                    key={`${g.namePlural}-${h.recordId}`}
                    value={`${g.namePlural}-${h.recordId}`}
                    onSelect={() =>
                      go(`/${lang}/${g.namePlural}/${h.recordId}`)
                    }
                  >
                    {h.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
