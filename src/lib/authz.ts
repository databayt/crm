import "server-only"

import { can, type Capability } from "@/lib/permissions"
import { requireTenant, type TenantContext } from "@/lib/tenant-context"

type AuthorizedCtx = TenantContext & { userId: string }

export type AuthzResult =
  | { ok: true; ctx: AuthorizedCtx }
  | { ok: false; error: string }

// The single enforcement choke point for server actions. Resolves the tenant
// (throws-then-caught if the caller isn't an authorized member) and checks the
// required capability against the member's role. Non-throwing so actions can
// return a uniform ActionResponse error instead of crashing the request.
export async function authorize(cap: Capability): Promise<AuthzResult> {
  let ctx: AuthorizedCtx
  try {
    ctx = await requireTenant()
  } catch {
    return { ok: false, error: "Not authorized for this workspace" }
  }
  if (!can(ctx.role, cap, ctx.isPlatformAdmin)) {
    return { ok: false, error: "You don't have permission to do this" }
  }
  return { ok: true, ctx }
}
