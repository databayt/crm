"use server"

import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  createWorkspaceSchema,
  workspaceSchemaName,
} from "@/lib/schema-manager"
import { invalidateWorkspaceCache } from "@/lib/tenant-context"
import { RESERVED_SUBDOMAINS, workspaceUrl } from "@/lib/urls"
import {
  CreateWorkspaceSchema,
  type CreateWorkspaceInput,
} from "@/components/auth/validation"

export type CreateWorkspaceResult = { error?: string }

export async function createWorkspace(
  values: CreateWorkspaceInput,
  locale = "ar",
): Promise<CreateWorkspaceResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { error: "Not authenticated" }

  const parsed = CreateWorkspaceSchema.safeParse(values)
  if (!parsed.success) return { error: "Invalid fields" }

  const { name, subdomain } = parsed.data
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return { error: "That subdomain is reserved" }
  }
  if (await db.workspace.findUnique({ where: { subdomain } })) {
    return { error: "That subdomain is already taken" }
  }

  const pgSchema = workspaceSchemaName(subdomain)

  try {
    // Control-plane writes first (transactional); then provision the data-plane
    // schema. If the DDL fails, undo the workspace so we never leave a dangling
    // control-plane row pointing at a missing schema.
    await db.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name,
          subdomain,
          pgSchema,
          defaultLocale: locale,
          createdByUserId: userId,
        },
      })
      await tx.member.create({
        data: { userId, workspaceId: ws.id, role: "OWNER" },
      })
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = String(error.meta?.target ?? "")
      if (target.includes("createdByUserId")) {
        return { error: "You already own a workspace" }
      }
      return { error: "That subdomain is already taken" }
    }
    console.error("[createWorkspace] control-plane write failed", error)
    return { error: "Could not create workspace" }
  }

  try {
    await createWorkspaceSchema(pgSchema)
  } catch (error) {
    console.error("[createWorkspace] schema provisioning failed", error)
    await db.workspace.delete({ where: { subdomain } }).catch(() => {})
    return { error: "Could not provision workspace storage" }
  }

  invalidateWorkspaceCache(subdomain)
  redirect(workspaceUrl(subdomain, locale))
}
