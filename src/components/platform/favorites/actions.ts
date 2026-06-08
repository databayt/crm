"use server"

import { authorize } from "@/lib/authz"
import { db } from "@/lib/db"
import { getObject } from "@/lib/metadata"

export type FavoriteResult = {
  error?: string
  ok?: boolean
  isFavorite?: boolean
}

// Pin or unpin a record (or an object/list) for the current member. Reuses the
// existing Favorite model; the label is denormalized so the sidebar needs no
// per-render record lookup. Any member may favorite — it's personal, not a
// mutation of shared data, so it's gated on membership, not edit_records.
export async function toggleFavorite(input: {
  objectName: string
  recordId?: string | null
  label: string
}): Promise<FavoriteResult> {
  // view_records is held by every member (incl. VIEWER); authorize() is non-
  // throwing, so an expired session returns an error instead of crashing.
  const authz = await authorize("view_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, memberId } = authz.ctx
  if (!memberId) return { error: "Only members can use favorites" }

  const object = await getObject(workspaceId, input.objectName)
  if (!object) return { error: "Unknown object" }

  const recordId = input.recordId ?? null
  const existing = await db.favorite.findFirst({
    where: { workspaceId, memberId, objectId: object.id, recordId },
    select: { id: true },
  })
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } })
    return { ok: true, isFavorite: false }
  }

  // Append to the end of this member's list (position is Int; favorites are
  // append-only this batch — no drag-reorder, so no fractional gaps needed).
  const max = await db.favorite.aggregate({
    where: { workspaceId, memberId },
    _max: { position: true },
  })
  await db.favorite.create({
    data: {
      workspaceId,
      memberId,
      objectId: object.id,
      recordId,
      label: input.label.slice(0, 200) || "Untitled",
      position: (max._max.position ?? 0) + 1,
    },
  })
  return { ok: true, isFavorite: true }
}
