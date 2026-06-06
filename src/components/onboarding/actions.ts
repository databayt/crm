"use server"

import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { seedWorkspaceObjects } from "@/lib/provisioning"
import {
  createWorkspaceSchema,
  dropWorkspaceSchema,
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

  // 1. Control-plane writes (transactional): Workspace + OWNER Member.
  let workspaceId: string
  try {
    workspaceId = await db.$transaction(async (tx) => {
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
      return ws.id
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

  // 2. Data-plane provisioning: create the schema + materialize standard objects.
  //    On any failure, undo everything so we never leave a half-built tenant.
  try {
    await createWorkspaceSchema(pgSchema)
    await seedWorkspaceObjects(workspaceId, pgSchema)
  } catch (error) {
    console.error("[createWorkspace] provisioning failed — rolling back", error)
    await dropWorkspaceSchema(pgSchema).catch(() => {})
    // Cascade deletes Member + ObjectMetadata + FieldMetadata.
    await db.workspace.delete({ where: { id: workspaceId } }).catch(() => {})
    return { error: "Could not provision workspace" }
  }

  invalidateWorkspaceCache(subdomain)
  redirect(workspaceUrl(subdomain, locale))
}
