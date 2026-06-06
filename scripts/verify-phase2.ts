// One-off verification / backfill: exercises the metadata engine's pure builders
// against real Neon for the "globex" workspace — seed metadata → materialize
// tables → insert/list/count a company. Run: pnpm exec tsx scripts/verify-phase2.ts
import "dotenv/config"

import { Prisma, PrismaClient } from "@prisma/client"
import { Pool } from "pg"

import { buildCreateTable } from "@/lib/ddl"
import { buildCount, buildInsert, buildList } from "@/lib/query-sql"
import { STANDARD_OBJECTS } from "@/lib/standard-objects"

const db = new PrismaClient()
const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const subdomain = "globex"
  const ws = await db.workspace.findUnique({ where: { subdomain } })
  if (!ws) throw new Error(`workspace ${subdomain} not found`)
  console.log(`workspace: ${ws.subdomain} → ${ws.pgSchema}`)

  // 1. Seed metadata if not already present.
  const already = await db.objectMetadata.findUnique({
    where: {
      workspaceId_nameSingular: {
        workspaceId: ws.id,
        nameSingular: "company",
      },
    },
  })
  if (!already) {
    for (const obj of STANDARD_OBJECTS) {
      await db.objectMetadata.create({
        data: {
          workspaceId: ws.id,
          nameSingular: obj.nameSingular,
          namePlural: obj.namePlural,
          labelSingular: obj.labelSingular,
          labelPlural: obj.labelPlural,
          icon: obj.icon,
          tableName: obj.tableName,
          position: obj.position,
          fields: {
            create: obj.fields.map((f, i) => ({
              workspaceId: ws.id,
              name: f.name,
              label: f.label,
              type: f.type,
              isNullable: f.isNullable ?? true,
              position: i,
              options: (f.options ?? undefined) as
                | Prisma.InputJsonValue
                | undefined,
            })),
          },
        },
      })
    }
    console.log(`seeded ${STANDARD_OBJECTS.length} objects`)
  } else {
    console.log("metadata already seeded")
  }

  // 2. Materialize every object's table (CREATE TABLE IF NOT EXISTS).
  const objects = await db.objectMetadata.findMany({
    where: { workspaceId: ws.id },
    include: { fields: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  })
  for (const o of objects) {
    await pool.query(
      buildCreateTable(
        ws.pgSchema,
        o.tableName,
        o.fields.map((f) => ({
          name: f.name,
          type: f.type,
          isNullable: f.isNullable,
        })),
      ),
    )
  }
  console.log(`materialized: ${objects.map((o) => o.tableName).join(", ")}`)

  // 3. CRUD on company via the query builders.
  const company = objects.find((o) => o.nameSingular === "company")!
  const fieldMap = Object.fromEntries(
    company.fields.map((f) => [f.name, f.type]),
  )
  const ins = buildInsert(ws.pgSchema, company.tableName, fieldMap, {
    name: "Initech",
    industry: "Software",
    city: "Austin",
    country: "US",
    employees: "120",
    domain_name: "initech.com",
  })
  const { rows: inserted } = await pool.query(ins.text, ins.values)
  console.log(
    `inserted: id=${inserted[0].id} name=${inserted[0].name} employees=${inserted[0].employees}`,
  )

  const list = buildList(ws.pgSchema, company.tableName, fieldMap, {
    limit: 10,
  })
  const { rows } = await pool.query(list.text, list.values)
  const { rows: cnt } = await pool.query(
    buildCount(ws.pgSchema, company.tableName).text,
  )
  console.log(
    `count=${cnt[0].count} names=[${rows.map((r) => r.name).join(", ")}]`,
  )

  await db.$disconnect()
  await pool.end()
  console.log("OK")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
