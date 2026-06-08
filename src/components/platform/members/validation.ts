import { z } from "zod"

// Invite role is restricted to the assignable set (OWNER is never granted via an
// invite — see ASSIGNABLE_ROLES in @/lib/permissions).
export const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
})
export type InviteInput = z.infer<typeof InviteSchema>
