# Story Breakdown: Epic-5 — Custom Objects + Custom Fields

## Status: PROPOSED

> **Phase 5** of `~/.claude/plans/here-in-crm-we-typed-hickey.md`. Covers PRD
> **FR-B2, FR-B3** and ADR-002/006/008. This is **Twenty's differentiator** — and per
> ADR-002 it is **now mostly free**: because standard objects are seeded metadata and
> materialized by the same engine, a user-created object/field renders in every generic
> view the instant its metadata exists. This epic is the **Settings UI** over the
> already-built `schema-manager` (runtime DDL) and `query-builder` (choke point), plus
> the role gates and saga that keep metadata and physical schema in lockstep.

---

## Epic Goal

An OWNER/ADMIN opens Settings → Objects/Fields, creates a custom object or adds/edits/
removes a field, and the change is applied at runtime via the metadata engine — a real
table/column in `ws_<id>` — appearing instantly (M3 < 10 s, no rebuild, no manual
migration) across every generic table, form, detail, and (where grouped) Kanban view.
Every DDL identifier is whitelisted and quoted; every change is a transaction with
saga rollback so metadata and schema never diverge; MEMBER/VIEWER are gated out.

## Dependencies

- **Upstream:** Epic-2 (`schema-manager.materializeObject/addField/alterField/dropField`,
  identifier whitelist, `type→pgType` map, saga), Epic-3 (generic record UI + sidebar nav
  from metadata that renders any new object/field automatically).
- **Downstream:** Epic-6 (saved views + import/export operate over custom fields too,
  since they are real columns).

### Dependency Graph

```
STORY-5.1 (Settings shell + Objects/Fields navigation, role-gated)
   ├──> STORY-5.2 (Create custom object → materializeObject → renders in sidebar)
   │        └──> STORY-5.3 (Add custom field → addField → renders in views)
   │                 ├──> STORY-5.4 (Edit field label/options + safe alterField)
   │                 └──> STORY-5.5 (Remove field/object → dropField/drop table)
   └──> STORY-5.6 (Reconcile + schema-version guard)
                 └──> STORY-5.7 (Settings E2E: create object+field renders instantly)
```

---

## STORY-5.1: Settings shell + Objects/Fields navigation (role-gated)

**As an** OWNER/ADMIN
**I want** a Settings area listing objects and their fields
**So that** I have a place to manage the data model (FR-B2/B3)

**Acceptance Criteria:**

- Given `/ar/settings/objects`, when loaded, then it lists all `ObjectMetadata` for the
  workspace (standard + custom) with `labelPlural`, icon, and `isCustom` badge.
- Given an object, when selected, then `/ar/settings/objects/[object]/fields` lists its
  `FieldMetadata` with type, nullability, and `isSystem`/`isCustom` flags.
- Given a MEMBER or VIEWER, when they visit Settings → Objects, then access is denied by the
  role gate (only OWNER/ADMIN per the PRD matrix).
- Given locale `ar`, when Settings renders, then it is RTL and copy comes from
  `dictionaries/ar/settings.json`.

**Files to change:**

| File                                                                                | Change                         |
| ----------------------------------------------------------------------------------- | ------------------------------ |
| `src/app/[lang]/s/[subdomain]/(platform)/settings/objects/page.tsx`                 | Objects list (RSC, role-gated) |
| `src/app/[lang]/s/[subdomain]/(platform)/settings/objects/[object]/fields/page.tsx` | Fields list (RSC)              |
| `src/components/platform/settings/objects-list.tsx`                                 | Object list UI                 |
| `src/components/platform/settings/fields-list.tsx`                                  | Field list UI                  |
| `src/dictionaries/{ar,en}/settings.json`                                            | Settings copy                  |

**Estimate:** 3-4 hours

---

## STORY-5.2: Create a custom object (runtime DDL)

**As an** OWNER/ADMIN
**I want** to create a custom object in Settings
**So that** I can model entities specific to my business (FR-B2)

**Acceptance Criteria:**

- Given Settings → "New object", when a singular/plural name + bilingual labels (ar/en) +
  icon are submitted, then an `ObjectMetadata` row (`isCustom=true`) is created and
  `schemaManager.materializeObject` runs `CREATE TABLE "ws_<id>"."<table>"` (with system
  columns) inside a transaction.
- Given success, when the saga commits, then the object appears in the sidebar and its
  generic list route (`/[object]`) renders immediately (M3) — no rebuild.
- Given an invalid/reserved name, when submitted, then validation rejects it **before any
  DDL** (identifier whitelist, snake_case, no collision with existing object names).
