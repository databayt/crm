# Story Breakdown: Epic-6 — Views/Favorites + CSV Import/Export + Dashboard

## Status: PROPOSED

> **Phase 6** of `~/.claude/plans/here-in-crm-we-typed-hickey.md`. Covers PRD
> **FR-F1, FR-F2, FR-H1, FR-H2, FR-I1**. The final MVP epic: persist the URL-driven
> table/Kanban state as saved `View`s and `Favorite`s (control plane), CSV import
> (paste/upload, port `codebase/leads/bulk-import.tsx`) and export over the
> query-builder, and a workspace KPI **dashboard** (recharts). Then the ship loop:
> `/check → /ship → /watch`.

---

## Epic Goal

A sales user configures a table/Kanban (filters, sorts, visible fields, groupBy), saves it
as a named `View`, and stars views/records as `Favorite`s that appear in the sidebar. They
import records from CSV (upload or paste) with header mapping and per-row validation, export
the current filtered set to CSV (round-trip fidelity per M8), and land on a workspace KPI
dashboard (open pipeline value by currency, win rate, recent activities) that is
zero-state-safe and RTL-correct. `/check → /ship → /watch` closes the MVP.

## Dependencies

- **Upstream:** Epic-3 (nuqs URL state is what a `View` persists; generic table is what
  export reads; Zod-from-metadata is what import validates), Epic-4 (Kanban `viewType`),
  Epic-5 (views/import/export apply to custom objects + fields too — they are real columns).
- **External:** `papaparse` (CSV), `recharts` (dashboard) — already in `package.json`.
- **Downstream:** none (MVP exit). Growth features (webhooks/API, RBAC enforcement) are
  post-MVP per the brief.

### Dependency Graph

```
STORY-6.1 (Save/load View — persist URL state to control plane)
   └──> STORY-6.2 (Favorites — star views/records → sidebar)
STORY-6.3 (CSV export — current filtered set via builder)
   └──> STORY-6.4 (CSV import — paste/upload, map, validate, batch insert)
STORY-6.5 (Dashboard — KPI widgets via builder + recharts)
STORY-6.6 (i18n/RTL polish + a11y across views/import/dashboard)
   └──> STORY-6.7 (MVP E2E + check/ship/watch)
```

---

## STORY-6.1: Save / load a View (persist URL state)

**As a** sales user
**I want** to save the current filters/sorts/visible-fields as a named view
**So that** I can return to a configured slice instantly (FR-F1)

**Acceptance Criteria:**

- Given a configured table or Kanban (filters, sorts, visible fields, groupBy), when the user
  saves it with a name, then a `View` row (control plane) stores
  `{ objectId, viewType, name, filters, sorts, visibleFields, groupBy }` scoped to the
  workspace.
- Given a saved view, when selected, then the URL state (nuqs) and the rendered list update to
  match the view's config.
- Given a view referencing a field, when loaded, then fields are validated against
  `FieldMetadata` (a renamed/removed field degrades gracefully).
- Given the save/load actions, when run, then they begin with `getTenantContext()`, role-gate,
  and return `ActionResponse<T>`.

**Files to change:**

| File                                                  | Change                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/components/platform/record/view-actions.ts`      | `'use server' saveView`, `loadView`, `listViews`, `deleteView` (Prisma `View`) |
| `src/components/platform/record/view-switcher.tsx`    | View dropdown; save-current-as dialog                                          |
| `src/components/platform/record/use-record-table.ts`  | Apply a `View`'s config to nuqs URL state                                      |
| `src/components/platform/record/view-actions.test.ts` | Save/load round-trip; field-drift tolerance                                    |

**Estimate:** 4-5 hours

---

## STORY-6.2: Favorites — star views/records → sidebar

**As a** sales user
**I want** to favorite views and records
**So that** my most-used destinations are one click away (FR-F2)

**Acceptance Criteria:**

- Given a view or record, when starred, then a `Favorite` row (`objectName`, optional
  `recordId`, `position`) is created scoped to the user + workspace, and it appears in the
  sidebar favorites section.
- Given a favorite, when unstarred, then it is removed from the sidebar.
- Given multiple favorites, when reordered, then `position` persists the order.
- Given locale `ar`, when favorites render, then labels are locale-correct and the section is
  RTL.

**Files to change:**

| File                                                      | Change                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/components/platform/record/favorite-actions.ts`      | `'use server' toggleFavorite`, `listFavorites`, `reorderFavorites` (Prisma `Favorite`) |
| `src/components/platform/shell/sidebar.tsx`               | Favorites section render + star toggle                                                 |
| `src/components/platform/record/favorite-actions.test.ts` | Toggle, scope, reorder                                                                 |

