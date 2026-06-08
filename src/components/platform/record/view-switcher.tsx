"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"

// Table ↔ Board toggle for a record list, plus the group-by field picker when the
// board is active. Drives the `view` / `group` URL params the server reads in
// RecordContent; switching to Board defaults the group to the first groupable
// SELECT field. Mirrors Twenty's per-view type switch + "Group by" menu.
export function ViewSwitcher({
  groupables,
  view,
  group,
}: {
  groupables: { name: string; label: string }[]
  view: "table" | "board"
  group?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const navigate = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k)
      else sp.set(k, v)
    }
    const qs = sp.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const hasGroupables = groupables.length > 0

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex overflow-hidden rounded-md border">
        <Button
          type="button"
          variant={view === "table" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-none border-0"
          onClick={() => navigate({ view: null, group: null })}
        >
          Table
        </Button>
        <Button
          type="button"
          variant={view === "board" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-none border-0"
          disabled={!hasGroupables}
          title={hasGroupables ? undefined : "No SELECT field to group by"}
          onClick={() =>
            navigate({ view: "board", group: group ?? groupables[0]?.name })
          }
        >
          Board
        </Button>
      </div>

      {view === "board" && hasGroupables ? (
        <select
          aria-label="Group by"
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          value={group ?? groupables[0]?.name}
          onChange={(e) => navigate({ view: "board", group: e.target.value })}
        >
          {groupables.map((g) => (
            <option key={g.name} value={g.name}>
              {g.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  )
}
