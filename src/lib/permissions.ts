// Role-based capabilities. We deliberately do NOT port Twenty's configurable
// Role/ObjectPermission/FieldPermission graph — our tenancy has a fixed 4-value
// MemberRole enum, so we collapse Twenty's coarse permission flags
// (canUpdateAllSettings, canReadAllObjectRecords, …) into one capability table
// keyed by role. Pure + dependency-free so it can be unit-tested and imported
// from both Server Components (UI gating) and server actions (enforcement).
import type { MemberRole } from "@prisma/client"

export type Capability =
  | "view_records" // read records (everyone with membership)
  | "edit_records" // create/update/delete records (not VIEWER)
  | "manage_objects" // create/delete custom objects + fields
  | "manage_members" // invite, change role, remove members
  | "manage_workspace" // workspace-level/destructive settings (OWNER only)

const VIEWER: Capability[] = ["view_records"]
const MEMBER: Capability[] = [...VIEWER, "edit_records"]
const ADMIN: Capability[] = [...MEMBER, "manage_objects", "manage_members"]
const OWNER: Capability[] = [...ADMIN, "manage_workspace"]

export const CAPABILITIES: Record<MemberRole, ReadonlySet<Capability>> = {
  VIEWER: new Set(VIEWER),
  MEMBER: new Set(MEMBER),
  ADMIN: new Set(ADMIN),
  OWNER: new Set(OWNER),
}

// A platform admin (databayt staff) bypasses every check — Twenty's
// shouldBypassPermissionChecks escape hatch.
export function can(
  role: MemberRole | null,
  cap: Capability,
  isPlatformAdmin = false,
): boolean {
  if (isPlatformAdmin) return true
  if (!role) return false
  return CAPABILITIES[role].has(cap)
}

// Roles that may be granted via an invite. OWNER is never assignable — it's set
// once at workspace creation and transferred explicitly, never handed out.
export const ASSIGNABLE_ROLES: MemberRole[] = ["ADMIN", "MEMBER", "VIEWER"]

export function isAssignableRole(value: string): value is MemberRole {
  return (ASSIGNABLE_ROLES as string[]).includes(value)
}
