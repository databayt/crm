import { describe, expect, it } from "vitest"

import {
  buildCount,
  buildGetById,
  buildInsert,
  buildList,
  buildSoftDelete,
  buildUpdate,
  type FieldMap,
} from "@/lib/query-sql"

const FM: FieldMap = { name: "TEXT", employees: "NUMBER", city: "TEXT" }

describe("query-sql builders", () => {
  it("inserts only known fields, parameterized + coerced", () => {
    const q = buildInsert("ws_acme", "company", FM, {
      name: "Acme",
      employees: "10",
      bogus: "ignored",
    })
    expect(q.text).toBe(
      'INSERT INTO "ws_acme"."company" ("name", "employees") VALUES ($1, $2) RETURNING *',
    )
    expect(q.values).toEqual(["Acme", 10])
  })

  it("falls back to DEFAULT VALUES when no known fields are present", () => {
    const q = buildInsert("ws_acme", "company", FM, { bogus: "x" })
    expect(q.text).toContain("DEFAULT VALUES RETURNING *")
    expect(q.values).toEqual([])
  })

  it("lists with soft-delete guard, clamped limit, default order", () => {
    const q = buildList("ws_acme", "company", FM, { limit: 999 })
    expect(q.text).toContain('WHERE "deleted_at" IS NULL')
    expect(q.text).toContain('ORDER BY "created_at" DESC')
    expect(q.values).toEqual([200, 0]) // clamped to MAX_LIMIT
  })

  it("applies allowlisted equality filters before limit/offset", () => {
    const fm: FieldMap = { ...FM, company_id: "RELATION" }
    const q = buildList("ws_acme", "activity", fm, {
      filters: [
        { column: "company_id", value: "abc" },
        { column: "evil; DROP", value: "x" }, // ignored (not allowlisted)
      ],
    })
    expect(q.text).toContain('WHERE "deleted_at" IS NULL AND "company_id" = $1')
    expect(q.text).toContain("LIMIT $2 OFFSET $3")
    expect(q.values).toEqual(["abc", 50, 0])
  })

  it("only orders by allowlisted columns", () => {
    const ok = buildList("ws_acme", "company", FM, {
      orderBy: { column: "city", dir: "asc" },
    })
    expect(ok.text).toContain('ORDER BY "city" ASC')

    const bad = buildList("ws_acme", "company", FM, {
      orderBy: { column: "evil_col", dir: "asc" },
    })
    expect(bad.text).toContain('ORDER BY "created_at" DESC') // ignored → fallback
  })

  it("updates known fields and bumps updated_at", () => {
    const q = buildUpdate("ws_acme", "company", FM, "abc", {
      city: "NYC",
      bogus: 1,
    })
    expect(q.text).toContain('SET "city" = $1, "updated_at" = now()')
    expect(q.text).toContain('WHERE "id" = $2 AND "deleted_at" IS NULL')
    expect(q.values).toEqual(["NYC", "abc"])
  })

  it("builds count, getById, and soft delete", () => {
    expect(buildCount("ws_acme", "company").text).toContain("count(*)::int")
    expect(buildGetById("ws_acme", "company", "x").values).toEqual(["x"])
    expect(buildSoftDelete("ws_acme", "company", "x").text).toContain(
      'SET "deleted_at" = now()',
    )
  })
})
