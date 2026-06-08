// Fractional-indexing for drag-to-reorder, ported from Twenty's
// computeNewPositionOfDraggedRecord. A record's manual order is a float; dropping
// it between two neighbors writes the midpoint of their positions, so siblings
// are never renumbered — only the moved row's `position` changes. The server
// treats the returned float as opaque (see board-actions.moveRecord).

export interface Positioned {
  id: string
  position: number
}

// Given a destination list (the cards already in the target column, EXCLUDING
// the dragged one) and the 0-based slot the card was dropped at, return the new
// fractional position. Edge cases mirror Twenty: empty column → 1, dropped at the
// top → firstNeighbor − 1, dropped past the end → lastNeighbor + 1.
export function computeDropPosition(
  others: Positioned[],
  targetIndex: number,
): number {
  const sorted = [...others].sort((a, b) => a.position - b.position)
  const before = sorted[targetIndex - 1]
  const after = sorted[targetIndex]
  if (!before && !after) return 1 // empty destination column
  if (!before) return after.position - 1 // dropped at the very top
  if (!after) return before.position + 1 // dropped past the end
  return before.position + (after.position - before.position) / 2 // midpoint
}
