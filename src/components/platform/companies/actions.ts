"use server"

import { getObject } from "@/lib/metadata"
import {
  countRecords,
  insertRecord,
  listRecords,
  softDeleteRecord,
  type RecordRow,
} from "@/lib/query-builder"
import { requireTenant } from "@/lib/tenant-context"
import {
  CompanyCreateSchema,
  type CompanyCreateInput,
} from "@/components/platform/companies/validation"

const OBJECT = "company"

export type ActionResult = { error?: string; ok?: boolean }

export async function listCompanies(): Promise<RecordRow[]> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, OBJECT)
  if (!object) return []
  return listRecords(pgSchema, object.tableName, object.fieldMap, {
    limit: 100,
  })
}

export async function countCompanies(): Promise<number> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, OBJECT)
  if (!object) return 0
  return countRecords(pgSchema, object.tableName)
}

export async function createCompany(
  values: CompanyCreateInput,
): Promise<ActionResult> {
  const { workspaceId, pgSchema } = await requireTenant()

  const parsed = CompanyCreateSchema.safeParse(values)
  if (!parsed.success) return { error: "Invalid fields" }

  const object = await getObject(workspaceId, OBJECT)
  if (!object) return { error: "Company object is not provisioned" }

  await insertRecord(pgSchema, object.tableName, object.fieldMap, parsed.data)
  return { ok: true }
}

export async function deleteCompany(id: string): Promise<ActionResult> {
  const { workspaceId, pgSchema } = await requireTenant()
  const object = await getObject(workspaceId, OBJECT)
  if (!object) return { error: "Company object is not provisioned" }
  await softDeleteRecord(pgSchema, object.tableName, id)
  return { ok: true }
}
