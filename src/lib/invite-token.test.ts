import { describe, expect, it } from "vitest"

import {
  INVITE_TTL_MS,
  generateInviteToken,
  inviteExpiry,
  inviteUrl,
} from "@/lib/invite-token"

describe("invite-token", () => {
  it("generates a 64-char hex secret, unique per call", () => {
    const a = generateInviteToken()
    const b = generateInviteToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it("expires 7 days out from the given now", () => {
    const now = 1_000_000
    expect(inviteExpiry(now).getTime()).toBe(now + INVITE_TTL_MS)
  })

  it("builds a subdomain invite link carrying the token in the path", () => {
    expect(inviteUrl("acme", "ar", "abc123")).toBe(
      "http://acme.localhost:3000/ar/invite/abc123",
    )
  })
})
