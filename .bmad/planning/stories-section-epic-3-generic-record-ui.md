# Story Breakdown: Epic-3 — Generic Record UI (generalize to Person / Opportunity)

## Status: PROPOSED

> **Phase 3** of `~/.claude/plans/here-in-crm-we-typed-hickey.md`. Covers PRD
> **FR-C1–C4 (person/opportunity), FR-G1** and ADR-006. Epic-2 proved the metadata
> engine and the generic record UI **against one object (Company)**. This epic
> **generalizes** that build-once UI to every standard object — person (with a
> RELATION to company) and opportunity (with RELATIONs to stage/company/owner) —
> with **zero new per-object backend**, completes the per-type field renderer set,
> and makes filters/sorts/visible-fields/pagination fully URL-driven via `nuqs`.

---

## Epic Goal

All standard objects are usable through the one generic, metadata-driven record UI
(`src/components/platform/record/`): table, form, detail. A `<object>` route param drives
the page; person and opportunity render with their RELATION lookups; the full field-type
renderer set (TEXT…RATING) is complete and degrades gracefully on unknown types; filters,
sorts, visible columns, view selection, and pagination all live in the URL (shareable,
bookmarkable, back-button-safe). Verified across **both locales** with clean RTL snapshots
and a passing cross-workspace isolation E2E.

## Dependencies

- **Upstream:** Epic-2 (schema-manager, query-builder, seed-metadata, Zod-from-metadata,
  generic record actions/table/form/detail — all proven on Company).
- **Downstream:** Epic-4 (pipeline/activities layer object-specific behaviour over this
  generic system), Epic-5 (custom objects render here unchanged), Epic-6 (saved views
  persist this URL state; import/export reads these field shapes).

### Dependency Graph

```
STORY-3.1 (Generic [object] route + sidebar nav from metadata)
   ├──> STORY-3.2 (Complete field-renderer set, incl. RELATION lookup)
   │        ├──> STORY-3.3 (Person end-to-end via generic UI)
   │        └──> STORY-3.4 (Opportunity table end-to-end via generic UI)
   ├──> STORY-3.5 (nuqs URL state: filter/sort/visible-fields/pagination)
   └──> STORY-3.6 (Dictionaries + RTL verification, both locales)
                 └──> STORY-3.7 (Generalization + isolation E2E across objects)
```

---

## STORY-3.1: Generic `[object]` route + metadata-driven sidebar nav

**As a** sales user
**I want** every object reachable from the sidebar via one generic route
**So that** standard and custom objects share a single routing path (ADR-006)

**Acceptance Criteria:**

- Given the route, when inspected, then a generic
  `app/[lang]/s/[subdomain]/(platform)/[object]/page.tsx` resolves the `<object>` param,
  loads its `ObjectMetadata`, and renders `record/content.tsx` — replacing the
  Company-specific route from Epic-2 (Company now flows through the generic segment).
- Given the sidebar, when rendered, then it lists active objects from `ObjectMetadata`
  (`isActive=true`) with their `labelPlural` (locale-correct) and icon.
- Given an unknown/inactive object slug, when visited, then a localized 404/empty-state
  renders (no crash).
- Given locale `ar`, when the nav renders, then labels are Arabic and the layout is RTL.

**Files to change:**

| File                                                             | Change                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/app/[lang]/s/[subdomain]/(platform)/[object]/page.tsx`      | Generic RSC route; resolve `<object>` → metadata → `record/content.tsx` |
| `src/app/[lang]/s/[subdomain]/(platform)/[object]/[id]/page.tsx` | Generic detail route                                                    |
| `src/components/platform/shell/sidebar.tsx`                      | List objects from `ObjectMetadata`; locale labels + icons               |
| `src/components/platform/record/content.tsx`                     | Accept `objectName` prop (generalize from Company)                      |

**Estimate:** 3-4 hours

---

## STORY-3.2: Complete field-renderer set (incl. RELATION lookup)

**As a** sales user
**I want** every field type to render a correct read cell and write input
**So that** any object — including ones with relations — displays and edits correctly

**Acceptance Criteria:**

- Given the closed field-type enum, when rendered, then each of
  `TEXT|NUMBER|BOOLEAN|DATE|DATETIME|SELECT|MULTI_SELECT|RELATION|CURRENCY|EMAIL|PHONE|URL|
