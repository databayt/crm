import { describe, expect, it } from "vitest"

import { slugifyIdent } from "@/lib/slug"

describe("slugifyIdent", () => {
  it("snake-cases labels", () => {
    expect(slugifyIdent("Annual Revenue")).toBe("annual_revenue")
    expect(slugifyIdent("  Deal   Size  ")).toBe("deal_size")
    expect(slugifyIdent("Contract #")).toBe("contract")
  })

  it("prefixes identifiers that don't start with a letter", () => {
    expect(slugifyIdent("123 priority")).toBe("f_123_priority")
  })

  it("falls back when empty", () => {
    expect(slugifyIdent("!!!", "field")).toBe("field")
    expect(slugifyIdent("", "object")).toBe("object")
  })
})