- Given the DDL fails, when the transaction aborts, then the `ObjectMetadata` write rolls
  back (saga) and a localized error returns — no orphan table or metadata.
- Given a MEMBER/VIEWER, when they attempt to create, then the action is rejected.

**Files to change:**

| File                                                      | Change                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/components/platform/settings/object-form.tsx`        | Create-object form (name, labels ar/en, icon)                                                         |
| `src/components/platform/settings/object-actions.ts`      | `'use server' createObject`; role gate → metadata write → `materializeObject` saga → `revalidatePath` |
| `src/lib/metadata/name-derivation.ts`                     | Label → snake_case name derivation + collision check                                                  |
| `src/components/platform/settings/object-actions.test.ts` | Reserved-name rejection; saga rollback; role gate                                                     |

**Estimate:** 4-5 hours

---

## STORY-5.3: Add a custom field (runtime DDL → instant render)

**As an** OWNER/ADMIN
**I want** to add a field to any object
**So that** the data model fits my process and appears instantly everywhere (FR-B3)

**Acceptance Criteria:**

- Given Settings → "Add field" (name, bilingual label, type, nullable, default, options for
  SELECT/RELATION), when submitted, then a `FieldMetadata` row is created and
  `schemaManager.addField` runs `ALTER TABLE … ADD COLUMN` with the mapped pg type, inside a
  transaction with saga rollback.
- Given the new field, when any list/form/detail/Kanban view for that object renders, then
  the field appears immediately with the correct per-type input/cell — no rebuild, no manual
  migration (M3 < 10 s).
- Given a RELATION field, when added, then a `<name>_id uuid` column is created with a target
  in `options.targetObject` (same-schema FK where applicable).
- Given every identifier, when built, then it is whitelisted against `FieldMetadata` and
  quoted — never string-concatenated from raw input (S3).
- Given a MEMBER/VIEWER, when they attempt to add a field, then the action is rejected.

**Files to change:**

| File                                                     | Change                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/components/platform/settings/field-form.tsx`        | Add-field form (type-aware: options for SELECT/RELATION)                                               |
| `src/components/platform/settings/field-actions.ts`      | `'use server' addField`; role gate → metadata write → `schemaManager.addField` saga → `revalidatePath` |
| `src/components/platform/settings/field-actions.test.ts` | Add-column DDL shape; whitelist; saga rollback; role gate                                              |

**Estimate:** 4-5 hours

---

## STORY-5.4: Edit a field's label/options + safe `alterField`

**As an** OWNER/ADMIN
**I want** to edit a field's label, options, or nullability
**So that** I can refine the model without losing data (FR-B3)

**Acceptance Criteria:**

- Given an ADMIN edits a field's label/options, when saved, then `FieldMetadata` updates and
  the UI reflects it on next render with no DDL (metadata-only change).
- Given a type/width change requiring `ALTER COLUMN`, when saved, then `schemaManager.alterField`
  runs **widening/nullability only** as guarded DDL; narrowing-with-existing-data is **blocked**
  with a localized explanation.
- Given the alter fails, when the transaction aborts, then the metadata edit rolls back (saga).
- Given a system field (`isSystem=true`), when edit is attempted on its core type, then it is
  rejected.

**Files to change:**

| File                                                     | Change                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/components/platform/settings/field-form.tsx`        | Edit mode; disable unsafe narrowing                                             |
| `src/components/platform/settings/field-actions.ts`      | `editField`: metadata update; conditional `alterField` (widen/nullability only) |
| `src/lib/schema-manager.ts`                              | Confirm `alterField` blocks narrowing                                           |
| `src/components/platform/settings/field-actions.test.ts` | Widen allowed, narrow blocked, saga rollback                                    |

**Estimate:** 3-4 hours

---

## STORY-5.5: Remove a field / deactivate an object

**As an** OWNER/ADMIN
**I want** to remove a custom field or deactivate a custom object
**So that** I can clean up the model safely (FR-B3)

**Acceptance Criteria:**

- Given an ADMIN removes a custom field, when confirmed, then `schemaManager.dropField` runs
  `ALTER TABLE … DROP COLUMN` and the `FieldMetadata` row is deleted in the same saga.
- Given a system field (`isSystem=true`), when removal is attempted, then it is blocked.
- Given a RELATION field with dependents, when removal is attempted, then a soft-check warns/
  blocks before dropping.
- Given an object deactivation, when confirmed, then `ObjectMetadata.isActive=false` and it
  disappears from the sidebar (full `DROP TABLE` reserved for workspace deletion, not field
  cleanup); data is retained.
- Given the drop fails, when the transaction aborts, then the metadata delete rolls back (saga).

**Files to change:**

| File                                                     | Change                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/components/platform/settings/field-actions.ts`      | `removeField`: dropField saga; system-field/RELATION-dependent guard |
| `src/components/platform/settings/object-actions.ts`     | `deactivateObject`: `isActive=false`                                 |
| `src/components/platform/settings/fields-list.tsx`       | Remove/confirm UI                                                    |
| `src/components/platform/settings/field-actions.test.ts` | Drop saga; system/RELATION guards                                    |

