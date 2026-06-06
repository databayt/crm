# Story Breakdown: Epic-4 — Pipeline Kanban + Activities Timeline

## Status: PROPOSED

> **Phase 4** of `~/.claude/plans/here-in-crm-we-typed-hickey.md`. Covers PRD
> **FR-D1, FR-D2, FR-E1, FR-E2** and ADR-007. Two object-specific features layered
> over the generic record system: Twenty's signature **pipeline Kanban**
> (`@dnd-kit`, drag-to-move stage + position in a single transaction) and the
> **polymorphic activities timeline** (NOTE/TASK/EMAIL/CALL/MEETING) rendered in every
> record detail. Both read/write the data plane through the Epic-2 query-builder.

---

## Epic Goal

Opportunities render as a drag-to-move Kanban board (columns = stages ordered by
`position`, cards = opportunities) where dropping a card persists `stage_id` + `position`
in one transaction and reconciles on revalidate; the board is keyboard-operable and
RTL-correct. Every record (company/person/opportunity) carries an activities timeline
where users log notes, tasks, emails, calls, and meetings — tasks tracking status and due
dates — rendered reverse-chronologically with locale-formatted timestamps. A default
pipeline with stages is seeded on workspace creation.

## Dependencies

- **Upstream:** Epic-2 (query-builder, schema-manager), Epic-3 (generic record UI +
  detail with the reserved timeline slot; opportunity/stage/pipeline/activity already
  seeded as metadata and materialized).
- **External:** `@dnd-kit/core` + `@dnd-kit/sortable` (already in `package.json`).
- **Downstream:** Epic-6 (Kanban views are a saved `viewType`; dashboard reads pipeline
  value/activity feeds).

### Dependency Graph

```
STORY-4.1 (Seed default pipeline + stages on /join)
   └──> STORY-4.2 (Pipeline board render — columns from stages, cards from opps)
            └──> STORY-4.3 (Drag-to-move: moveOpportunity transaction + optimistic)
                     └──> STORY-4.4 (Kanban a11y + RTL)
STORY-4.5 (Activity actions — polymorphic create/list via builder)
   └──> STORY-4.6 (Timeline UI in record detail + composer)
            └──> STORY-4.7 (Task status/due-date + Kanban/timeline E2E)
```

---

## STORY-4.1: Seed default pipeline + stages on workspace creation

**As a** new workspace
**I want** a default pipeline with ordered stages provisioned at onboarding
**So that** the Kanban board has columns to render on day one (FR-D1)

**Acceptance Criteria:**

- Given `/join` onboarding completes, when seed runs, then a default `pipeline` row
  (`is_default=true`) and ordered `stage` rows (e.g. New → Qualified → Proposal →
  Won/Lost) exist in `"ws_<id>"."pipeline"` / `"ws_<id>"."stage"`, each with `position`,
  `color`, `is_won`/`is_lost`.
- Given the seed, when run, then it flows through the same `seed-metadata` →
  `query-builder.create` path (no bespoke pipeline backend) and is idempotent.
- Given stage colors, when seeded, then color is paired with a text label (never color-only;
  A4 accessibility).
- Given locale `ar`, when stage names render, then they use the bilingual metadata labels.

**Files to change:**

| File                                                | Change                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `prisma/seed-metadata.ts`                           | Confirm `pipeline`/`stage` field shapes (from Epic-2)                     |
| `src/components/auth/join-actions.ts`               | Seed default pipeline + stage rows via the builder in the onboarding saga |
| `src/components/platform/pipeline/seed-defaults.ts` | Default stage set (names ar/en, positions, colors, won/lost flags)        |
| `src/components/auth/join-actions.test.ts`          | Default pipeline/stages created + idempotent                              |

**Estimate:** 2-3 hours

---

## STORY-4.2: Pipeline board render — columns from stages, cards from opportunities

**As a** sales user
**I want** a Kanban board of opportunities grouped by stage
**So that** I see my deal flow at a glance (FR-D1)

**Acceptance Criteria:**

- Given `/ar/pipeline`, when loaded, then `platform/pipeline/board.tsx` renders one column
  per `stage` (ordered by `position`), each populated with that stage's opportunity cards
  (ordered by `position`), scoped to the workspace via the builder.
- Given an opportunity card, when rendered, then it shows name, amount (`Intl` currency),
  company (RELATION), and owner — reusing the opportunity field renderers.
- Given an empty stage, when rendered, then a localized empty-column placeholder shows.
- Given the board data, when fetched, then it reads through `query-builder.findMany` (not
  Prisma) — consuming metadata-shaped rows like every other view (ADR-007).

