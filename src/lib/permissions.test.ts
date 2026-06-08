import { describe, expect, it } from "vitest"

import {
  ASSIGNABLE_ROLES,
  can,
  isAssignableRole,
  type Capability,
} from "@/lib/permissions"

describe("permissions", () => {
  it("VIEWER can only view, never edit or manage", () => {
    expect(can("VIEWER", "view_records")).toBe(true)
    expect(can("VIEWER", "edit_records")).toBe(false)
    expect(can("VIEWER", "manage_objects")).toBe(false)
    expect(can("VIEWER", "manage_members")).toBe(false)
    expect(can("VIEWER", "manage_workspace")).toBe(false)
  })

  it("MEMBER edits records but manages nothing", () => {
    expect(can("MEMBER", "edit_records")).toBe(true)
    expect(can("MEMBER", "manage_objects")).toBe(false)
    expect(can("MEMBER", "manage_members")).toBe(false)
  })

  it("ADMIN manages objects + members but not the workspace", () => {
    expect(can("ADMIN", "manage_objects")).toBe(true)
    expect(can("ADMIN", "manage_members")).toBe(true)
    expect(can("ADMIN", "manage_workspace")).toBe(false)
  })

  it("OWNER has every capability", () => {
    const caps: Capability[] = [
      "view_records",
      "edit_records",
      "manage_objects",
      "manage_members",
      "manage_workspace",
    ]
    for (const c of caps) expect(can("OWNER", c)).toBe(true)
  })

  it("null role has nothing; platform admin bypasses everything", () => {
    expect(can(null, "view_records")).toBe(false)
    expect(can(null, "manage_workspace", true)).toBe(true)
    expect(can("VIEWER", "manage_workspace", true)).toBe(true)
  })

  it("OWNER is not an assignable invite role", () => {
    expect(ASSIGNABLE_ROLES).toEqual(["ADMIN", "MEMBER", "VIEWER"])
    expect(isAssignableRole("OWNER")).toBe(false)
    expect(isAssignableRole("ADMIN")).toBe(true)
    expect(isAssignableRole("nonsense")).toBe(false)
  })
})
