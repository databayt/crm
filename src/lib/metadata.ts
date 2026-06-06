import "server-only"

import { db } from "@/lib/db"
import type { FieldMap } from "@/lib/query-sql"

export interface LoadedField {
  id: string
  name: string
  label: string
  type: string
  isNullable: boolean
  options: unknown
  position: number
}

export interface LoadedObject {
  id: string
  nameSingular: string
  namePlural: string
  labelSingular: string
  labelPlural: string
  icon: string | null
  tableName: string
  isCustom: boolean
  fields: LoadedField[]
  // columnName → FieldType, the allowlist the query-builder writes/orders by.
  fieldMap: FieldMap
  // The field used to title/label a record (for detail headers + relation chips).
  displayField: string
}

type RawObject = {
  id: string
  nameSingular: string
  namePlural: string
  labelSingular: string
  labelPlural: string
  icon: string | null
  tableName: string
  isCustom: boolean
  fields: LoadedField[]
}

// Pick the human-facing "title" field for a record: prefer name → first_name →
// title → the first text field → id.
function pickDisplayField(fields: LoadedField[]): string {
  const has = (n: string) => fields.find((f) => f.name === n)?.name
  return (
    has("name") ??
    has("first_name") ??
    has("title") ??
    fields.find((f) => f.type === "TEXT")?.name ??
    "id"
  )
}

function toLoaded(obj: RawObject): LoadedObject {
  const fieldMap: FieldMap = {}
  for (const f of obj.fields) fieldMap[f.name] = f.type
  return {
    id: obj.id,
    nameSingular: obj.nameSingular,
    namePlural: obj.namePlural,
    labelSingular: obj.labelSingular,
    labelPlural: obj.labelPlural,
    icon: obj.icon,
    tableName: obj.tableName,
    isCustom: obj.isCustom,
    fields: obj.fields,
    fieldMap,
    displayField: pickDisplayField(obj.fields),
  }
}

/** Load one object by machine name (singular) with its fields. */
export async function getObject(
  workspaceId: string,
  nameSingular: string,
): Promise<LoadedObject | null> {
  const obj = await db.objectMetadata.findUnique({
    where: { workspaceId_nameSingular: { workspaceId, nameSingular } },
    include: { fields: { orderBy: { position: "asc" } } },
  })
  return obj ? toLoaded(obj as RawObject) : null
}

/** Load one object by its URL/plural name (e.g. "companies"). */
export async function getObjectByPlural(
  workspaceId: string,
  namePlural: string,
): Promise<LoadedObject | null> {
  const obj = await db.objectMetadata.findFirst({
    where: { workspaceId, namePlural, isActive: true },
    include: { fields: { orderBy: { position: "asc" } } },
  })
  return obj ? toLoaded(obj as RawObject) : null
}

/** Load all active objects for the current workspace (for nav / settings). */
export async function listObjects(
  workspaceId: string,
): Promise<LoadedObject[]> {
  const objs = await db.objectMetadata.findMany({
    where: { workspaceId, isActive: true },
    include: { fields: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  })
  return objs.map((o) => toLoaded(o as RawObject))
}

// Field helpers shared by the generic UI.
export function relationTarget(field: LoadedField): string | null {
  if (field.type !== "RELATION") return null
  const opts = field.options as { targetObject?: string } | null
  return opts?.targetObject ?? null
}

export function selectChoices(field: LoadedField): string[] {
  const opts = field.options as { choices?: string[] } | null
  return opts?.choices ?? []
}
