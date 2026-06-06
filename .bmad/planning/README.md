# BMAD Planning — CRM (Twenty clone on databayt)

> An Arabic-first (RTL default), multi-tenant (subdomain-per-workspace, **schema-per-
> workspace** data plane), metadata-driven (runtime-DDL custom objects/fields) CRM — a
> [Twenty](https://github.com/twentyhq/twenty) clone rebuilt on the databayt stack
> (Next.js 16, React 19, Prisma 6, Tailwind 4, shadcn/ui, Auth.js v5, **server actions
> only**). This directory holds the greenfield planning artifacts.

- **Master plan (source of truth):** `~/.claude/plans/here-in-crm-we-typed-hickey.md`
  (two-plane architecture, domain model, phased roadmap 0–6).
- **Companion control-plane schemas:**
  `~/.claude/plans/here-in-crm-we-typed-hickey-agent-a1583746d3149796f.md`
  (superseded on custom fields by the architecture doc's full dynamic-schema design).
- **Project conventions:** `/Users/abdout/crm/AGENTS.md`, `/Users/abdout/crm/CLAUDE.md`.

---

## BMAD track

**Track: BMad Method.** Project classification **Level 4** (40–60+ stories) — a full CRM
clone whose highest-risk subsystem is runtime DDL + schema-per-workspace. Planning is
**section-based** (one file per PRD/architecture section and per epic), mirroring the
hogwarts planning layout. Agents live in `.claude/agents/bmad/` (`plan`, `story`, `loop`);
templates in `.claude/prd/` (`prd-template`, `create-epics-and-stories/epics-template`).

Artifact production order (locked decisions: full Twenty clone Phases 0–6; full dynamic
schema; server actions only; Neon Postgres; tenant field `workspaceId`; Google +
email/password auth; flat `MemberRole` RBAC; default locale `ar`):

```
brief.md → prd-section-core.md → architecture-section-core.md
        → stories-section-epic-<0..6>.md  → implementation-readiness gate → code
```

---

## Artifact index

| Artifact          | File                                                             | Purpose                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product Brief** | [`brief.md`](./brief.md)                                         | Vision, target users (Arabic-speaking SMB sales teams; agencies), differentiators, MVP = full clone, non-goals, success metrics, risks                   |
| **PRD**           | [`prd-section-core.md`](./prd-section-core.md)                   | FRs (Capabilities A–I), NFRs (perf/security/a11y/i18n), success criteria (M1–M8), permission matrix, phase→epic map                                      |
| **Architecture**  | [`architecture-section-core.md`](./architecture-section-core.md) | ADR-001..008, two-plane design, control-plane Prisma schema §3, metadata-engine component design §4, tenant-isolation rules §6, testing §7, migration §8 |

### Epics → sharded stories

Each epic file: goal, dependencies, a dependency graph, 4–10 stories (user story +
Given-When-Then ACs + a "Files to change" table with real paths + an hour estimate), and a
summary table. **Epic-2 ends with a mermaid story dependency graph.**

| Epic                                       | Phase | File                                                                                                                   | Covers FRs                 | Status                              |
| ------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------- |
| **Epic-0 Scaffold**                        | 0     | [`stories-section-epic-0-scaffold.md`](./stories-section-epic-0-scaffold.md)                                           | infra (no user FR)         | ✅ **DONE** (closed reference epic) |
| **Epic-1 Auth + Tenant control plane**     | 1     | [`stories-section-epic-1-auth-tenant.md`](./stories-section-epic-1-auth-tenant.md)                                     | FR-A1, A2, A3              | PROPOSED                            |
| **Epic-2 Metadata engine (Company slice)** | 2     | [`stories-section-epic-2-metadata-engine.md`](./stories-section-epic-2-metadata-engine.md)                             | FR-B1, B4, C1–C4 (Company) | PROPOSED — ⚠️ **GO/NO-GO**          |
| **Epic-3 Generic record UI**               | 3     | [`stories-section-epic-3-generic-record-ui.md`](./stories-section-epic-3-generic-record-ui.md)                         | FR-C1–C4 (person/opp), G1  | PROPOSED                            |
| **Epic-4 Pipeline + Activities**           | 4     | [`stories-section-epic-4-pipeline-activities.md`](./stories-section-epic-4-pipeline-activities.md)                     | FR-D1, D2, E1, E2          | PROPOSED                            |
| **Epic-5 Custom objects/fields**           | 5     | [`stories-section-epic-5-custom-objects-fields.md`](./stories-section-epic-5-custom-objects-fields.md)                 | FR-B2, B3                  | PROPOSED                            |
| **Epic-6 Views/Import/Export/Dashboard**   | 6     | [`stories-section-epic-6-views-import-export-dashboard.md`](./stories-section-epic-6-views-import-export-dashboard.md) | FR-F1, F2, H1, H2, I1      | PROPOSED                            |

### Epic effort roll-up (rough)

| Epic                                 | Stories        | Est.          |
| ------------------------------------ | -------------- | ------------- |
| Epic-0 Scaffold                      | 7              | ~8–10h ✅     |
| Epic-1 Auth + Tenant                 | 7              | ~21–29h       |
| Epic-2 Metadata engine               | 7              | ~29–38h       |
| Epic-3 Generic record UI             | 7              | ~21–29h       |
| Epic-4 Pipeline + Activities         | 7              | ~24–31h       |
| Epic-5 Custom objects/fields         | 7              | ~23–30h       |
| Epic-6 Views/Import/Export/Dashboard | 7              | ~24–31h       |
| **Total (Epics 1–6)**                | **42 stories** | **~142–188h** |

---

## First-class cross-cutting concerns

These are not afterthoughts — every epic carries them:

- **Multi-tenancy (`workspaceId` / schema-per-workspace).** Subdomain → `proxy.ts` →
  `getTenantContext()` → `{ workspaceId, pgSchema }`. The data plane is one Postgres
  schema per workspace (`ws_<id>`); the **query-builder is the single choke point** and
  takes `pgSchema` as a required argument with no default. Isolation is **schema-level** —
  proven in Epic-1 (onboarding), re-proven in Epic-2 (the go/no-go gate) and Epic-3
  (across objects). No data-plane query ever uses `SET search_path`; DDL runs on
  `DIRECT_URL`, queries on pooled `DATABASE_URL`.
- **i18n (Arabic-first, RTL default).** `defaultLocale = 'ar'`, `/` → `/ar`,
  `<html lang dir>` per locale, Tajawal (RTL) / Inter (LTR) fonts, **logical CSS only**,
  bilingual object/field labels in metadata, `Intl` formatters. Every epic's UI stories
  include an RTL/both-locale acceptance criterion.

---

## Implementation-readiness gate (REQUIRED before any coding)

Per the master plan §7 and architecture §9, run **`implementation-readiness`** before
writing feature code. It validates **PRD ↔ Architecture ↔ Epics cohesion** against:

1. **Every FR maps to ≥ 1 story.** Capabilities A–I → Epics 1–6 per the PRD phase→epic
   table; no orphan FR.
2. **Every ADR is honored by a story.** ADR-002/008 (DDL safety, schema-per-workspace) →
   Epic-2 STORY-2.1/2.2/2.3; ADR-003/005 (tenancy/auth) → Epic-1; ADR-006 (generic UI) →
   Epic-2/3; ADR-007 (dnd-kit) → Epic-4.
3. **No forward dependencies.** Each story builds only on previous work; dependency graphs
   in each epic file confirm ordering.
4. **The go/no-go checkpoint is explicit.** **Epic-2 (Company vertical slice) is the
   architectural go/no-go** for the dynamic-schema bet — Epics 3–6 proceed only if its exit
   (a row in `"ws_acme"."company"` only; `globex` sees nothing, proven in Neon) is met.
5. **Cross-cutting AC present.** Multi-tenant isolation and `ar`/RTL acceptance criteria
   appear in the relevant stories.

Track progress via `bmm-workflow-status.yaml` + `sprint-status.yaml` (created at gate time).

---

## Next steps

1. **Gate:** run `implementation-readiness`.
2. **Provision:** Neon project/branch via Neon MCP → capture `DATABASE_URL` (pooled) +
   `DIRECT_URL` (unpooled) into the central `.env`; create `databayt/crm` GitHub repo.
3. **Build:** drive each concern with the kun `/feature <object> crm` pipeline
   (`IDEA → SPEC → [approval] → PLAN → TASKS → SCHEMA → CODE → WIRE → CHECK → SHIP → WATCH`),
   starting Epic-1, then the Epic-2 go/no-go slice.
4. **Verify per phase** (master plan §10), `/check` before each commit, `/ship` then
   `/watch` post-deploy.