RATING` has a read cell and a write input (reusing databayt form atoms).
- Given a `RELATION` field, when rendered, then it shows a lookup control that searches the
  target object's records **within the same workspace schema** (via the builder) and stores
  the related `<name>_id`.
- Given `CURRENCY`, when rendered, then the amount formats via `Intl` using the field's
  `options.currency`; `DATE`/`DATETIME` format per locale.
- Given an unhandled/unknown `FieldMetadata.type`, when rendered, then it degrades
  gracefully to a text cell/input (no crash).
- Given `field-renderers/*.test.ts`, when run, then each type's read/write round-trips and
  RELATION resolves the target label.

**Files to change:**

| File                                                                 | Change                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/components/platform/record/field-renderers/*`                   | Complete BOOLEAN/DATE/DATETIME/MULTI_SELECT/RELATION/RATING (atop Epic-2's TEXT/NUMBER/CURRENCY/EMAIL/URL/PHONE/SELECT) |
| `src/components/platform/record/field-renderers/relation-lookup.tsx` | Same-schema target search via builder                                                                                   |
| `src/components/form/atoms/*`                                        | Copy/adapt from `hogwarts/src/components/form/atoms/` + `codebase/src/components/atom/`                                 |
| `src/lib/i18n-format.ts`                                             | `formatCurrency/Date/Number` via `Intl`                                                                                 |
| `src/components/platform/record/field-renderers/renderers.test.ts`   | Per-type round-trip + RELATION                                                                                          |

**Estimate:** 4-6 hours

---

## STORY-3.3: Person end-to-end through the generic UI

**As a** sales user
**I want** People fully usable (table/form/detail) with a Company relation
**So that** I can manage contacts and link them to accounts — with no new backend

**Acceptance Criteria:**

- Given `/ar/people`, when loaded, then the generic table renders `person` from its
  materialized table via the builder, with columns from `FieldMetadata`
  (`first_name`, `last_name`, `email`, `phone`, `job_title`, `linkedin_url`, `avatar_url`,
  `company_id`).
- Given the create form, when `company_id` (RELATION) is rendered, then a Company lookup
  resolves same-workspace companies; selecting one stores its id.
- Given a Person detail, when opened, then the field panel shows the linked Company via the
  RELATION renderer; editing patches only changed columns.
- Given the entire flow, when exercised, then **no person-specific server action or table
  code** was written — it is the generic `record/` path parameterized by `person` metadata.

**Files to change:**

| File                                   | Change                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `prisma/seed-metadata.ts`              | Confirm `person` field set + `company_id` RELATION→company (seeded in Epic-2) |
| `src/dictionaries/{ar,en}/person.json` | Person labels/toasts                                                          |
| (no new) `record/*`                    | Reused unchanged — generic path                                               |

**Estimate:** 2-3 hours

---

## STORY-3.4: Opportunity table end-to-end through the generic UI

**As a** sales user
**I want** Opportunities usable as a table with amount/currency/close-date and relations
**So that** I can manage deals before the Kanban board lands (Epic-4)

**Acceptance Criteria:**

- Given `/ar/opportunities`, when loaded, then the generic table renders `opportunity`
  (`name`, `amount CURRENCY`, `close_date DATE`, `stage_id RELATION→stage`,
  `company_id RELATION→company`, `owner_id RELATION→member`, `position NUMBER`).
- Given `amount`, when displayed, then it formats via `Intl` with the workspace/field
  currency; `close_date` formats per locale.
- Given `stage_id`/`company_id`/`owner_id`, when rendered, then each resolves its target
  label via the RELATION renderer within the workspace schema.
- Given create/edit/soft-delete, when performed, then they flow through the generic actions
  - builder with role gating; **no opportunity-specific backend** is added here (Kanban
    drag-to-move is Epic-4).

**Files to change:**

| File                                        | Change                                                         |
| ------------------------------------------- | -------------------------------------------------------------- |
| `prisma/seed-metadata.ts`                   | Confirm `opportunity` field set + RELATIONs (seeded in Epic-2) |
| `src/dictionaries/{ar,en}/opportunity.json` | Opportunity labels/toasts                                      |
| (no new) `record/*`                         | Reused unchanged — generic path                                |

**Estimate:** 2-3 hours

---

## STORY-3.5: nuqs URL state — filter / sort / visible-fields / pagination

**As a** sales user
**I want** filters, sorts, visible columns, and pagination encoded in the URL
**So that** I can share and bookmark an exact slice of any object (FR-G1)

**Acceptance Criteria:**

- Given a faceted filter, sort change, visible-column toggle, or page change, when applied,
  then it serializes to the URL via `nuqs` and the server re-queries via the builder using
  the URL as the source of truth.
- Given a shared URL, when another member of the same workspace opens it, then the identical
  filtered/sorted view renders.
- Given a filter referencing a field, when applied, then the field is validated against
  `FieldMetadata` (no arbitrary column filtering) — the builder rejects unknown fields.
- Given the back button, when pressed, then the previous filter/sort/page state restores
  from the URL.
- Given `NuqsAdapter`, when mounted in the root layout, then nuqs state works app-wide.

**Files to change:**

| File                                                      | Change                                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/components/platform/record/record-table.tsx`         | nuqs parsers for `filters`/`sorts`/`visibleFields`/`page`/`pageSize`; faceted filter (copy `codebase/atom/faceted.tsx`) |
| `src/components/platform/record/use-record-table.ts`      | URL state hook driving the builder query                                                                                |
| `src/app/layout.tsx`                                      | Ensure `NuqsAdapter` mounted (from Epic-0/1)                                                                            |
| `src/lib/query-builder.ts`                                | Confirm filter/sort field whitelist rejects unknown fields                                                              |
| `src/components/platform/record/use-record-table.test.ts` | URL ⇄ query mapping; unknown-field rejection                                                                            |

**Estimate:** 4-5 hours

---

## STORY-3.6: Dictionaries + RTL verification across objects

**As an** Arabic-speaking user
**I want** every generic screen correct in `ar` (RTL) and `en` (LTR)
**So that** the CRM is Arabic-first across all objects (PRD M6 / I1–I5)

**Acceptance Criteria:**

- Given `dictionaries/{ar,en}/`, when inspected, then `common`/`validation`/`toast` plus
  per-object keys exist for company/person/opportunity, threaded Content → Table → Form.
- Given every generic screen, when audited, then it uses **logical CSS only**
  (`ms/me/ps/pe`, `text-start/end`, `border-s/e`, `rtl:rotate-180`) — no physical
  `left/right`, `ml/mr`, `pl/pr`.
- Given locale `ar`, when any table/form/detail renders, then headers/labels are Arabic,
  the layout is RTL, fonts switch to Tajawal, and numbers/dates/currency format via `Intl`.
- Given object/field metadata, when rendered, then bilingual `labelSingular`/`labelPlural`/
  `label` variants drive headers without code changes (I4).
- Given RTL snapshots, when run for each object, then they are clean (M6).

**Files to change:**

| File                                             | Change                                 |
| ------------------------------------------------ | -------------------------------------- |
| `src/dictionaries/ar/*`, `src/dictionaries/en/*` | Complete per-object dictionaries       |
| `src/components/platform/record/*`               | Audit + fix any physical CSS → logical |
| `e2e/rtl-snapshots.spec.ts`                      | RTL snapshot per object, both locales  |

**Estimate:** 3-4 hours

---

## STORY-3.7: Generalization + isolation E2E across objects

**As a** developer
**I want** an E2E that exercises all standard objects and re-proves isolation
**So that** the "build once, render every object" claim holds and tenancy stays airtight

**Acceptance Criteria:**

- Given the Playwright suite (mirror hogwarts `@multi-tenant`/`@auth`), when run, then CRUD
  - filter/sort pass for company, person, opportunity in **both** locales.
- Given a Person/Opportunity created on `acme`, when `globex` queries the same object, then
  it returns empty (schema isolation re-proven across objects).
- Given RELATION fields, when exercised in E2E, then lookups resolve only same-workspace
  targets.
- Given `/block` audit on `record/`, when run, then ≥ 85; `pnpm validate` green.

**Files to change:**

| File                                                 | Change                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `e2e/records.spec.ts`                                | CRUD + filter/sort for company/person/opportunity, ar/en |
| `e2e/isolation.spec.ts`                              | Cross-workspace read empty across objects                |
| `src/components/platform/record/integration.test.ts` | Extend Epic-2 test to person/opportunity                 |

**Estimate:** 3-4 hours

---

## Summary

| Story                                    | Files         | Estimate    | Priority      |
| ---------------------------------------- | ------------- | ----------- | ------------- |
| STORY-3.1 Generic `[object]` route + nav | 4             | 3-4h        | P0 (blocking) |
| STORY-3.2 Complete field-renderer set    | 5             | 4-6h        | P0            |
| STORY-3.3 Person end-to-end              | 2             | 2-3h        | P1            |
| STORY-3.4 Opportunity table end-to-end   | 2             | 2-3h        | P1            |
| STORY-3.5 nuqs URL state                 | 5             | 4-5h        | P0            |
| STORY-3.6 Dictionaries + RTL             | 3             | 3-4h        | P1            |
| STORY-3.7 Generalization + isolation E2E | 3             | 3-4h        | P0            |
| **Total**                                | **~24 files** | **~21-29h** |               |

### Implementation Order

1. STORY-3.1 first (generic route + nav generalizes Epic-2's Company-specific route).
2. STORY-3.2 next (the renderer set, esp. RELATION, unblocks person/opportunity).
3. STORY-3.3 + STORY-3.4 in parallel (both are pure metadata wiring once renderers exist).
4. STORY-3.5 (nuqs) alongside; STORY-3.6 (dicts/RTL) as objects land.
5. STORY-3.7 last (E2E across all objects + isolation re-proof).

**Exit:** all standard objects (company/person/opportunity) usable through one generic
metadata-driven UI; filter/sort/visible-fields URL-driven; CRUD verified in both locales;
RTL clean; cross-workspace read returns empty.
