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
}

type ObjectWithFields = Awaited<
  ReturnType<typeof db.objectMetadata.findFirst>
> & { fields: LoadedField[] }

function toLoaded(obj: ObjectWithFields): LoadedObject {
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
  }
}

/** Load one object (by machine name) with its fields, for the current workspace. */
export async function getObject(
  workspaceId: string,
  nameSingular: string,
): Promise<LoadedObject | null> {
  const obj = await db.objectMetadata.findUnique({
    where: { workspaceId_nameSingular: { workspaceId, nameSingular } },
    include: { fields: { orderBy: { position: "asc" } } },
  })
  return obj ? toLoaded(obj as ObjectWithFields) : null
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
  return objs.map((o) => toLoaded(o as ObjectWithFields))
}
