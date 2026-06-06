# Product Brief — CRM

> An open-source, **Arabic-first** (RTL by default), **multi-tenant** (subdomain-per-workspace),
> **metadata-driven** CRM — a [Twenty](https://github.com/twentyhq/twenty) clone rebuilt on the
> **databayt** stack (Next.js 16, React 19, Prisma 6, Tailwind 4, shadcn/ui, Auth.js v5,
> server actions only).

- **Status:** Greenfield (BMAD planning). Target repo: `/Users/abdout/crm`, GitHub `databayt/crm`.
- **Master plan (source of truth):** `~/.claude/plans/here-in-crm-we-typed-hickey.md` — two-plane
  architecture, domain model, phased roadmap 0–6. This brief is artifact §7.1 of that plan.
- **Conventions:** `AGENTS.md`, `CLAUDE.md` (two-plane architecture, Next 16 promise params,
  subdomain tenancy, metadata engine, feature-block layout, RTL/i18n, `.env`/port 3000).

---

## 1. Vision & problem

Open-source CRM today (Twenty, the leading modern alternative) is built for English-first,
single-instance, developer-owned deployments. Its NestJS + TypeORM + GraphQL monorepo is heavy to
operate, and **Arabic-speaking sales teams are second-class citizens**: RTL is bolted on, and there
is no first-class story for an agency hosting many client workspaces from one deployment.

The databayt ecosystem already solved the two hardest cross-cutting problems repeatedly —
**Arabic-first RTL i18n** (`lab`) and **subdomain multi-tenancy with cross-subdomain auth**
(`hogwarts`) — and ships a deep, reusable forms/tables/auth/`leads` blueprint in `codebase`.
The opportunity is to fuse Twenty's data model and metadata-driven UX with that stack.

**Vision:** the CRM an Arabic-speaking SMB or agency reaches for first — Twenty's power
(custom objects, pipeline kanban, activity timeline, saved views) delivered Arabic-first, served
multi-tenant from a single `crm.databayt.org` deployment where every client gets
`<client>.crm.databayt.org`, and extended at runtime without a developer or a redeploy.

**The problem, sharply:**

1. **No Arabic-first open CRM.** RTL, Arabic numerals/dates/currency, and bilingual object/field
   labels are afterthoughts elsewhere. Here `ar` is the default locale and RTL is the default `dir`.
2. **Self-hosting Twenty is heavy.** A NestJS/TypeORM/GraphQL monorepo is a lot to run for a small
   team. The databayt stack — Next.js server actions on Neon Postgres — is far lighter to operate.
3. **One deployment, many clients.** Agencies and SaaS resellers need many isolated workspaces
   under one app. Twenty's self-host model and the typical row-level approach both fall short of
   the **schema-per-workspace** isolation this delivers.
4. **Schema rigidity.** Most CRMs (and a Prisma-schema-first build) force a redeploy to add a field.
   Twenty's killer feature — **runtime-configurable custom objects/fields** — is the differentiator
   we keep faithfully.

---

## 2. Target users & jobs-to-be-done

### Primary: Arabic-speaking SMB sales teams (5–50 seats)

Sales reps, SDRs, and a sales manager at a regional SMB who want a real CRM in Arabic without paying
per-seat enterprise pricing or fighting a half-translated English tool.

| JTBD                      | What they hire the product for                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Track accounts & contacts | "When I add a company, let me capture its people, deals, and history — in Arabic, reading right-to-left." |
| Run my pipeline           | "Show my opportunities as a kanban board I can drag a deal across as it advances."                        |
| Never lose context        | "Keep every note, call, task, and meeting on the record's timeline so I can pick up where I left off."    |
| Work the way I work       | "Let me add the fields and even whole objects my business needs — without waiting on a developer."        |
| Localized data            | "Format amounts, dates, and numbers the way my market expects (currency, Arabic-Indic numerals)."         |

### Secondary: digital agencies & SaaS resellers (multi-client operators)

Operators who run sales ops for, or resell a CRM to, many client businesses and need each client
fully isolated.

| JTBD                 | What they hire the product for                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Isolate every client | "Each client's data lives in its own Postgres schema — zero cross-tenant leakage, the strongest isolation." |
| Onboard in minutes   | "Spin up `client.crm.databayt.org` with its standard objects materialized, from one deployment."            |
| Tailor per client    | "Give each client custom objects/fields without forking or redeploying the app."                            |
| Bilingual delivery   | "Serve Arabic clients in `ar` and English clients in `en` from the same instance."                          |

### Tertiary: databayt-internal / open-source operators & contributors

Teams self-hosting on the databayt stack, or contributors extending the open-source CRM. Their JTBD:
reuse the same `ui`/`atom`/`form`/`table`/auth/tenancy primitives they already know, and extend the
**generic, metadata-driven record UI** rather than hand-building per-object screens.

---

## 3. Differentiators

1. **Arabic-first, RTL by default — not a translation layer.**
   `defaultLocale = 'ar'`, `dir='rtl'` is the baseline (`/` → `/ar`). Logical CSS only
   (`ms`/`me`/`ps`/`pe`, `text-start/end`, `border-s/e`, `rtl:rotate-180`), fonts switch by `dir`
   (Tajawal RTL / Inter LTR), and **object/field labels are bilingual in metadata**
   (`labelSingular`/`labelPlural` carry locale variants). `Intl`-based currency/date/number
   formatting. English (`en`, LTR) is a first-class peer, not a fallback.

2. **Multi-tenant subdomains with schema-level isolation.**
   `acme.crm.databayt.org` (prod) / `acme.localhost:3000` (dev) → `src/proxy.ts` sets `x-subdomain`
   and rewrites to `/[lang]/s/[subdomain]/...` → `getTenantContext()` resolves
   `{ workspaceId, pgSchema, userId, role }`. Each workspace gets its **own Postgres schema**
   (`ws_<workspaceId>`) — the strongest isolation tier, well beyond the typical row-level
   `workspaceId` filter. Auth.js v5 JWT with cross-subdomain cookies
   (`domain: '.crm.databayt.org'`). Tenancy and auth are copied near-verbatim from `hogwarts`.

3. **Metadata-driven custom objects & fields (Twenty-faithful, runtime DDL).**
   A control-plane registry (`ObjectMetadata` / `FieldMetadata`) describes every object and field.
   The **metadata engine** (`src/lib/schema-manager.ts`) materializes real tables/columns at runtime
   via `CREATE/ALTER TABLE` in the workspace schema; every read/write flows through one choke point,
   `src/lib/query-builder.ts`, emitting fully-qualified SQL (`"ws_acme"."company"`) — never
   `SET search_path` (unsafe under Neon pooling; `DIRECT_URL` for DDL). **Standard objects ship as
   seed metadata and are materialized identically to custom ones**, so a user-created object renders
   in every table/kanban/form/detail view the instant its metadata exists — no developer, no redeploy.

4. **databayt-native reuse — generic, build-once UI.**
   UI primitives + atoms from `databayt/codebase` (`ui/`, `atom/`); forms/tables/auth and the
   `leads/` blueprint (the 31-file end-to-end module) adapted per object; multi-tenancy + auth from
   `hogwarts`. Because the data plane is metadata-driven, the platform UI
   (`src/components/platform/record/` — `record-table`, `record-form`, `record-detail`, per-type
   field renderers) is written **once, generically**, parameterized by metadata. Tailwind 4
   (CSS-first, OKLCH tokens, no `tailwind.config.js`), shadcn `radix-nova`. Built and shipped via the
   kun `/feature` pipeline and the BMAD method.

---

## 4. MVP scope — the full Twenty clone (Phases 0–6)

The MVP **is** the full clone. Locked decisions: full dynamic schema (metadata-driven,
schema-per-workspace, runtime DDL); **server actions only** (Zod-validated, tenant-scoped); Neon
Postgres; tenant field `workspaceId`; Google + email/password auth; flat `MemberRole` RBAC;
default locale `ar`.

### Modules in scope

| Module                             | What ships                                                                                                                                                                          | Plan ref         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Scaffold & i18n shell**          | Next 16 skeleton (lab configs, fumadocs stripped), Tailwind 4, Arabic-default i18n, RTL/LTR layouts, CI green.                                                                      | Phase 0 / Epic-0 |
| **Auth**                           | Auth.js v5 (Google OAuth + email/password credentials), global `(auth)` routes (login/register/join), cross-subdomain cookies.                                                      | Phase 1 / Epic-1 |
| **Workspace tenancy & onboarding** | Subdomain proxy → tenant context; `/join` creates `Workspace` + `Member`, **provisions the `ws_<id>` Postgres schema**, and materializes standard objects from seed metadata.       | Phase 1 / Epic-1 |
| **Metadata engine**                | Schema manager (runtime DDL, identifier whitelist, DDL-in-transaction + saga rollback) + dynamic query builder; **Company as the end-to-end vertical slice (go/no-go checkpoint)**. | Phase 2 / Epic-2 |
| **Companies**                      | First standard object, fully usable via the generic metadata-driven UI, tenant-isolated by schema.                                                                                  | Phase 2–3        |
| **People**                         | Contacts with a relation to Company.                                                                                                                                                | Phase 3 / Epic-3 |
| **Opportunities**                  | Deals with amount/currency/close-date and stage/company relations (table view).                                                                                                     | Phase 3–4        |
| **Pipeline (Kanban)**              | Twenty's signature board — `@dnd-kit` columns = stages, drag-to-move opportunity (stage+position) in a transaction; default pipeline/stages seeded on workspace create.             | Phase 4 / Epic-4 |
| **Activities timeline**            | Polymorphic `activity` (NOTE/TASK/EMAIL/CALL/MEETING) attached to company/person/opportunity, rendered chronologically in record detail.                                            | Phase 4 / Epic-4 |
| **Generic record UI**              | Build-once metadata-driven table (filter/sort/visible-fields via `nuqs`), form (Zod-from-metadata), detail + per-type field renderers — serves every object.                        | Phase 3 / Epic-3 |
| **Custom objects & fields**        | Settings UI → create object/field → schema-manager DDL → instantly renders in all generic views (the differentiator, now nearly free).                                              | Phase 5 / Epic-5 |
| **Saved views & favorites**        | Persisted `View` (filters/sorts/visibleFields/groupBy/viewType) and `Favorite`.                                                                                                     | Phase 6 / Epic-6 |
| **Import / export**                | CSV/paste bulk import (port `leads/bulk-import.tsx`) + CSV export.                                                                                                                  | Phase 6 / Epic-6 |
| **Dashboard**                      | Workspace KPI dashboard (recharts).                                                                                                                                                 | Phase 6 / Epic-6 |
| **i18n / RTL (cross-cutting)**     | `ar`/`en` dictionaries threaded Content → Table → Form; bilingual metadata labels; `Intl` formatters; logical-CSS RTL throughout.                                                   | All phases       |

Standard objects seeded as metadata: `company`, `person`, `opportunity`, `activity`,
`pipeline`, `stage`.

---

## 5. Out of scope / non-goals (MVP)

- **No GraphQL or REST API.** Server actions only (Zod-validated, tenant-scoped, uniform
  `ActionResponse<T>`). Twenty exposes GraphQL + REST; we deliberately do not for MVP — it is
  significant added surface, and the metadata engine + query builder is the single data choke point.
- **No native mobile app.** Responsive web (375 / 768 / 1440) only; no iOS/Android client.
- **No email sync / IMAP / calendar integration.** Activities are entered in-app; no inbound email
  ingestion, no two-way calendar/email sync. `EMAIL`/`CALL`/`MEETING` exist as activity _types_, not
  as live integrations.
- **No row-level / field-level RBAC.** RBAC is **flat `MemberRole`** (OWNER/ADMIN/MEMBER/VIEWER) for
  MVP, mirroring Twenty's flat workspace permissions; row-level enforcement is post-MVP.
- **No workflow automation / triggers / no-code logic builder.** No Zapier-style automations,
  webhooks, or rules engine in MVP.
- **No AI features** (lead scoring, enrichment, summarization) in MVP — possible Phase 6+ stretch.
- **No billing / subscription enforcement.** `Subscription` exists in the control plane for future
  use; paywalls/metering are not enforced in MVP.
- **No marketplace, no third-party plugin/app ecosystem, no public API tokens.**
- **No data residency / multi-region** beyond the single Neon project/branch.
- **Schema-per-workspace is accepted for MVP** despite catalog-bloat limits at extreme tenant counts
  (see §7 risks); the very-high-tenant fallback is explicitly out of MVP scope.

---

## 6. Success metrics

**Phase-gate / engineering (the build is the first success surface):**

- **Phase 0:** `pnpm dev` on :3000 renders the localized empty shell in `ar` (RTL) and `en` (LTR)
  with correct `dir`; `pnpm validate` (typecheck + lint + test + build) and CI green.
- **Phase 1:** register → `/join` creates `acme` → `ws_<id>` schema + standard-object tables exist
  in Neon → land in platform on `acme.localhost:3000`; second workspace `globex` cannot see `acme`'s
  schema (**isolation proven**).
- **Phase 2 (go/no-go for the dynamic-schema bet):** Company CRUD through the query builder; a created
  row appears in `"ws_acme"."company"` **only**; switching subdomain returns zero `acme` data.
- **Phase 3+:** all standard objects usable through the one generic metadata-driven UI; CRUD +
  filter/sort verified across **both locales**; RTL snapshots clean; cross-workspace read returns empty.
- **Phase 5:** create a custom object + field in Settings → the new column/object appears instantly in
  every generic view; DDL verified in Neon.
- **Quality gates (ongoing):** `/check` before each commit (build + typecheck + lint + `/block`
  audit ≥ 85); `/ship` to Vercel; `/watch` post-deploy. Co-located Vitest unit tests cover the pure
  modules — schema-manager, query-builder, tenant-context, validation, action logic.

**Product / outcome (post-launch leading indicators):**

- **Time-to-first-workspace:** an operator completes `/join` and lands in a working platform
  (schema provisioned, standard objects materialized) in **under 2 minutes**.
- **Activation:** a new workspace creates ≥ 1 company, ≥ 1 opportunity, and moves a deal across a
  pipeline stage within the first session.
- **Custom-schema adoption:** ≥ 1 custom field or object created per active workspace within week 1
  (validates the metadata-engine differentiator).
- **Arabic-first proof:** ≥ 50% of workspaces operate primarily in `ar`; zero RTL layout-break
  reports against the generic record UI.
- **Isolation integrity:** zero cross-tenant data-leak incidents (schema isolation is a hard
  invariant, not a metric to trend).
- **Reliability:** clean `/watch` post-deploy (no console errors, smoke green) on every ship.

---

## 7. Key risks

Referencing the master plan's risk section (`here-in-crm-we-typed-hickey.md` §9):

1. **Runtime DDL + schema-per-workspace is the hard part (highest risk).** The metadata engine
   (schema-manager + query-builder) is the central bet. _Mitigation:_ Phase 2 builds the **entire
   engine against one object (Company) end-to-end before generalizing** — this is the explicit
   go/no-go checkpoint. Identifiers are whitelisted against `FieldMetadata` and quoted via `pg`
   escaping; column types come from a fixed `type→pgType` map; values are always parameterized
   (`$1`); DDL runs in a transaction with a **metadata-saga rollback** so a failed materialization
   reverts the metadata write.

2. **Schema-per-workspace catalog bloat at very high tenant counts.** Postgres/Neon get heavy past
   tens of thousands of tables. _Mitigation:_ accepted for the clone and documented; the fallback —
   row-level `workspaceId` for standard objects with dynamic tables for custom objects only — is
   noted but **out of MVP scope**, revisited only if tenant count explodes.

3. **Neon pooled connections + raw `pg`.** Session state (`SET search_path`) is unsafe under
   pooling. _Mitigation:_ unpooled `DIRECT_URL` for DDL/migrations, pooled `DATABASE_URL` for queries;
   the query builder **always** emits fully-qualified names and never relies on session state.

4. **Type safety across the dynamic boundary.** Data-plane rows are `Record<string, unknown>` shaped
   by metadata. _Mitigation:_ wrap rows in a runtime validator, generate per-object TS types where
   feasible, and keep the entire dynamic surface behind the query-builder choke point.

5. **Scope — the full clone is large (40–60+ stories).** _Mitigation:_ BMAD epics + the kun
   `/feature` pipeline per concern keep it shippable phase-by-phase; Phase 2's vertical slice is the
   single go/no-go decision point for the dynamic-schema architecture before broad investment.

---

_Next BMAD artifacts (master plan §7):_ `prd-section-core.md` (FRs/NFRs, success metrics) →
`architecture-section-core.md` (ADRs, schemas, tenant-isolation rules, testing) → epics
(`stories-section-<epic>.md`, Epic-0 through Epic-6) → sharded Given-When-Then stories →
`implementation-readiness` gate before any coding.
