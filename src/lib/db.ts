import { PrismaClient } from "@prisma/client"

// Prisma singleton — survives Next.js HMR in dev (without this, every hot reload
// leaks a new client and exhausts the Neon connection pool). This is the CONTROL
// plane only (public schema). The DATA plane uses raw `pg` via src/lib/db-data.ts.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
