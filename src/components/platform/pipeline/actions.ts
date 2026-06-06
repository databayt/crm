"use server"

import { getObject, selectChoices } from "@/lib/metadata"
import { updateRecord as dbUpdateRecord } from "@/lib/query-builder"
import { requireTenant } from "@/lib/tenant-context"

export type MoveResult = { error?: string; ok?: boolean }

// Drag-to-move on the pipeline board: set an opportunity's stage. The stage is a
// SELECT field on the opportunity object; columns are its choices. Validated
// against the allowed choices before the write.
export async function moveOpportunity(
  id: string,
  stage: string,
): Promise<MoveResult> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, "opportunity")
  if (!object) return { error: "No opportunity object" }

  const stageField = object.fields.find((f) => f.name === "stage")
  if (!stageField || !selectChoices(stageField).includes(stage)) {
    return { error: "Invalid stage" }
  }

  const row = await dbUpdateRecord(
    pgSchema,
    object.tableName,
    object.fieldMap,
    id,
    { stage },
  )
  if (!row) return { error: "Opportunity not found" }
  return { ok: true }
}
