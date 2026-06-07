"use server"

import { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import { getObject } from "@/lib/metadata"
import type { FilterGroup } from "@/lib/query-sql"
import { requireTenant } from "@/lib/tenant-context"

// A saved view captures the full table state: free-text search, sort, the
// active filter group, and which columns are visible (empty/undefined = all).
export type ViewConfig = {
  search?: string
  sort?: string
  dir?: string
  filters?: FilterGroup
  cols?: string[]
}
export type ViewResult = { error?: string; ok?: boolean }

export async function saveView(
  objectName: string,
  name: string,
  config: ViewConfig,
): Promise<ViewResult> {
  const { workspaceId } = await requireTenant()
  if (!name.trim()) return { error: "Name is required" }

  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }

  await db.view.create({
    data: {
      workspaceId,
      objectId: object.id,
      name: name.trim(),
      viewType: "table",
      config: config as Prisma.InputJsonValue,
    },
  })
  return { ok: true }
}

export async function deleteView(viewId: string): Promise<ViewResult> {
  const { workspaceId } = await requireTenant()
  await db.view.deleteMany({ where: { id: viewId, workspaceId } })
  return { ok: true }
}
