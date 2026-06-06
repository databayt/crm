import { describe, expect, it } from "vitest"

import {
  assertNotSystemColumn,
  buildAddColumn,
  buildCreateTable,
  buildDropColumn,
} from "@/lib/ddl"

describe("ddl builders", () => {
  it("builds CREATE TABLE with system + field columns", () => {
    const sql = buildCreateTable("ws_acme", "company", [
      { name: "name", type: "TEXT", isNullable: false },
      { name: "employees", type: "NUMBER" },
    ])
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "ws_acme"."company"')
    expect(sql).toContain('"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()')
    expect(sql).toContain('"created_at" timestamptz NOT NULL DEFAULT now()')
    expect(sql).toContain('"updated_at" timestamptz NOT NULL DEFAULT now()')
    expect(sql).toContain('"deleted_at" timestamptz')
    expect(sql).toContain('"name" text NOT NULL')
    expect(sql).toContain('"employees" double precision')
  })

  it("rejects a field reusing a system column name", () => {
    expect(() =>
      buildCreateTable("ws_acme", "company", [{ name: "id", type: "TEXT" }]),
    ).toThrow(/reserved/)
    expect(() => assertNotSystemColumn("created_at")).toThrow(/reserved/)
  })

  it("rejects unsafe identifiers (injection)", () => {
    expect(() =>
      buildCreateTable("ws_acme", "company", [
        { name: "x); DROP TABLE y;--", type: "TEXT" },
      ]),
    ).toThrow(/Unsafe/)
  })

  it("builds ALTER TABLE add/drop column", () => {
    expect(
      buildAddColumn("ws_acme", "company", { name: "website", type: "URL" }),
    ).toContain('ADD COLUMN IF NOT EXISTS "website" text')
    expect(buildDropColumn("ws_acme", "company", "website")).toContain(
      'DROP COLUMN IF EXISTS "website"',
    )
  })
})
