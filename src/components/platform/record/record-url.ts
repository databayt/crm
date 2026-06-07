// Shared nuqs URL-state contract for the generic record list. The table, the
// toolbar, the filter bar, and the column picker all read/write the SAME keys
// through these parsers, so a saved View can capture and restore every facet of
// the list (search, sort, filters, visible columns) by round-tripping the URL.
import { createParser, parseAsInteger, parseAsString } from "nuqs"

import type { FilterGroup } from "@/lib/query-sql"

// The active filter group lives in a single `filters` param as JSON. A malformed
// or empty value parses to null (no filter) so a hand-edited URL can never crash
// the page; the server re-validates every filter against the object's metadata.
export const filtersParser = createParser<FilterGroup>({
  parse(value) {
    try {
      const obj = JSON.parse(value) as FilterGroup
      if (obj && Array.isArray(obj.filters) && obj.filters.length > 0)
        return obj
      return null
    } catch {
      return null
    }
  },
  serialize(value) {
    return JSON.stringify(value)
  },
})

export const recordUrlParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault(""),
  dir: parseAsString.withDefault("asc"),
  filters: filtersParser,
  // Comma-separated visible column names, in order. Empty = show all.
  cols: parseAsString.withDefault(""),
}

// Server round-trips (not shallow): every facet changes the fetched data.
export const recordUrlOptions = { shallow: false } as const

export function colsToList(cols: string): string[] {
  return cols
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
}