**Estimate:** 3-4 hours

---

## STORY-6.3: CSV export — current filtered set

**As a** member
**I want** to export the current (filtered) record set to CSV
**So that** I can analyze or back up data externally (FR-H2)

**Acceptance Criteria:**

- Given a filtered/sorted list, when exported, then a CSV of the currently-visible fields and
  matching rows is generated (respecting active filters/sorts via the builder), with headers
  using field labels.
- Given an export then re-import of the same file, when completed, then the resulting record
  set equals the original for unique-keyed objects (M8 round-trip fidelity).
- Given locale `ar`, when exporting, then headers use Arabic labels and values format
  appropriately (or raw values with a locale note — documented).
- Given the export action, when run, then it is workspace-scoped via `getTenantContext()`.

**Files to change:**

| File                                                    | Change                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/components/platform/record/export-actions.ts`      | `'use server' exportCsv`: builder `findMany` with active filters → papaparse unparse |
| `src/components/platform/record/export-dialog.tsx`      | Export UI (port `codebase/leads/export-dialog.tsx`)                                  |
| `src/components/platform/record/export-actions.test.ts` | Filtered set + label headers                                                         |

**Estimate:** 2-3 hours

---

## STORY-6.4: CSV import — paste/upload, map, validate, batch insert

**As an** OWNER/ADMIN/MEMBER
**I want** to import records from a CSV (file or pasted)
**So that** I can migrate existing data quickly (FR-H1)

**Acceptance Criteria:**

- Given a CSV upload or pasted text, when parsed (papaparse), then the user maps CSV columns
  to the object's fields (suggested by header match) with a per-type validation preview.
- Given a confirmed import, when executed, then rows are validated against the
  `FieldMetadata`-derived Zod schema and inserted via the builder in a **batched transaction**;
  a summary reports inserted/skipped/errored counts.
- Given rows that fail validation, when the import runs, then valid rows still import and
  failed rows are reported with row numbers and reasons (no all-or-nothing surprise).
- Given a VIEWER, when they attempt import, then the action is rejected.

**Files to change:**

| File                                                    | Change                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/components/platform/record/import-dialog.tsx`      | Upload/paste → map → preview (port `codebase/leads/bulk-import.tsx`)                            |
| `src/components/platform/record/import-actions.ts`      | `'use server' importCsv`: validate (Zod-from-metadata) + batched builder insert; per-row report |
| `src/components/platform/record/import-actions.test.ts` | Partial-success report; VIEWER rejected                                                         |

**Estimate:** 5-6 hours

---

## STORY-6.5: Dashboard — KPI widgets via builder + recharts

**As a** sales user landing in my workspace
**I want** a dashboard of key metrics
**So that** I get an at-a-glance picture of the pipeline (FR-I1)

**Acceptance Criteria:**

- Given the platform landing route, when loaded, then it shows KPI widgets (total
  opportunities, open pipeline value by currency, win rate, recent activities) computed via
  the builder, all workspace-scoped.
- Given charts (recharts), when rendered in `ar`, then axes/labels are RTL-correct and values
  format per locale (`Intl`).
- Given an empty workspace, when loaded, then widgets show zero-states with localized guidance
  instead of errors.
- Given the dashboard, when loaded, then it replaces the Epic-1 zero-state landing page.

**Files to change:**

| File                                               | Change                                        |
| -------------------------------------------------- | --------------------------------------------- |
| `src/app/[lang]/s/[subdomain]/(platform)/page.tsx` | Dashboard route (replaces zero-state landing) |
| `src/components/platform/dashboard/content.tsx`    | RSC: compute KPIs via builder                 |
| `src/components/platform/dashboard/kpi-cards.tsx`  | KPI widgets                                   |
| `src/components/platform/dashboard/charts.tsx`     | recharts (RTL-correct, `Intl`)                |
| `src/dictionaries/{ar,en}/dashboard.json`          | KPI labels + zero-state copy                  |

