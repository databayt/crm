"use server"

import { authorize } from "@/lib/authz"
import { getObject, selectChoices } from "@/lib/metadata"
import { moveRecord as dbMoveRecord } from "@/lib/query-builder"

export type MoveResult = { error?: string; ok?: boolean }

// Drop a card on a generic kanban board: write its new fractional `position` and
// the group (SELECT) field value of the column it landed in — one tenant-scoped
// UPDATE. `position` is computed client-side (computeDropPosition) but validated
// here as a finite number and bound as a param; the group value must be an actual
// choice of the SELECT field (or "" → the No-value bucket / NULL). This is the
// generic form of the old opportunity-only moveOpportunity.
export async function moveRecord(
  objectName: string,
  id: string,
  groupField: string,
  groupValue: string,
  position: number,
): Promise<MoveResult> {
  if (!Number.isFinite(position)) return { error: "Invalid position" }

  const authz = await authorize("edit_records")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const object = await getObject(workspaceId, objectName)
  if (!object) return { error: "Unknown object" }

  const field = object.fields.find((f) => f.name === groupField)
  if (!field || field.type !== "SELECT") return { error: "Invalid group field" }
  // "" is the No-value bucket (coerced to NULL); anything else must be a choice.
  if (groupValue !== "" && !selectChoices(field).includes(groupValue))
    return { error: "Invalid group value" }

  const row = await dbMoveRecord(
    pgSchema,
    object.tableName,
    object.fieldMap,
    id,
    position,
    { column: groupField, value: groupValue },
  )
  if (!row) return { error: "Record not found" }
  return { ok: true }
}
