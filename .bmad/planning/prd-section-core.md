# CRM (Twenty clone on databayt) — Product Requirements Document

**Author:** osmanabdout
**Date:** 2026-06-06
**Version:** 1.0
**Status:** PROPOSED

---

## Executive Summary

An Arabic-first (RTL default), multi-tenant, metadata-driven CRM — a faithful clone of [twentyhq/twenty](https://github.com/twentyhq/twenty) rebuilt on the databayt stack (Next.js 16, React 19, Prisma 6, Tailwind 4, shadcn/ui, Auth.js v5, server actions only). Sales teams sign up, get an isolated workspace at `<sub>.crm.databayt.org`, and manage Companies, People, and Opportunities through a generic UI driven entirely by object/field **metadata**. The signature view is a drag-to-move Kanban pipeline; every record carries an activities/notes/tasks timeline; users save filtered Views and favorites; and — the Twenty differentiator — users create their own custom objects and fields at runtime, which appear instantly across every table, form, and board.

### What Makes This Special

Three properties, all first-class:

1. **Two-plane, schema-per-workspace isolation.** The control plane (Prisma, `public` schema) holds identity, tenancy, and the object/field metadata registry. The data plane gives every workspace its own Postgres schema (`ws_<workspaceId>`) where standard and custom objects alike are real tables created/altered by runtime DDL. Tenant isolation is schema-level (the strongest), resolved from the subdomain on every request.
2. **Metadata-driven generic UI.** Because standard objects (`company`/`person`/`opportunity`/`activity`) are seeded _as metadata_ and materialized the same way custom objects are, the table, Kanban, form, and detail UIs are built once and parameterized by `ObjectMetadata` + `FieldMetadata`. A user-created object renders everywhere the moment its metadata exists.
3. **Arabic-first by default.** `defaultLocale = 'ar'`, `/` → `/ar`, RTL is the default direction. Logical CSS only; fonts switch by `dir` (Tajawal RTL / Inter LTR); object/field labels are bilingual in metadata. i18n is not a retrofit — it shapes layout, formatting, and the metadata model from day one.

---

## Project Classification

**Technical Type:** Full-stack multi-tenant SaaS web application (server-rendered, server-actions backend)
**Domain:** CRM / sales productivity
**Complexity:** Level 4 (40–60+ stories) — runtime DDL + schema-per-workspace is the highest-risk subsystem

This PRD covers **Phases 0–6** of the master plan (`~/.claude/plans/here-in-crm-we-typed-hickey.md`): Scaffold, Auth+Tenant control plane, Metadata engine (Company vertical slice), Generic record UI, Pipeline+Activities, Custom objects/fields, and Views/Import/Export/Dashboard. It is the single source of truth for **functional and non-functional requirements**; the companion architecture doc (`architecture-section-core.md`) owns ADRs and schema bodies.

### Domain Context

Sales teams need to track accounts (companies), contacts (people), and deals (opportunities) through a pipeline, log every interaction, and slice records by saved views. Twenty's defining trait is that the _data model itself is user-editable at runtime_ — teams shape the CRM to their process rather than the reverse. This clone reproduces that behavior on a Prisma/Postgres foundation, targeting Arabic-speaking and bilingual sales organizations served via per-workspace subdomains.

---

## Success Criteria

The release is successful when a sales team can self-onboard into an isolated, Arabic-default workspace and run their full sales process — accounts, contacts, deals, a drag-to-move pipeline, a per-record activity timeline, saved views, CSV import/export, and self-service custom objects/fields — with zero cross-tenant data leakage and a working RTL/LTR experience in both locales.

### Business Metrics

| #   | Metric                                                                                           | Target                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| M1  | Workspace self-onboarding completion (`/join` → provisioned `ws_<id>` schema → land in platform) | ≥ 90% of started onboardings, < 8 s p95 wall time                                                        |
| M2  | Cross-tenant data leakage                                                                        | **Zero** (proven by E2E: workspace B reads return empty for workspace A's records)                       |
| M3  | Time to create a custom object + field and see it render in the table view                       | < 10 s, no rebuild, no manual migration                                                                  |
| M4  | Record list (table) interactive load p95 (50-col object, 25 rows/page)                           | < 1.5 s on Neon pooled connection                                                                        |
| M5  | Kanban drag-to-move persistence                                                                  | stage/position committed in DB within one transaction; board reflects on revalidate                      |
| M6  | RTL/LTR parity                                                                                   | every platform screen renders correctly in `ar` (RTL) and `en` (LTR); no hard-coded `left/right`/`ml/mr` |
| M7  | Accessibility                                                                                    | platform pages pass axe with zero serious/critical violations; Kanban operable by keyboard               |
| M8  | CSV round-trip fidelity                                                                          | export → re-import produces equal record set (same field values, idempotent on unique keys)              |

---

## Product Scope

### MVP — Minimum Viable Product (Phases 0–6, this PRD)

- Workspace self-onboarding at `/join` that provisions the `ws_<id>` Postgres schema and materializes standard objects.
- Google + email/password auth; cross-subdomain JWT sessions; flat `MemberRole` (OWNER/ADMIN/MEMBER/VIEWER).
- Metadata engine: schema-manager (runtime DDL) + query-builder (fully-qualified parameterized SQL).
- Companies / People / Opportunities CRUD through one generic, metadata-driven record UI (table, form, detail).
- Pipeline Kanban (dnd-kit) with drag-to-move stage + position persistence.
- Activities / Notes / Tasks polymorphic timeline on every record.
- Saved Views (filters/sorts/visible-fields/groupBy, table & kanban) + Favorites.
- Filters / sorts / visible-fields driven by URL state (nuqs).
- Custom objects + custom fields created at runtime via Settings, rendering instantly in all generic views.
- CSV import (paste/upload) and CSV export.
- Workspace dashboard with KPI widgets.
- Full `ar` (default) / `en` localization with RTL/LTR.

### Growth Features (Post-MVP)

- Row-level RBAC enforcement (field- and record-level permissions beyond flat `MemberRole`).
- Relation field types beyond simple lookup (many-to-many junction objects in the UI), record merging, deduplication.
- Webhooks / public API (REST or GraphQL) over the metadata engine.
- Email & calendar sync; activity auto-capture; AI lead scoring (`@ai-sdk/anthropic`).
- Workflow automation (triggers/actions on record changes).

### Vision (Future)

- App marketplace over the metadata engine; multi-pipeline analytics; forecasting; mobile apps; Arabic-Indic numeral and Hijri calendar options surfaced per-workspace.

---

## Domain-Specific Requirements

This section shapes all functional and non-functional requirements below.

- **Standard objects are metadata.** `company`, `person`, `opportunity`, `activity`, `pipeline`, `stage` are seeded as `ObjectMetadata` + `FieldMetadata` rows (`prisma/seed-metadata.ts`) and materialized into real tables in `ws_<id>` by the schema manager. There is no bespoke per-object backend — every object flows through the same generic path. Any FR phrased for "an object" applies identically to standard and custom objects unless stated.
- **The data plane is never queried directly.** All data-plane reads/writes go through `src/lib/query-builder.ts`, which emits fully-qualified SQL (`"ws_acme"."company"`) and never uses `SET search_path` (unsafe under Neon pooled connections). DDL uses `DIRECT_URL`; queries use pooled `DATABASE_URL`.
- **Field type system** (drives form inputs, table cells, validation, and `type→pgType` DDL mapping): `TEXT | NUMBER | BOOLEAN | DATE | DATETIME | SELECT | MULTI_SELECT | RELATION | CURRENCY | EMAIL | PHONE | URL | RATING`.
- **Bilingual labels.** `labelSingular`/`labelPlural` (object) and `label` (field) carry locale variants so the generic UI renders Arabic or English headers without code changes.

---

## Innovation & Novel Patterns

The novel pattern is **runtime DDL + schema-per-workspace behind a single query-builder choke point**, with standard objects expressed as the same metadata as custom ones. This is the highest-risk, highest-value bet.

### Validation Approach

Phase 2 builds the _entire_ engine end-to-end against a single object (Company) — DDL materialization, query builder, generic UI, schema isolation — before generalizing. That vertical slice is the explicit go/no-go checkpoint for the dynamic-schema decision. Tenant isolation is verified by an E2E test where a second workspace cannot read the first's rows, confirmed directly in Neon via `mcp__Neon__run_sql`.

---

## Multi-Tenant SaaS Specific Requirements

### Authentication & Authorization

- **Providers:** Google OAuth + email/password credentials (Auth.js v5). Facebook optional later.
- **Sessions:** JWT strategy; cross-subdomain cookies (`domain: '.crm.databayt.org'` in prod, `undefined` in dev), `sameSite: 'lax'`, `httpOnly: true`. A lightweight `authjs.role` plain cookie is synced for Edge role gates. JWT carries `workspaceId`; refreshed on `trigger === 'update'` after workspace creation.
- **Auth routes are global** (`app/[lang]/(auth)/{login,register,join}`), never under `s/[subdomain]/`.
- **RBAC (MVP):** flat `MemberRole` — `OWNER` / `ADMIN` / `MEMBER` / `VIEWER`. Enforced at the action gate (e.g., VIEWER cannot mutate; only OWNER/ADMIN manage metadata/members). Row-level enforcement is post-MVP.

### Multi-Tenancy Architecture

- **Routing:** `acme.crm.databayt.org` (prod) / `acme.localhost:3000` (dev) → `src/proxy.ts` extracts `acme`, sets `x-subdomain`, rewrites to `/[lang]/s/acme/...`.
- **Resolution:** `getTenantContext()` resolves in priority order: `impersonate_workspaceId` cookie → `x-subdomain` header → `session.user.workspaceId` (JWT). Returns `{ workspaceId, pgSchema, userId, role, isPlatformAdmin }` with a Redis → in-memory → DB cache and circuit breaker.
- **Isolation:** schema-level. Every workspace owns `ws_<workspaceId>`. The query builder always targets the resolved `pgSchema`; control-plane Prisma models are scoped by `workspaceId` and guarded in dev by `TENANT_SCOPED_MODELS` + `$extends`.

### Permissions & Roles (MVP matrix)

| Capability                       | OWNER | ADMIN | MEMBER                 | VIEWER               |
| -------------------------------- | ----- | ----- | ---------------------- | -------------------- |
| Read records                     | ✅    | ✅    | ✅                     | ✅                   |
| Create / update / delete records | ✅    | ✅    | ✅                     | ❌                   |
| Move opportunities (Kanban)      | ✅    | ✅    | ✅                     | ❌                   |
| Create custom objects/fields     | ✅    | ✅    | ❌                     | ❌                   |
| Manage members / roles           | ✅    | ✅    | ❌                     | ❌                   |
| CSV import/export                | ✅    | ✅    | ✅ (export), import ✅ | export ✅, import ❌ |
| Delete workspace                 | ✅    | ❌    | ❌                     | ❌                   |

---

## User Experience Principles

- **One generic UI, every object.** Users learn the table/detail/Kanban once; it applies to all objects including custom ones.
- **URL is the state.** Filters, sorts, visible fields, view selection, and pagination live in the URL (nuqs) — shareable, bookmarkable, back-button-safe.
- **Arabic-first, RTL-correct.** Default direction is RTL; directional affordances (chevrons, Kanban arrows, drag handles) mirror via `rtl:rotate-180`; numbers/dates/currency format via `Intl` per locale.
- **Optimistic where safe.** Kanban drag shows immediate movement; reconciles on server confirmation.

### Key Interactions

- Drag an opportunity card across pipeline columns to change stage.
- Inline-edit a field cell in the record table.
- Add a note/task from the record detail timeline composer.
- Toggle visible columns and apply faceted filters; save the result as a named View; star it as a Favorite.
- Settings → "New object" / "New field" → instantly usable.

---

## Functional Requirements

> Conventions for every FR below: each server action begins with `const { workspaceId, pgSchema, role } = await getTenantContext()`, validates input with Zod, performs role checks per the matrix above, routes all data-plane access through `src/lib/query-builder.ts`, returns a uniform `ActionResponse<T>`, and calls `revalidatePath`. Client never sends a workspace id. Feature blocks mirror routes: `app/[lang]/s/[subdomain]/(platform)/<object>/page.tsx` ⇄ `src/components/platform/<object>/` (generic record UI in `src/components/platform/record/`).

### Capability A — Auth & Workspace Onboarding

#### FR-A1 — Register / log in (Google + email/password)

**User story:** As a new sales user, I want to register or log in with Google or email/password on the main domain, so that I can access the CRM.

**Acceptance criteria:**

- **Given** an unauthenticated visitor on `crm.databayt.org/ar/login`, **when** they choose "Continue with Google" and complete OAuth, **then** an `Account` is linked, a session JWT is issued with cross-subdomain cookies, and they are redirected to `/join` (no workspace yet) or their workspace if a `Member` exists.
- **Given** a visitor on `/ar/register`, **when** they submit a valid email + password (Zod-validated), **then** a `User` is created with a hashed password and a verification flow is initiated.
- **Given** invalid credentials, **when** the user submits, **then** a localized error toast appears and no session is created.
- **Given** any auth screen, **when** locale is `ar`, **then** the layout is RTL and copy comes from `dictionaries/ar/auth.json`.

#### FR-A2 — Create workspace and provision its schema (`/join`)

**User story:** As an authenticated user without a workspace, I want to create a workspace at `/join`, so that I get an isolated CRM with standard objects ready to use.

**Acceptance criteria:**

- **Given** an authenticated user on `/ar/join`, **when** they submit a workspace name + a unique subdomain (Zod-validated, lowercase, DNS-safe, uniqueness checked against `Workspace.subdomain`), **then** a `Workspace` (`defaultLocale='ar'`, `pgSchema='ws_<id>'`) and an owner `Member` (role `OWNER`) are created in the control plane.
- **Given** the `Workspace` row is committed, **when** onboarding continues, **then** `schemaManager.createWorkspaceSchema(workspaceId)` runs `CREATE SCHEMA IF NOT EXISTS "ws_<id>"` and `materializeObject` creates tables for every seeded standard object (`company`, `person`, `opportunity`, `activity`, `pipeline`, `stage`) plus a default pipeline with stages.
- **Given** schema provisioning fails midway, **when** the error surfaces, **then** the DDL transaction rolls back and the metadata/Workspace writes are reverted (saga) so no half-provisioned workspace remains; a localized error is returned.
- **Given** a successful `/join`, **when** the JWT is refreshed (`trigger==='update'`), **then** the user is redirected to `acme.localhost:3000/ar/(platform)` and lands on the dashboard.
- **Given** a chosen subdomain already exists, **when** submitted, **then** the form shows a localized "subdomain taken" error and nothing is provisioned.

#### FR-A3 — Subdomain tenant resolution & isolation

**User story:** As a workspace member, I want every page under my subdomain to load only my workspace's data, so that other tenants' records are never visible.

**Acceptance criteria:**

- **Given** a request to `acme.localhost:3000/ar/companies`, **when** `proxy.ts` runs, **then** `x-subdomain: acme` is set and the URL is rewritten to `/[lang]/s/acme/...`.
- **Given** any server action, **when** it executes, **then** `getTenantContext()` returns `{ workspaceId, pgSchema }` for `acme` and all data-plane SQL targets `"ws_acme"."<table>"`.
- **Given** workspace `globex` is authenticated, **when** it queries any object, **then** results contain zero `acme` rows (schema isolation), verifiable in Neon.
- **Given** a client request attempts to override the workspace id, **when** the action runs, **then** the client-sent value is ignored and the resolved tenant context is used.

---

### Capability B — Metadata Engine & Custom Objects/Fields

#### FR-B1 — Seed and materialize standard objects

**User story:** As the system, I want standard objects defined as metadata and materialized into real tables, so that standard and custom objects share one code path.

**Acceptance criteria:**

- **Given** a new workspace, **when** onboarding completes, **then** `ObjectMetadata`/`FieldMetadata` rows for `company`, `person`, `opportunity`, `activity`, `pipeline`, `stage` exist (`isCustom=false`) and corresponding tables exist in `ws_<id>` with system columns (`id uuid pk`, `created_at`, `updated_at`, `deleted_at`).
- **Given** field metadata of each type, **when** `materializeObject` runs, **then** each column's Postgres type comes from the fixed `type→pgType` map (e.g., `CURRENCY→numeric(14,2)`, `SELECT→text` + check/options, `DATETIME→timestamptz`).
- **Given** the standard `opportunity` object, **then** it carries `RELATION` fields to `company` and `stage` per Twenty's shape.

#### FR-B2 — Create a custom object (runtime DDL)

**User story:** As an OWNER/ADMIN, I want to create a custom object in Settings, so that I can model entities specific to my business.

**Acceptance criteria:**

- **Given** an ADMIN in Settings → Objects, **when** they submit a singular/plural name + labels (ar/en) + icon, **then** an `ObjectMetadata` row (`isCustom=true`) is created, `schemaManager.materializeObject` runs `CREATE TABLE "ws_<id>"."<table>"` inside a transaction, and on success the object appears in the sidebar and a generic list route renders it.
- **Given** an invalid or reserved object name, **when** submitted, **then** validation rejects it before any DDL (identifier whitelist, snake_case, not colliding with existing object names).
- **Given** the DDL fails, **when** the transaction aborts, **then** the `ObjectMetadata` write is rolled back (saga) and a localized error is returned; no orphan table or metadata remains.
- **Given** a MEMBER or VIEWER, **when** they attempt to create an object, **then** the action is rejected by the role gate.

#### FR-B3 — Add / edit / remove a custom field

**User story:** As an OWNER/ADMIN, I want to add, edit, or remove fields on any object, so that the data model fits my process — and have the change appear instantly everywhere.

**Acceptance criteria:**

- **Given** an ADMIN adds a field (name, label ar/en, type, nullable, default, options for SELECT/RELATION), **when** submitted, **then** a `FieldMetadata` row is created and `schemaManager.addField` runs `ALTER TABLE ... ADD COLUMN` with the mapped pg type, inside a transaction with saga rollback.
- **Given** the new field, **when** any list/form/detail/Kanban view for that object renders, **then** the field appears immediately with the correct per-type input/cell — no rebuild, no manual migration (M3 < 10 s).
- **Given** an ADMIN edits a field's label/options, **when** saved, **then** metadata updates and the UI reflects it; type changes that require `ALTER COLUMN` run as guarded DDL or are blocked if unsafe (e.g., narrowing with existing data).
- **Given** an ADMIN removes a custom field, **when** confirmed, **then** `schemaManager.dropField` runs `ALTER TABLE ... DROP COLUMN` and the `FieldMetadata` row is deleted in the same saga; system fields (`isSystem=true`) cannot be removed.
- **Given** every DDL identifier, **when** built, **then** it is validated against `FieldMetadata` (whitelist) and quoted via `pg` identifier escaping — never string-concatenated from raw input.

#### FR-B4 — Dynamic query builder choke point

**User story:** As a developer, I want all data-plane access to go through one query builder, so that tenant isolation and validation are enforced in a single place.

**Acceptance criteria:**

- **Given** `{ objectName, workspaceId, filters, sorts, page, pageSize, select }`, **when** the builder runs, **then** it validates every filter/sort field against `FieldMetadata`, emits fully-qualified parameterized SQL against `"ws_<id>"."<table>"`, and never issues `SET search_path`.
- **Given** `findMany / findById / create / update / softDelete / count`, **when** called, **then** each returns rows shaped by metadata; values are always parameterized (`$1`), identifiers always whitelisted/quoted.
- **Given** a `RELATION` field in `select`, **when** read, **then** it resolves via join or batched lookup against the related object's table in the same schema.

---

### Capability C — Companies / People / Opportunities CRUD (generic metadata-driven UI)

#### FR-C1 — List records (table)

**User story:** As a sales user, I want to browse a paginated, sortable, filterable table of any object, so that I can find and scan records.

**Acceptance criteria:**

- **Given** `/ar/companies`, **when** the page loads, **then** `record-table.tsx` renders columns generated from `FieldMetadata` (per-type cells), with server-side pagination, sort, and filters resolved via the query builder.
- **Given** an object with 50 fields and 25 rows/page, **when** loaded on Neon pooled connection, **then** the table is interactive in < 1.5 s p95 (M4).
- **Given** locale `ar`, **when** the table renders, **then** headers use Arabic labels from metadata, the layout is RTL, and dates/numbers/currency format via `Intl` for `ar`.

#### FR-C2 — Create a record

**User story:** As a sales user, I want to create a record via a form, so that I can capture a new company/person/opportunity.

**Acceptance criteria:**

- **Given** the "New" action, **when** the form opens, **then** `record-form.tsx` renders RHF inputs chosen by field type from a **Zod schema generated from `FieldMetadata`**.
- **Given** valid input, **when** submitted, **then** the create action inserts a row in `"ws_<id>"."<table>"` via the query builder and the table revalidates to show it.
- **Given** invalid input (required field empty, bad EMAIL/URL/PHONE format), **when** submitted, **then** field-level localized errors render and no row is created.

#### FR-C3 — View record detail + edit

**User story:** As a sales user, I want a record detail page with all fields plus its activity timeline, so that I can review and update one record in context.

**Acceptance criteria:**

- **Given** a record detail route, **when** opened, **then** `record-detail.tsx` shows a left field panel (per-type renderers) and a right activity timeline.
- **Given** an editable field, **when** the user edits and saves (inline or via form), **then** the update action patches only changed columns via the query builder and the panel reflects the new value.
- **Given** a `RELATION` field (e.g., person → company), **when** rendered, **then** it shows a lookup control resolving related records within the same workspace schema.

#### FR-C4 — Delete (soft) a record

**User story:** As a sales user, I want to delete a record, so that stale data is removed without hard data loss.

**Acceptance criteria:**

- **Given** a record, **when** the user confirms delete, **then** `softDelete` sets `deleted_at` and the row disappears from default lists.
- **Given** a VIEWER, **when** they attempt delete, **then** the action is rejected by the role gate.

---

### Capability D — Pipeline Kanban (dnd-kit, drag-to-move stage)

#### FR-D1 — Render the pipeline board

**User story:** As a sales user, I want a Kanban board of opportunities grouped by stage, so that I can see my deal flow at a glance.

**Acceptance criteria:**

- **Given** `/ar/pipeline`, **when** loaded, **then** `platform/pipeline/board.tsx` renders one column per `stage` row (ordered by `position`), each populated with that stage's opportunity cards (ordered by `position`), scoped to the workspace.
- **Given** locale `ar`, **when** the board renders, **then** columns flow RTL and directional icons mirror via `rtl:rotate-180`.

#### FR-D2 — Drag to move stage / reorder

**User story:** As a sales user, I want to drag an opportunity to another stage (or reorder within a stage), so that I can advance deals.

**Acceptance criteria:**

- **Given** a card dragged to a target stage at a drop index, **when** dropped, **then** `moveOpportunity({ id, toStageId, position })` updates `stage_id` + `position` for the moved card and reorders siblings, all within a single DB transaction (M5).
- **Given** the move succeeds, **when** the board revalidates, **then** the card is shown under the new stage at the correct order; on failure the card returns to its original position with a localized error.
- **Given** keyboard-only operation, **when** the user uses dnd-kit keyboard sensors, **then** cards can be picked up, moved between columns, and dropped (M7 accessibility).
- **Given** a VIEWER, **when** they attempt a move, **then** the drag is disabled / the action is rejected.

---

### Capability E — Activities / Notes / Tasks Timeline

#### FR-E1 — Add activities to a record

**User story:** As a sales user, I want to log notes, tasks, emails, calls, and meetings on a company/person/opportunity, so that the team has a full interaction history.

**Acceptance criteria:**

- **Given** a record detail timeline composer, **when** the user adds an activity (`NOTE | TASK | EMAIL | CALL | MEETING`) with title/body and (for tasks) `dueDate`/`taskStatus`/assignee, **then** an `activity` row is created in the workspace schema linked polymorphically to the target record.
- **Given** a created activity, **when** the timeline rerenders, **then** it appears in reverse-chronological order with author, type icon, and locale-formatted timestamp.

#### FR-E2 — Task status & due dates

**User story:** As a sales user, I want to track task status and due dates, so that follow-ups don't slip.

**Acceptance criteria:**

- **Given** a `TASK` activity, **when** the user changes status (`TODO → IN_PROGRESS → DONE`), **then** the change persists and reflects in the timeline.
- **Given** a task with a `dueDate`, **when** rendered, **then** overdue tasks are visually flagged (logical, RTL-safe styling) and the date formats per locale.

---

### Capability F — Saved Views & Favorites

#### FR-F1 — Save a view

**User story:** As a sales user, I want to save the current filters/sorts/visible-fields as a named view, so that I can return to a configured slice instantly.

**Acceptance criteria:**

- **Given** a configured table or Kanban (filters, sorts, visible fields, groupBy), **when** the user saves it with a name, **then** a `View` row (control plane) stores `{ objectType, viewType, name, config }` scoped to the workspace.
- **Given** a saved view, **when** the user selects it, **then** the URL state (nuqs) and the rendered list update to match `config`.

#### FR-F2 — Favorite a view/record

**User story:** As a sales user, I want to favorite views (and records), so that my most-used destinations are one click away.

**Acceptance criteria:**

- **Given** a view or record, **when** the user stars it, **then** a `Favorite` row is created and it appears in the sidebar favorites section, scoped to the user + workspace.
- **Given** a favorite, **when** unstarred, **then** it is removed from the sidebar.

---

### Capability G — Filters / Sorts / Visible Fields (nuqs URL state)

#### FR-G1 — URL-driven table state

**User story:** As a sales user, I want filters, sorts, visible columns, and pagination encoded in the URL, so that I can share and bookmark exact views.

**Acceptance criteria:**

- **Given** the user applies a faceted filter, changes sort, toggles visible columns, or paginates, **when** the change is made, **then** it is serialized to the URL via nuqs and the server re-queries via the query builder using the URL state as the source of truth.
- **Given** a shared URL, **when** another member of the same workspace opens it, **then** the identical filtered/sorted view renders.
- **Given** a filter referencing a field, **when** applied, **then** the field is validated against `FieldMetadata` (no arbitrary column filtering).
- **Given** the back button, **when** pressed, **then** the previous filter/sort/page state is restored from the URL.

---

### Capability H — CSV Import / Export

#### FR-H1 — Import records from CSV (upload/paste)

**User story:** As an OWNER/ADMIN/MEMBER, I want to import records from a CSV (file or pasted), so that I can migrate existing data quickly.

**Acceptance criteria:**

- **Given** a CSV upload or pasted text, **when** parsed (papaparse), **then** the user maps CSV columns to the object's fields (suggested by header match), with per-type validation preview.
- **Given** a confirmed import, **when** executed, **then** rows are validated against the `FieldMetadata`-derived Zod schema and inserted via the query builder in a batched transaction; a summary reports inserted/skipped/errored counts.
- **Given** rows that fail validation, **when** the import runs, **then** valid rows still import and failed rows are reported with row numbers and reasons (no all-or-nothing surprise).
- **Given** a VIEWER, **when** they attempt import, **then** the action is rejected.

#### FR-H2 — Export records to CSV

**User story:** As any member, I want to export the current (filtered) record set to CSV, so that I can analyze or back up data externally.

**Acceptance criteria:**

- **Given** a filtered/sorted list, **when** the user exports, **then** a CSV of the currently-visible fields and matching rows is generated (respecting the active filters/sorts), with headers using field labels.
- **Given** an export then re-import of the same file, **when** completed, **then** the resulting record set equals the original for unique-keyed objects (M8 round-trip fidelity).

---

### Capability I — Dashboard

#### FR-I1 — Workspace dashboard

**User story:** As a sales user landing in my workspace, I want a dashboard of key metrics, so that I get an at-a-glance picture of the pipeline.

**Acceptance criteria:**

- **Given** the platform landing route, **when** loaded, **then** it shows KPI widgets (e.g., total opportunities, open pipeline value by currency, win rate, recent activities) computed via the query builder, all workspace-scoped.
- **Given** charts (recharts), **when** rendered in `ar`, **then** axes/labels are RTL-correct and values format per locale.
- **Given** an empty workspace, **when** loaded, **then** widgets show zero-states with localized guidance instead of errors.

---

## Non-Functional Requirements

### Performance

- **P1** — Record table list (50-field object, 25 rows/page) interactive in **< 1.5 s p95** on Neon pooled connections (M4). Query builder uses `LIMIT/OFFSET` or keyset pagination and indexed sorts.
- **P2** — `/join` provisioning (schema create + standard-object materialization + default pipeline) completes in **< 8 s p95** (M1). DDL runs on `DIRECT_URL`; queries on pooled `DATABASE_URL`.
- **P3** — Kanban `moveOpportunity` persists in a single transaction; board reflects on revalidate within one round trip (M5).
- **P4** — `getTenantContext()` resolves from Redis/in-memory cache for cached tenants; cold DB lookup behind a circuit breaker that fails fast. No per-request full table scans on metadata.
- **P5** — Connection discipline: never rely on session state (`SET`); fully-qualified table names only; pooled vs. direct URLs used per the rule above. Avoid catalog bloat hot paths (documented fallback to row-level scoping if tenant count explodes past tens of thousands of objects).

### Security

- **S1 — Schema-level tenant isolation (primary control).** Every data-plane query targets the resolved `pgSchema` from `getTenantContext()`. The query builder is the single choke point; no action constructs raw cross-schema SQL. Control-plane Prisma access is `workspaceId`-scoped with the `TENANT_SCOPED_MODELS` `$extends` dev guard.
- **S2 — No client-trusted tenancy.** Workspace id is always derived server-side (cookie/header/JWT), never accepted from the request body.
- **S3 — DDL identifier whitelisting (non-negotiable).** SQL identifiers (schema, table, column names) cannot be parameterized; therefore every identifier is validated against `FieldMetadata`/`ObjectMetadata` (whitelist), constrained to snake_case, and quoted via `pg` identifier escaping. Column types come only from the fixed `type→pgType` map. **All values are parameterized (`$1`)** — no value interpolation. This blocks SQL injection through both the metadata and the data path.
- **S4 — Transactional DDL with saga rollback.** Schema changes run inside a transaction; on failure the DDL rolls back and the paired metadata write is reverted, so metadata and physical schema never diverge.
- **S5 — Role gating.** Mutating and metadata/member actions enforce the MVP permission matrix server-side; VIEWER is read-only; only OWNER/ADMIN manage objects/fields/members; only OWNER deletes the workspace.
- **S6 — Auth & sessions.** Auth.js v5 JWT, hashed passwords, cross-subdomain cookies (`domain: '.crm.databayt.org'` prod) `httpOnly`/`sameSite=lax`; impersonation via `impersonate_workspaceId` restricted to platform admins.
- **S7 — Input validation.** All inputs Zod-validated server-side before touching either plane, including dynamically-generated schemas from `FieldMetadata`.

### Scalability

- **SC1** — Schema-per-workspace is acceptable for the clone's target tenant count; the documented fallback (row-level `workspaceId` for standard objects, dynamic tables only for custom objects) is reserved for very high tenant counts and revisited if catalog bloat appears.
- **SC2** — Stateless server actions behind the proxy; tenant resolution cached; horizontal scale on Vercel.
- **SC3** — Pagination and indexed queries keep large objects responsive; RELATION resolution uses batched lookups to avoid N+1.

### Accessibility

- **A1** — Platform pages pass axe with **zero serious/critical** violations (M7).
- **A2** — Kanban is fully keyboard-operable (dnd-kit keyboard sensors): pick up, move across columns, drop, with focus management and ARIA live announcements.
- **A3** — Forms have associated labels, error messaging linked via `aria-describedby`, and visible focus states.
- **A4** — Color is never the sole carrier of meaning (stage colors paired with text); contrast meets WCAG AA.

### Internationalization (Arabic-first, RTL default)

- **I1** — `defaultLocale = 'ar'`; `/` → `/ar`; `<html lang dir>` set from locale (`ar→rtl`, `en→ltr`) per `src/components/internationalization/config.ts`.
- **I2** — **Logical CSS only** (`ms/me/ps/pe`, `text-start/end`, `border-s/e`, `rtl:rotate-180`). No physical `left/right`, `ml/mr`, `pl/pr` in platform components.
- **I3** — Fonts switch by `dir`: Tajawal (RTL) / Inter (LTR) via `--app-font-sans` in `globals.css`.
- **I4** — Per-feature dictionaries `src/dictionaries/{ar,en}/<feature>.json` (`common`/`validation`/`toast`/`<object>`), threaded Content → Table → Form. **Object/field labels are bilingual in metadata** (`labelSingular`/`labelPlural`/`label`).
- **I5** — `src/lib/i18n-format.ts` formats currency/date/number via `Intl`, locale-aware. Every platform screen renders correctly in both locales (M6).

### Integration

- **IN1** — Google OAuth via Auth.js provider; Neon Postgres via `DATABASE_URL` (pooled) + `DIRECT_URL` (unpooled, DDL/migrations); Upstash Redis for tenant-context cache (fail-open if absent).
- **IN2** — Control-plane migrations via Prisma (`pnpm db:migrate`); data-plane DDL via the schema manager (raw `pg`), never via Prisma migrate.

---

## Implementation Planning

### Epic Breakdown Required

Requirements must be decomposed into epics and bite-sized stories (200k context limit). The phase→epic mapping (from the master plan) is:

| Epic                                            | Phase   | Covers FRs                             |
| ----------------------------------------------- | ------- | -------------------------------------- |
| Epic-0 Scaffold                                 | Phase 0 | (infrastructure; no user-facing FR)    |
| Epic-1 Auth + Tenant                            | Phase 1 | FR-A1, FR-A2, FR-A3                    |
| Epic-2 Metadata engine (Company vertical slice) | Phase 2 | FR-B1, FR-B4, FR-C1–C4 (Company only)  |
| Epic-3 Generic record UI                        | Phase 3 | FR-C1–C4 (people/opportunities), FR-G1 |
| Epic-4 Pipeline + Activities                    | Phase 4 | FR-D1, FR-D2, FR-E1, FR-E2             |
| Epic-5 Custom objects/fields                    | Phase 5 | FR-B2, FR-B3                           |
| Epic-6 Views / Import / Export / Dashboard      | Phase 6 | FR-F1, FR-F2, FR-H1, FR-H2, FR-I1      |

**Next Step:** Run `workflow epics-stories` to create the implementation breakdown (one `stories-section-<epic>.md` per epic, Given-When-Then ACs + "Files to change" tables + mermaid dep graphs).

---

## References

- Master plan: `~/.claude/plans/here-in-crm-we-typed-hickey.md`
- Companion control-plane schemas: `~/.claude/plans/here-in-crm-we-typed-hickey-agent-a1583746d3149796f.md`
- Project conventions: `/Users/abdout/crm/AGENTS.md`, `/Users/abdout/crm/CLAUDE.md`
- Architecture (ADRs + schema bodies): `/Users/abdout/crm/.bmad/planning/architecture-section-core.md`
- Product brief: `/Users/abdout/crm/.bmad/planning/brief.md`

---

## Next Steps

1. **Epic & Story Breakdown** — Run: `workflow epics-stories`
2. **UX Design** — `/handover` per platform route once the generic record UI lands
3. **Architecture** — `architecture-section-core.md` (two-plane design, DDL safety, tenant rules)
4. **Gate** — `implementation-readiness` before any coding

---

_This PRD captures the essence of the CRM — an Arabic-first, schema-per-workspace, metadata-driven Twenty clone where standard and custom objects are one and the same._
