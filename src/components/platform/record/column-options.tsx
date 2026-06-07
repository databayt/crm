"use client"

import { useQueryStates } from "nuqs"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  colsToList,
  recordUrlOptions,
  recordUrlParsers,
} from "@/components/platform/record/record-url"

// Show/hide table columns. An empty `cols` param means "all visible" (the
// default); ticking columns narrows it to an explicit ordered subset.
export function ColumnOptions({
  fields,
}: {
  fields: { name: string; label: string }[]
}) {
  const [{ cols }, setQuery] = useQueryStates(
    recordUrlParsers,
    recordUrlOptions,
  )
  const selected = colsToList(cols)
  const isVisible = (name: string) =>
    selected.length === 0 || selected.includes(name)

  const toggle = (name: string) => {
    // Materialize the implicit "all" into an explicit list before narrowing.
    const current = selected.length === 0 ? fields.map((f) => f.name) : selected
    const next = current.includes(name)
      ? current.filter((c) => c !== name)
      : // keep original field order when re-adding
        fields
          .map((f) => f.name)
          .filter((n) => current.includes(n) || n === name)
    if (next.length === 0) return // never hide every column
    const allShown =
      next.length === fields.length &&
      fields.every((f) => next.includes(f.name))
    setQuery({ cols: allShown ? null : next.join(","), page: 1 })
  }

  const hiddenCount = fields.filter((f) => !isVisible(f.name)).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Columns{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-1">
        {fields.map((f) => (
          <label
            key={f.name}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isVisible(f.name)}
              onChange={() => toggle(f.name)}
            />
            <span>{f.label}</span>
          </label>
        ))}
        {hiddenCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-muted-foreground"
            onClick={() => setQuery({ cols: null, page: 1 })}
          >
            Show all
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
