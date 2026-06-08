"use server"

import { Prisma } from "@prisma/client"

import { authorize } from "@/lib/authz"
import { SYSTEM_COLUMNS } from "@/lib/ddl"
import { db } from "@/lib/db"
import { getObject } from "@/lib/metadata"
import {
  addColumn,
  dropColumn,
  dropObjectTable,
  materializeObject,
} from "@/lib/schema-manager"
import { slugifyIdent } from "@/lib/slug"
import {
  AddFieldSchema,
  type AddFieldInput,
  NewObjectSchema,
  type NewObjectInput,
} from "@/components/platform/settings/validation"

export type SettingsResult = { error?: string; ok?: boolean }

// Create a custom object: write ObjectMetadata + a required "name" field, then
// materialize the table. It immediately appears in the nav and the generic UI.
export async function createObject(
  input: NewObjectInput,
): Promise<SettingsResult> {
  const authz = await authorize("manage_objects")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const parsed = NewObjectSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid fields" }

  const { labelSingular, labelPlural, icon } = parsed.data
  const nameSingular = slugifyIdent(labelSingular, "object")
  const namePlural = slugifyIdent(labelPlural, `${nameSingular}s`)
  const tableName = nameSingular

  if (
    await db.objectMetadata.findUnique({
      where: { workspaceId_nameSingular: { workspaceId, nameSingular } },
    })
  ) {
    return { error: "An object with that name already exists" }
  }

  try {
    const created = await db.objectMetadata.create({
      data: {
        workspaceId,
        nameSingular,
        namePlural,
        labelSingular,
        labelPlural,
        icon: icon || null,
        isCustom: true,
        tableName,
        position: 100,
        fields: {
          create: [
            {
              workspaceId,
              name: "name",
              label: "Name",
              type: "TEXT",
              isNullable: false,
              isCustom: false,
              position: 0,
            },
          ],
        },
      },
      include: { fields: true },
    })
    await materializeObject(
      pgSchema,
      tableName,
      created.fields.map((f) => ({
        name: f.name,
        type: f.type,
        isNullable: f.isNullable,
      })),
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "That object name is taken" }
    }
    console.error("[createObject]", error)
    return { error: "Could not create object" }
  }
  return { ok: true }
}

// Add a custom field to an object: write FieldMetadata + run ALTER TABLE ADD
// COLUMN. The column then renders in every view of that object.
export async function addField(
  nameSingular: string,
  input: AddFieldInput,
): Promise<SettingsResult> {
  const authz = await authorize("manage_objects")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const parsed = AddFieldSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid fields" }

  const object = await getObject(workspaceId, nameSingular)
  if (!object) return { error: "Unknown object" }

  const { label, type, choices, targetObject } = parsed.data
  const name = slugifyIdent(label, "field")

  if ((SYSTEM_COLUMNS as readonly string[]).includes(name)) {
    return { error: "That field name is reserved" }
  }
  if (object.fields.some((f) => f.name === name)) {
    return { error: "A field with that name already exists" }
  }

  let options: Prisma.InputJsonValue | undefined
  if (type === "SELECT" || type === "MULTI_SELECT") {
    const list = (choices ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (list.length === 0) return { error: "Add at least one choice" }
    options = { choices: list }
  } else if (type === "RELATION") {
    if (!targetObject) return { error: "Pick a related object" }
    options = { targetObject }
  }

  try {
    await db.fieldMetadata.create({
      data: {
        workspaceId,
        objectId: object.id,
        name,
        label,
        type,
        isCustom: true,
        isNullable: true,
        position: object.fields.length,
        options,
      },
    })
    await addColumn(pgSchema, object.tableName, {
      name,
      type,
      isNullable: true,
    })
  } catch (error) {
    console.error("[addField]", error)
    return { error: "Could not add field" }
  }
  return { ok: true }
}

export async function deleteField(fieldId: string): Promise<SettingsResult> {
  const authz = await authorize("manage_objects")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const field = await db.fieldMetadata.findFirst({
    where: { id: fieldId, workspaceId },
    include: { object: true },
  })
  if (!field) return { error: "Field not found" }
  if (!field.isCustom) return { error: "Standard fields can't be removed" }

  try {
    await dropColumn(pgSchema, field.object.tableName, field.name)
    await db.fieldMetadata.delete({ where: { id: fieldId } })
  } catch (error) {
    console.error("[deleteField]", error)
    return { error: "Could not delete field" }
  }
  return { ok: true }
}

export async function deleteObject(
  nameSingular: string,
): Promise<SettingsResult> {
  const authz = await authorize("manage_objects")
  if (!authz.ok) return { error: authz.error }
  const { workspaceId, pgSchema } = authz.ctx
  const object = await getObject(workspaceId, nameSingular)
  if (!object) return { error: "Unknown object" }
  if (!object.isCustom) return { error: "Standard objects can't be removed" }

  try {
    await dropObjectTable(pgSchema, object.tableName)
    // Favorite has no FK on objectId — purge this object's favorites + views so
    // they don't linger as orphans (the sidebar already filters them, but keep
    // the control plane clean).
    await db.favorite.deleteMany({
      where: { workspaceId, objectId: object.id },
    })
    await db.view.deleteMany({ where: { workspaceId, objectId: object.id } })
    await db.objectMetadata.delete({ where: { id: object.id } })
  } catch (error) {
    console.error("[deleteObject]", error)
    return { error: "Could not delete object" }
  }
  return { ok: true }
}
