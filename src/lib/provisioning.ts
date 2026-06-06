import "server-only"

import { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import { materializeObject } from "@/lib/schema-manager"
import { STANDARD_OBJECTS } from "@/lib/standard-objects"

// Provision a new workspace's objects: write the standard objects as metadata
// (control plane) AND materialize their tables in the data-plane schema. This is
// the SAME path a user-created custom object takes in Phase 5.
export async function seedWorkspaceObjects(
  workspaceId: string,
  pgSchema: string,
): Promise<void> {
  for (const obj of STANDARD_OBJECTS) {
    const created = await db.objectMetadata.create({
      data: {
        workspaceId,
        nameSingular: obj.nameSingular,
        namePlural: obj.namePlural,
        labelSingular: obj.labelSingular,
        labelPlural: obj.labelPlural,
        icon: obj.icon,
        tableName: obj.tableName,
        isCustom: false,
        position: obj.position,
        fields: {
          create: obj.fields.map((f, i) => ({
            workspaceId,
            name: f.name,
            label: f.label,
            type: f.type,
            isNullable: f.isNullable ?? true,
            isCustom: false,
            position: i,
            options: (f.options ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
          })),
        },
      },
      include: { fields: true },
    })

    await materializeObject(
      pgSchema,
      created.tableName,
      created.fields.map((f) => ({
        name: f.name,
        type: f.type,
        isNullable: f.isNullable,
      })),
    )
  }
}
