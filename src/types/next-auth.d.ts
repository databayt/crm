import type { DefaultSession } from "next-auth"
import type { GlobalRole } from "@prisma/client"

// Augment Auth.js types with our global identity fields. The *workspace* role
// is NOT here — it is resolved per-request from the subdomain via Member in
// src/lib/tenant-context.ts, never carried in the JWT.
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: GlobalRole
    } & DefaultSession["user"]
  }

  interface User {
    role?: GlobalRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: GlobalRole
  }
}
