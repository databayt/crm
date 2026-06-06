import { getObject, selectChoices } from "@/lib/metadata"
import { listRecords } from "@/lib/query-builder"
import { resolveRelationLabels } from "@/lib/record-data"
import { requireTenant } from "@/lib/tenant-context"
import {
  type Opp,
  PipelineBoard,
} from "@/components/platform/pipeline/pipeline-board"

export async function PipelineContent({ lang }: { lang: string }) {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, "opportunity")

  if (!object) {
    return (
      <div className="container-wrapper py-8">
        <p className="text-muted-foreground">No opportunity object.</p>
      </div>
    )
  }

  const stageField = object.fields.find((f) => f.name === "stage")
  const stages = stageField ? selectChoices(stageField) : []

  const rows = await listRecords(pgSchema, object.tableName, object.fieldMap, {
    limit: 200,
    orderBy: { column: "created_at", dir: "desc" },
  })
  const relationLabels = await resolveRelationLabels(
    workspaceId,
    pgSchema,
    object,
    rows,
  )

  const oppsByStage: Record<string, Opp[]> = {}
  for (const s of stages) oppsByStage[s] = []
  for (const r of rows) {
    const stage = stages.includes(String(r.stage))
      ? String(r.stage)
      : (stages[0] ?? "—")
    ;(oppsByStage[stage] ??= []).push({
      id: String(r.id),
      name: String(r.name ?? "Untitled"),
      amount: r.amount != null ? String(r.amount) : null,
      company:
        relationLabels["company_id"]?.[String(r.company_id ?? "")] ?? null,
      stage,
    })
  }

  return (
    <div className="container-wrapper py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {object.labelPlural}
      </h1>
      {stages.length === 0 ? (
        <p className="text-muted-foreground">No stages configured.</p>
      ) : (
        <PipelineBoard lang={lang} stages={stages} oppsByStage={oppsByStage} />
      )}
    </div>
  )
}
