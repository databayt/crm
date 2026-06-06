import { describe, expect, it } from "vitest"

import {
  coerceValue,
  FIELD_TYPES,
  isFieldType,
  pgTypeFor,
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
})
