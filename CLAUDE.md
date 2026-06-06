# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code
in this repository.

@AGENTS.md

> `AGENTS.md` (imported above) holds the conventions — the two-plane architecture,
> Next 16 promise params, subdomain tenancy, the metadata engine, feature-block
> layout, Tailwind/shadcn/RTL, server-actions-only, `.env`/port. This file adds the
> commands and the cross-file architecture; it does not repeat the conventions.

## Commands

```bash
pnpm dev                  # Dev server on :3000 (redirects / → /ar)
pnpm build                # Production build
pnpm lint                 # ESLint 9 flat config (bare `eslint`, no path arg)
pnpm typecheck            # tsc --noEmit — the type gate
pnpm test                 # Vitest run-once (test:watch / test:cov for watch + coverage)
pnpm format               # Prettier write (semi:false; see .prettierrc.json)
pnpm validate             # typecheck + lint + test + build — full local gate, mirrors CI

pnpm db:generate          # prisma generate (runs on postinstall too)
pnpm db:migrate           # prisma migrate dev — control-plane migrations
pnpm db:studio            # Prisma Studio
pnpm db:seed              # tsx prisma/seed.ts
```

`prisma generate` runs automatically on `pnpm install` (postinstall). CI
(`.github/workflows/ci.yml`) runs `pnpm validate`; **husky** mirrors it locally —
`lint-staged` (eslint --fix + prettier) on pre-commit, `typecheck + test` on pre-push.

## Architecture (cross-file)

**Two planes.** Control plane = Prisma (`public` schema): identity, tenancy, and the
object/field **metadata registry**. Data plane = per-workspace Postgres schema
(`ws_<id>`): the CRM records, materialized at runtime by the metadata engine. See
`AGENTS.md` for the full description.

**Request flow.** `src/proxy.ts` (subdomain → `x-subdomain` + rewrite to
`/[lang]/s/[subdomain]/...`) → `src/lib/tenant-context.ts` (`getTenantContext()`:
impersonate cookie → `x-subdomain` header → JWT, with Redis/in-memory/DB cache) →
server action resolves `{ workspaceId, pgSchema }` → `src/lib/query-builder.ts`
(fully-qualified SQL against the data plane) or `src/lib/db.ts` (Prisma, control plane).

**Metadata engine.** `src/lib/schema-manager.ts` runs runtime DDL (CREATE/ALTER TABLE
in `ws_<id>`) — identifiers validated against `FieldMetadata` (whitelist) and quoted;
values always parameterized; DDL in a transaction with metadata-saga rollback.
`src/lib/query-builder.ts` is the single choke point for data-plane reads/writes.
Standard objects ship as seed metadata (`prisma/seed-metadata.ts`) and are materialized
identically to custom objects.

**Feature blocks.** `app/[lang]/s/[subdomain]/(platform)/<object>/page.tsx` mirrors
`src/components/platform/<object>/`. Generic, metadata-driven record UI lives in
`src/components/platform/record/` (record-table / record-form / record-detail +
per-type field renderers). Pipeline Kanban (`platform/pipeline/`) uses `@dnd-kit`.

**Layout / i18n.** Root `src/app/layout.tsx` sets `<html lang dir>` from the `x-locale`
header / `NEXT_LOCALE` cookie (default `ar`) with an inline-script fallback; mounts
`ThemeProvider` + `NuqsAdapter` + sonner `Toaster`. `[lang]/layout.tsx` validates the
locale and sets `dir` on the content wrapper. Fonts switch by `dir` via `--app-font-sans`
(Inter LTR / Tajawal RTL) in `globals.css`.

**Reused from databayt.** UI primitives + atoms from `databayt/codebase`
(`src/components/{ui,atom}`); forms/tables/auth and the `leads/` blueprint adapted per
object; multi-tenancy + auth copied from `hogwarts`. Tailwind 4 is 100% CSS (no
`tailwind.config.js`); shadcn base via `@import "shadcn/tailwind.css"`.

## Build pipeline (kun) + planning (BMAD)

- **kun**: `/feature <object> crm` chains `IDEA → SPEC → [approval] → PLAN → TASKS →
SCHEMA → CODE → WIRE → CHECK → SHIP → WATCH` (commands in `.claude/commands/`,
  specs tracked in GitHub issues, `--from <stage>` to resume).
- **BMAD** planning artifacts live in `.bmad/planning/` (brief → PRD →
  architecture → epics → sharded stories). Agents in `.claude/agents/bmad/`,
  templates in `.claude/prd/`.
- **Master plan**: `~/.claude/plans/here-in-crm-we-typed-hickey.md` (phased roadmap
  0–6; Phase 2 — the metadata engine — is the go/no-go checkpoint).

## Vocabulary

CRM domain keywords that map work to the right block/agent: **Workspace, Member,
Object, Field, Company, Person, Opportunity, Pipeline, Stage, Activity, View**.
Tenant scope field is `workspaceId`; data lives in the `ws_<id>` Postgres schema.