**Estimate:** 4-5 hours

---

## STORY-6.6: i18n / RTL polish + a11y across views/import/dashboard

**As an** Arabic-speaking user
**I want** the views, import/export, and dashboard correct in both locales and accessible
**So that** the MVP meets its Arabic-first and accessibility bars (M6/M7)

**Acceptance Criteria:**

- Given every Epic-6 screen, when audited, then it uses logical CSS only and is RTL-correct in
  `ar`; dictionaries are complete for `view`/`import`/`export`/`dashboard`.
- Given axe, when run on dashboard + dialogs, then zero serious/critical violations (M7).
- Given dialogs (import/export/save-view), when operated by keyboard, then focus is trapped and
  managed; forms have associated labels and `aria-describedby` errors (A3).
- Given recharts, when rendered, then color is paired with text/labels (A4).

**Files to change:**

| File                                                           | Change                                   |
| -------------------------------------------------------------- | ---------------------------------------- |
| `src/components/platform/{record,dashboard}/*`                 | Logical-CSS audit + a11y fixes           |
| `src/dictionaries/{ar,en}/{view,import,export,dashboard}.json` | Complete keys                            |
| `e2e/views-rtl.spec.ts`                                        | RTL snapshots for views/import/dashboard |

**Estimate:** 3-4 hours

---

## STORY-6.7: MVP E2E + check / ship / watch

**As a** team
**I want** full-MVP E2E coverage and the release loop
**So that** the clone ships verified across every capability (PRD success criteria)

**Acceptance Criteria:**

- Given the Playwright suite, when run, then save/load view, favorites, CSV import (partial
  success), CSV export (round-trip M8), and dashboard KPIs pass in **both** locales.
- Given the full suite (Epics 1–6), when run, then onboarding, isolation, CRUD, Kanban,
  timeline, custom object/field, views, and import/export all pass — cross-workspace reads
  return empty throughout.
- Given `/check`, when run, then build + typecheck + lint pass and `/block` audit ≥ 85 on all
  platform blocks; `pnpm validate` green.
- Given `/ship`, when run, then deploy to Vercel succeeds; `/watch` post-deploy is clean (no
  console errors, smoke green).

**Files to change:**

| File                                | Change                                          |
| ----------------------------------- | ----------------------------------------------- |
| `e2e/views.spec.ts`                 | Save/load view + favorites                      |
| `e2e/import-export.spec.ts`         | Import partial success + export round-trip (M8) |
| `e2e/dashboard.spec.ts`             | KPI widgets + zero-state                        |
| `.bmad/planning/sprint-status.yaml` | Mark MVP epics complete                         |

**Estimate:** 3-4 hours

---

## Summary

| Story                                | Files         | Estimate    | Priority |
| ------------------------------------ | ------------- | ----------- | -------- |
| STORY-6.1 Save/load View             | 4             | 4-5h        | P0       |
| STORY-6.2 Favorites                  | 3             | 3-4h        | P1       |
| STORY-6.3 CSV export                 | 3             | 2-3h        | P1       |
| STORY-6.4 CSV import                 | 3             | 5-6h        | P0       |
| STORY-6.5 Dashboard                  | 5             | 4-5h        | P1       |
| STORY-6.6 i18n/RTL + a11y polish     | 3             | 3-4h        | P1       |
| STORY-6.7 MVP E2E + check/ship/watch | 4             | 3-4h        | P0       |
| **Total**                            | **~25 files** | **~24-31h** |          |

### Implementation Order

1. STORY-6.1 → 6.2 (views then favorites; favorites surface saved views).
2. STORY-6.3 → 6.4 (export before import; import reuses the field/Zod plumbing).
3. STORY-6.5 (dashboard) in parallel with the views/CSV track (independent).
4. STORY-6.6 (i18n/a11y polish) as screens land.
5. STORY-6.7 last (full-MVP E2E + `/check → /ship → /watch`).

**Exit (MVP complete):** saved views + favorites, CSV import/export with round-trip fidelity,
and a workspace KPI dashboard — all RTL-correct and accessible; the full Epic 1–6 E2E passes;
`/check → /ship → /watch` is green.
