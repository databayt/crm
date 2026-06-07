import { describe, expect, it } from "vitest"

import {
  coerceValue,
  FIELD_TYPES,
  isFieldType,
  pgTypeFor,
  toInputString,
} from "@/lib/field-types"

describe("field-types", () => {
  it("maps every field type to a non-empty pg type", () => {
    for (const t of FIELD_TYPES) {
      expect(pgTypeFor(t).length).toBeGreaterThan(0)
    }
  })

  it("maps representative types correctly", () => {
    expect(pgTypeFor("TEXT")).toBe("text")
    expect(pgTypeFor("EMAIL")).toBe("text")
    expect(pgTypeFor("RELATION")).toBe("text")
    expect(pgTypeFor("CURRENCY")).toBe("numeric(14,2)")
    expect(pgTypeFor("NUMBER")).toBe("double precision")
    expect(pgTypeFor("DATETIME")).toBe("timestamptz")
    expect(pgTypeFor("MULTI_SELECT")).toBe("jsonb")
    expect(pgTypeFor("BOOLEAN")).toBe("boolean")
  })

  it("rejects unknown types", () => {
    expect(() => pgTypeFor("WHATEVER")).toThrow()
    expect(isFieldType("WHATEVER")).toBe(false)
    expect(isFieldType("TEXT")).toBe(true)
  })

  it("coerces values per type", () => {
    expect(coerceValue("NUMBER", "42")).toBe(42)
    expect(coerceValue("NUMBER", "")).toBeNull()
    expect(coerceValue("NUMBER", "nope")).toBeNull()
    expect(coerceValue("RATING", "3.9")).toBe(3)
    expect(coerceValue("BOOLEAN", "true")).toBe(true)
    expect(coerceValue("BOOLEAN", "on")).toBe(true)
    expect(coerceValue("BOOLEAN", "")).toBeNull()
    expect(coerceValue("TEXT", 5)).toBe("5")
    expect(coerceValue("TEXT", null)).toBeNull()
    expect(coerceValue("MULTI_SELECT", ["a", "b"])).toBe('["a","b"]')
  })

  it("formats stored values back into input strings (Date and ISO string)", () => {
    expect(toInputString("TEXT", null)).toBe("")
    expect(toInputString("TEXT", 5)).toBe("5")
    // Date object (node-postgres) and an ISO string both normalize to the input.
    const d = new Date("2026-06-07T13:45:00.000Z")
    expect(toInputString("DATE", d)).toBe("2026-06-07")
    expect(toInputString("DATETIME", d)).toBe("2026-06-07T13:45")
    expect(toInputString("DATE", "2026-06-07T13:45:00.000Z")).toBe("2026-06-07")
    expect(toInputString("DATETIME", "2026-06-07T13:45:00.000Z")).toBe(
      "2026-06-07T13:45",
    )
    // Boolean normalizes from JS boolean or string; empty when unset.
    expect(toInputString("BOOLEAN", true)).toBe("true")
    expect(toInputString("BOOLEAN", "false")).toBe("false")
    expect(toInputString("BOOLEAN", null)).toBe("")
  })
})
