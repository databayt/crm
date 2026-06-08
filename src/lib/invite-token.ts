import { randomBytes } from "node:crypto"

import { workspaceUrl } from "@/lib/urls"

// Invitation tokens: a random secret carried in the invite link's path. Mirrors
// Twenty's AppToken.value (32 random bytes). The link lives on the workspace
// subdomain so getTenantContext() resolves the right workspace on acceptance.
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex")
}

export function inviteExpiry(now: number = Date.now()): Date {
  return new Date(now + INVITE_TTL_MS)
}

export function inviteUrl(
  subdomain: string,
  lang: string,
  token: string,
): string {
  return workspaceUrl(subdomain, lang, `/invite/${token}`)
}