**Files to change:**

| File                                                        | Change                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `src/app/[lang]/s/[subdomain]/(platform)/pipeline/page.tsx` | RSC route → pipeline content                            |
| `src/components/platform/pipeline/content.tsx`              | RSC: load stages + opportunities via builder            |
| `src/components/platform/pipeline/board.tsx`                | `@dnd-kit` columns/cards layout (client)                |
| `src/components/platform/pipeline/card.tsx`                 | Opportunity card (port `codebase/leads/card.tsx` shape) |
| `src/dictionaries/{ar,en}/pipeline.json`                    | Board labels/empty states                               |

**Estimate:** 4-5 hours

---

## STORY-4.3: Drag-to-move — `moveOpportunity` transaction + optimistic UI

**As a** sales user
**I want** to drag an opportunity to another stage (or reorder within a stage)
**So that** I can advance deals, with the change persisted atomically (FR-D2 / M5)

**Acceptance Criteria:**

- Given a card dragged to a target stage at a drop index, when dropped, then
  `moveOpportunity({ id, toStageId, position })` updates `stage_id` + `position` for the
  moved card and reorders siblings **within a single DB transaction** through the builder.
- Given the move succeeds, when the board revalidates, then the card shows under the new
  stage at the correct order.
- Given the move is in flight, when dragging, then `useOptimistic` shows immediate movement;
  on failure the card returns to its original position with a localized error toast.
- Given a VIEWER, when they attempt a move, then the drag is disabled and the action is
  rejected by the role gate.
- Given a client-sent workspace id, when `moveOpportunity` runs, then it is ignored
  (context resolved server-side).

**Files to change:**

| File                                               | Change                                                                                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/platform/pipeline/actions.ts`      | `'use server' moveOpportunity`; `getTenantContext()` → role gate → builder transaction (update moved + reorder siblings) → `revalidatePath`; `ActionResponse<T>` |
| `src/components/platform/pipeline/board.tsx`       | dnd-kit sensors + `onDragEnd` → `moveOpportunity`; `useOptimistic` reconcile                                                                                     |
| `src/lib/query-builder.ts`                         | Add transactional multi-row update helper (reorder positions)                                                                                                    |
| `src/components/platform/pipeline/actions.test.ts` | Transaction atomicity; sibling reorder; VIEWER rejected                                                                                                          |

**Estimate:** 5-6 hours

---

## STORY-4.4: Kanban accessibility + RTL

**As an** Arabic-speaking / keyboard-only user
**I want** the board operable by keyboard and laid out right-to-left
**So that** the signature view is accessible and Arabic-first (PRD M6/M7 / A2)

**Acceptance Criteria:**

- Given keyboard-only operation, when using dnd-kit keyboard sensors, then cards can be
  picked up, moved between columns, and dropped, with focus management and ARIA live
  announcements (A2).
- Given locale `ar`, when the board renders, then columns flow RTL and directional icons
  mirror via `rtl:rotate-180`; logical CSS only.
- Given axe, when run on the board, then zero serious/critical violations (M7).
- Given stage colors, when shown, then they are paired with text (color never sole carrier;
  A4).

**Files to change:**

| File                                         | Change                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| `src/components/platform/pipeline/board.tsx` | Keyboard sensors, ARIA live region, focus management |
| `src/components/platform/pipeline/card.tsx`  | RTL-safe logical CSS; `rtl:rotate-180` affordances   |
| `e2e/pipeline-a11y.spec.ts`                  | Keyboard DnD + axe                                   |

**Estimate:** 3-4 hours

---

## STORY-4.5: Activity actions — polymorphic create/list via the builder

**As a** sales user
**I want** to log activities attached to any record type
**So that** the team has a full interaction history (FR-E1)

**Acceptance Criteria:**

- Given the `activity` object (seeded with `type SELECT`, `title`, `body`, `due_date
DATETIME`, `task_status SELECT`, and polymorphic `company_id`/`person_id`/`opportunity_id`),
  when an activity is created, then a row is inserted in `"ws_<id>"."activity"` via the
  builder, linked to the target record id.
- Given `listActivities({ targetObject, targetId })`, when called, then it returns that
  record's activities **reverse-chronologically**, scoped to the workspace.
- Given the create/list actions, when run, then they begin with `getTenantContext()`,
  validate with the Zod-from-metadata schema, role-gate (VIEWER cannot create), and return
  `ActionResponse<T>`.
- Given a VIEWER, when they attempt to add an activity, then the action is rejected.

**Files to change:**

| File                                               | Change                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/components/platform/activity/actions.ts`      | `'use server'` `createActivity`, `listActivities`, `updateTaskStatus`; builder + role gate |
| `prisma/seed-metadata.ts`                          | Confirm `activity` field set incl. polymorphic targets (from Epic-2)                       |
| `src/components/platform/activity/actions.test.ts` | Polymorphic link, reverse-chron order, VIEWER rejected                                     |

