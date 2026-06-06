import { describe, expect, it } from "vitest"

import { qualified, quoteIdent } from "@/lib/sql"

describe("sql identifiers", () => {
  it("quotes valid identifiers", () => {
    expect(quoteIdent("company")).toBe('"company"')
    expect(quoteIdent("ws_acme")).toBe('"ws_acme"')
    expect(qualified("ws_acme", "company")).toBe('"ws_acme"."company"')
  })

  it("rejects injection attempts and invalid names", () => {
    expect(() => quoteIdent('a"; drop table x;--')).toThrow(/Unsafe/)
    expect(() => quoteIdent("has space")).toThrow(/Unsafe/)
    expect(() => quoteIdent("")).toThrow(/Unsafe/)
    expect(() => quoteIdent("a".repeat(64))).toThrow(/Unsafe/)
  })
})
