import { describe, expect, it } from "vitest"

import { computeDropPosition } from "@/components/platform/record/position"

describe("computeDropPosition", () => {
  const list = [
    { id: "a", position: 1 },
    { id: "b", position: 2 },
    { id: "c", position: 3 },
  ]

  it("returns 1 for an empty destination column", () => {
    expect(computeDropPosition([], 0)).toBe(1)
  })

  it("drops at the top → just below the first neighbor", () => {
    expect(computeDropPosition(list, 0)).toBe(0) // 1 - 1
  })

  it("drops past the end → just above the last neighbor", () => {
    expect(computeDropPosition(list, 3)).toBe(4) // 3 + 1
  })

  it("drops between two neighbors → their midpoint", () => {
    expect(computeDropPosition(list, 1)).toBe(1.5) // (1 + 2) / 2
    expect(computeDropPosition(list, 2)).toBe(2.5) // (2 + 3) / 2
  })

  it("sorts by position first, so input order doesn't matter", () => {
    const shuffled = [
      { id: "c", position: 3 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]
    expect(computeDropPosition(shuffled, 1)).toBe(1.5)
  })

  it("subdivides further on repeated inserts without renumbering", () => {
    const two = [
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]
    const mid = computeDropPosition(two, 1) // 1.5
    const withMid = [...two, { id: "m", position: mid }]
    expect(computeDropPosition(withMid, 1)).toBe(1.25) // (1 + 1.5) / 2
  })
})