**Estimate:** 3-4 hours

---

## STORY-5.6: Reconcile + schema-version guard

**As a** developer/operator
**I want** a way to reconcile a workspace's physical schema against its metadata
**So that** divergence (from a failed/partial DDL or a standard-object evolution) is fixable

**Acceptance Criteria:**

- Given a workspace, when `reconcile(workspaceId)` runs, then it idempotently re-applies
  missing DDL (`ADD COLUMN IF NOT EXISTS`-style guards) to match `FieldMetadata`.
- Given a per-object `schemaVersion` (or `FieldMetadata` hash), when tracked, then the
  physical schema can be compared against metadata to detect drift.
- Given a standard-object seed-metadata change in a release, when the forward routine runs,
  then it applies the additive delta to every existing workspace's schema (batched, over
  `DIRECT_URL`).
- Given reconcile, when run on an already-consistent workspace, then it is a no-op.

**Files to change:**

| File                             | Change                                                  |
| -------------------------------- | ------------------------------------------------------- |
| `src/lib/schema-manager.ts`      | `reconcile(workspaceId)`; `schemaVersion`/hash tracking |
| `prisma/seed-metadata.ts`        | Forward-delta routine for standard-object evolution     |
| `src/lib/schema-manager.test.ts` | Reconcile idempotency; drift detection                  |

**Estimate:** 3-4 hours

---

## STORY-5.7: Settings E2E — create object + field renders instantly

**As a** developer
**I want** an E2E proving runtime object/field creation renders everywhere instantly
**So that** the differentiator is verified end-to-end (M3) with DDL confirmed in Neon

**Acceptance Criteria:**

- Given the Playwright suite, when an ADMIN creates a custom object in Settings, then the
  object appears in the sidebar and its list route renders within M3 (< 10 s).
- Given a custom field added to an existing object, when added, then the new column appears
  immediately in that object's table view (no reload/rebuild) and the DDL is verified in Neon
  via `mcp__Neon__run_sql`.
- Given a MEMBER/VIEWER attempting object/field creation in E2E, then they are blocked.
- Given both locales, when Settings is exercised, then it is RTL-correct in `ar`.
- Given `/block` audit on `settings/`, when run, then ≥ 85; `pnpm validate` green.

**Files to change:**

| File                                                   | Change                                             |
| ------------------------------------------------------ | -------------------------------------------------- |
| `e2e/custom-object.spec.ts`                            | Create object → sidebar + list render; DDL in Neon |
| `e2e/custom-field.spec.ts`                             | Add field → column appears instantly; role gates   |
| `src/components/platform/settings/integration.test.ts` | Object/field saga end-to-end + rollback            |

**Estimate:** 3-4 hours

---

## Summary

| Story                                       | Files         | Estimate    | Priority      |
| ------------------------------------------- | ------------- | ----------- | ------------- |
| STORY-5.1 Settings shell + nav (role-gated) | 5             | 3-4h        | P0 (blocking) |
| STORY-5.2 Create custom object              | 4             | 4-5h        | P0            |
| STORY-5.3 Add custom field                  | 3             | 4-5h        | P0            |
| STORY-5.4 Edit field + safe alter           | 4             | 3-4h        | P1            |
| STORY-5.5 Remove field / deactivate object  | 4             | 3-4h        | P1            |
| STORY-5.6 Reconcile + schema-version        | 3             | 3-4h        | P2            |
| STORY-5.7 Settings E2E                      | 3             | 3-4h        | P1            |
| **Total**                                   | **~26 files** | **~23-30h** |               |

### Implementation Order

1. STORY-5.1 first (Settings shell + role gate is the entry point).
2. STORY-5.2 → 5.3 sequentially (object before field).
3. STORY-5.4 + STORY-5.5 in parallel (edit and remove are independent of each other).
4. STORY-5.6 (reconcile) as a robustness layer.
5. STORY-5.7 last (E2E proving instant render + DDL in Neon).

**Exit:** an OWNER/ADMIN creates a custom object + field in Settings → the new object/column
appears instantly in every generic view; DDL verified in Neon; MEMBER/VIEWER gated out;
every change a transaction with saga rollback (metadata ⇄ schema never diverge).
