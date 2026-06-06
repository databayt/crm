import "server-only"

import { headers } from "next/headers"
import type { MemberRole } from "@prisma/client"

import { auth } from "@/lib/auth"
import { dbCircuitBreaker } from "@/lib/circuit-breaker"
import { db } from "@/lib/db"

export interface TenantContext {
  workspaceId: string
  pgSchema: string
  subdomain: string
  userId: string | null
  memberId: string | null
  role: MemberRole | null
  isPlatformAdmin: boolean
}

// subdomain → workspace, cached in-memory per instance (1 min). The proxy sets
// the x-subdomain header; this resolves it to the workspace + its data-plane
// schema and authorizes the user via Member.
interface WsEntry {
  workspaceId: string
  pgSchema: string
  isActive: boolean
  expiresAt: number
}
const wsCache = new Map<string, WsEntry>()
const TTL_MS = 60_000

async function resolveWorkspace(subdomain: string): Promise<WsEntry | null> {
  const now = Date.now()
  const cached = wsCache.get(subdomain)
  if (cached && cached.expiresAt > now) return cached

  const ws = await dbCircuitBreaker.execute(() =>
    db.workspace.findUnique({
      where: { subdomain },
      select: { id: true, pgSchema: true, isActive: true },
    }),
  )
  if (!ws) return null

  const entry: WsEntry = {
    workspaceId: ws.id,
    pgSchema: ws.pgSchema,
    isActive: ws.isActive,
    expiresAt: now + TTL_MS,
  }
  wsCache.set(subdomain, entry)
  return entry
}

export function invalidateWorkspaceCache(subdomain: string): void {
  wsCache.delete(subdomain)
}

/** Resolve the current request's tenant, or null if not on a workspace subdomain. */
export async function getTenantContext(): Promise<TenantContext | null> {
  const h = await headers()
  const subdomain = h.get("x-subdomain")
  if (!subdomain) return null

  const ws = await resolveWorkspace(subdomain)
  if (!ws || !ws.isActive) return null

  const session = await auth()
  const userId = session?.user?.id ?? null
  const isPlatformAdmin = session?.user?.role === "PLATFORM_ADMIN"

  let memberId: string | null = null
  let role: MemberRole | null = null
  if (userId) {
    const member = await dbCircuitBreaker.execute(() =>
      db.member.findUnique({
        where: { userId_workspaceId: { userId, workspaceId: ws.workspaceId } },
        select: { id: true, role: true },
      }),
    )
    memberId = member?.id ?? null
    role = member?.role ?? null
  }

  return {
    workspaceId: ws.workspaceId,
    pgSchema: ws.pgSchema,
    subdomain,
    userId,
    memberId,
    role,
    isPlatformAdmin,
  }
}

/** Like getTenantContext but throws unless the user is an authorized member. */
export async function requireTenant(): Promise<
  TenantContext & { userId: string }
> {
  const ctx = await getTenantContext()
  if (!ctx) throw new Error("No tenant context: unknown or missing subdomain")
  if (!ctx.userId || (!ctx.memberId && !ctx.isPlatformAdmin)) {
    throw new Error("Forbidden: not a member of this workspace")
  }
  return ctx as TenantContext & { userId: string }
}