**Estimate:** 3-4 hours

---

## STORY-4.6: Timeline UI in record detail + composer

**As a** sales user
**I want** a timeline and composer in every record detail
**So that** I can review history and log activities in context (FR-E1)

**Acceptance Criteria:**

- Given a record detail, when opened, then the right-hand timeline slot (reserved in Epic-2)
  renders the record's activities reverse-chronologically with author, type icon, and
  locale-formatted timestamp.
- Given the composer, when an activity is added (type, title/body, and for tasks
  due-date/status/assignee), then it persists via `createActivity` and the timeline
  rerenders to show it at the top.
- Given locale `ar`, when the timeline renders, then it is RTL, timestamps format via `Intl`,
  and type icons mirror via `rtl:rotate-180` where directional.
- Given the timeline, when adapted, then it ports `codebase/leads/detail.tsx` timeline shape.

**Files to change:**

| File                                               | Change                                                  |
| -------------------------------------------------- | ------------------------------------------------------- |
| `src/components/platform/record/record-detail.tsx` | Fill the timeline slot with the activity timeline       |
| `src/components/platform/activity/timeline.tsx`    | Reverse-chron render (port `codebase/leads/detail.tsx`) |
| `src/components/platform/activity/composer.tsx`    | Add-activity form (type-aware: task fields)             |
| `src/dictionaries/{ar,en}/activity.json`           | Activity types/labels/toasts                            |

**Estimate:** 4-5 hours

---

## STORY-4.7: Task status / due-dates + Kanban/timeline E2E

**As a** sales user / developer
**I want** task status + due-date handling and end-to-end coverage
**So that** follow-ups don't slip and the pipeline/timeline are verified (FR-E2)

**Acceptance Criteria:**

- Given a `TASK` activity, when status changes (`TODO → IN_PROGRESS → DONE`), then it
  persists via `updateTaskStatus` and reflects in the timeline.
- Given a task with `due_date`, when rendered, then overdue tasks are visually flagged
  (logical, RTL-safe styling) and the date formats per locale.
- Given the Playwright suite, when run, then dragging an opportunity across stages updates
  `stage_id`/`position` in the DB (verified in Neon), and the timeline renders
  chronologically — both in `ar` and `en`.
- Given `/block` audit on `pipeline/` + `activity/`, when run, then ≥ 85; `pnpm validate`
  green.

**Files to change:**

| File                                            | Change                                                       |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `src/components/platform/activity/timeline.tsx` | Overdue flag; status control                                 |
| `e2e/pipeline.spec.ts`                          | Drag-to-move persists stage/position (ar/en)                 |
| `e2e/timeline.spec.ts`                          | Add note/task; reverse-chron render; task status transitions |

**Estimate:** 3-4 hours

---

## Summary

| Story                                           | Files         | Estimate    | Priority      |
| ----------------------------------------------- | ------------- | ----------- | ------------- |
| STORY-4.1 Seed default pipeline/stages          | 4             | 2-3h        | P0 (blocking) |
| STORY-4.2 Board render                          | 5             | 4-5h        | P0            |
| STORY-4.3 Drag-to-move transaction + optimistic | 4             | 5-6h        | P0            |
| STORY-4.4 Kanban a11y + RTL                     | 3             | 3-4h        | P1            |
| STORY-4.5 Activity actions (polymorphic)        | 3             | 3-4h        | P0            |
| STORY-4.6 Timeline UI + composer                | 4             | 4-5h        | P1            |
| STORY-4.7 Task status + E2E                     | 3             | 3-4h        | P1            |
| **Total**                                       | **~26 files** | **~24-31h** |               |

### Implementation Order

1. STORY-4.1 first (board needs stages to render).
2. STORY-4.2 → 4.3 → 4.4 sequentially (render → drag transaction → a11y/RTL).
3. STORY-4.5 + STORY-4.6 in parallel with the Kanban track (activities are independent of
   pipeline mechanics).
4. STORY-4.7 last (task status finalization + Kanban/timeline E2E).

**Exit:** opportunities visible as a drag-to-move Kanban (drag updates stage/position in
DB, keyboard-operable, RTL); every record carries a chronological activity timeline with a
working composer and task status/due-dates.
