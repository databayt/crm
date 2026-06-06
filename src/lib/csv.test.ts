import { describe, expect, it } from "vitest"

import { csvEscape, parseCSV, toCSV } from "@/lib/csv"

describe("csv", () => {
  it("escapes fields with commas/quotes/newlines", () => {
    expect(csvEscape("plain")).toBe("plain")
    expect(csvEscape("a,b")).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape(null)).toBe("")
    expect(csvEscape(42)).toBe("42")
  })

  it("builds CSV with header + rows", () => {
    const csv = toCSV(
      ["Name", "City"],
      [
        ["Acme", "Austin"],
        ["O'Neil, Co", "New\nYork"],
      ],
    )
    expect(csv).toBe('Name,City\r\nAcme,Austin\r\n"O\'Neil, Co","New\nYork"')
  })

  it("round-trips through parseCSV", () => {
    const csv = toCSV(
      ["name", "note"],
      [
        ["Acme", "a, b"],
        ["Beta", 'with "quote"'],
      ],
    )
    const parsed = parseCSV(csv)
    expect(parsed[0]).toEqual(["name", "note"])
    expect(parsed[1]).toEqual(["Acme", "a, b"])
    expect(parsed[2]).toEqual(["Beta", 'with "quote"'])
  })

  it("drops blank lines", () => {
    expect(parseCSV("a,b\n\n\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })
})
