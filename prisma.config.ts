// Prisma config (v6.19+). Centralizes CLI configuration. Required here because
// our schema is split across multiple files in prisma/schema/ — Prisma does not
// auto-detect that folder without an explicit `schema` path.
//
// `dotenv/config` is needed because, when a prisma.config.ts exists, Prisma no
// longer auto-loads .env — we load it ourselves so DATABASE_URL/DIRECT_URL resolve.
import "dotenv/config"

import path from "node:path"
import { defineConfig, env } from "prisma/config"

export default defineConfig({
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
  // Multi-file schema: datasource + generator + all models in prisma/schema/.
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
})
