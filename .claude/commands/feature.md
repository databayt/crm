---
description: Full pipeline — idea to production (chains every stage)
argument-hint: <name> [product] [--from <stage>]
---

# Feature Pipeline — Idea to Production

The compound orchestrator. Chains all pipeline stages to take a feature from idea to customer's hands.

## Usage

- `/feature billing` — full pipeline for "billing" feature
- `/feature billing hogwarts` — scoped to hogwarts product
- `/feature #42` — resume pipeline from existing issue
- `/feature billing --from schema` — enter pipeline at a specific stage

## Argument: $ARGUMENTS

## Instructions

Parse arguments:

- First word = feature name (or `#N` for existing issue)
- Second word = product scope (hogwarts, souq, mkan, shifa) — optional
- `--from <stage>` = skip to a specific stage (idea, spec, plan, tasks, schema, code, wire, check, ship, watch)

### Pipeline

Execute stages in order. Each stage appends progress to the GitHub issue. Stop on failure after max retries.

```
IDEA → SPEC → [human approval] → PLAN → TASKS → SCHEMA → CODE → WIRE → CHECK → SHIP → WATCH
```

PLAN and TASKS are **optional** — they add architecture rigor for non-trivial features, but a typo fix or single-field change should skip straight to SCHEMA (or be a `/report`, not a `/feature`). For a small change, note "trivial — skipping plan/tasks" on the issue and continue.

### Stage 1: IDEA — Capture

If `$ARGUMENTS` is `#N`, read that issue and skip to Stage 2.

Otherwise, check if an issue already exists:

```bash
gh issue list --repo <repo> --search "<feature-name> type:feature" --state open
```

If no issue exists, execute the `idea` workflow:

1. Create structured GitHub issue with feature name, user story, acceptance criteria
2. Label with `type:feature` and product scope
3. Capture the issue number for subsequent stages

### Stage 2: SPEC — Specify

Check if the issue already has a spec comment (look for `## Technical Spec` in comments).

If no spec exists, execute the `spec` workflow:

1. Read the target product's schema, page structure, and CLAUDE.md
2. Generate: data model sketch, file plan, acceptance criteria
3. Append spec as comment on the issue

**PAUSE**: Ask the human — "Spec ready. Proceed with implementation? (Y/n)"

If denied, stop. The issue has the spec for later.

### Stage 2.5: PLAN — Architecture (optional)

For non-trivial features, execute the `plan` workflow (`.claude/commands/plan.md`):

1. Read the approved spec from the issue
2. Delegate architecture judgment to `tech-lead` + `architecture`
3. Append an `## Implementation Plan` comment (pattern choices, decisions, mirror target, tradeoffs, risks)

Skip for trivial changes — note "trivial — skipping plan" on the issue.

### Stage 2.6: TASKS — Breakdown (optional)

For non-trivial features, execute the `tasks` workflow (`.claude/commands/tasks.md`):

1. Read the plan from the issue
2. Decompose into dependency-ordered tasks mapped to stages
3. Append a `## Task Breakdown` checklist comment

Skip for trivial changes — note "trivial — skipping tasks" on the issue.

### Stage 3: SCHEMA — Data Layer

Execute the `schema` workflow:

1. Read spec from issue comments
2. Create Prisma model + migration
3. Create Zod validation schemas
4. Verify: `pnpm tsc --noEmit`

Append to issue: "Schema stage complete. Models: [list]. Migration: [name]."

### Stage 4: CODE — Logic Layer

Execute the `code` workflow:

1. Read schema and types from Stage 3
2. Create server actions with auth + validation + tenant isolation
3. Create authorization rules
4. Verify: `pnpm tsc --noEmit`

Append to issue: "Code stage complete. Actions: [list]."

### Stage 5: WIRE — UI Layer

Execute the `wire` workflow:

1. Read actions and types from Stage 4
2. Create page (mirror pattern), content component, form, table columns
3. Add i18n dictionary keys (en + ar)
4. Verify: `pnpm build`

Append to issue: "Wire stage complete. Pages: [list]. Components: [list]."

### Stage 6: CHECK — Quality Gate

Execute the `check` workflow:

1. `pnpm tsc --noEmit` (fix loop, max 5)
2. `pnpm build` (fix loop, max 5)
3. Navigate to the new page with browser MCP, screenshot, verify it renders
4. Run tests if they exist

Append to issue: "Check stage complete. Build: pass. Visual: verified."

### Stage 7: SHIP — Deploy

1. Stage and commit all new files:

   ```bash
   git add <all files created in stages 3-5>
   git commit -m "feat: add <feature-name>

   Closes #<issue-number>

   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
   ```

2. Push to main
3. Deploy to Vercel: `npx vercel --prod --yes`
4. Poll deployment status until Ready (max 10 minutes)
5. If deployment fails: read logs, fix, re-deploy (max 3 attempts)

Append to issue: "Ship stage complete. Deployment: [URL]."

### Stage 8: WATCH — Monitor

1. Wait 60 seconds for deployment to stabilize
2. Navigate to the feature page in production with browser MCP
3. Screenshot and verify the page renders correctly
4. Check console for JS errors, network for failed requests
5. If errors found: diagnose, fix, re-deploy (delegate back to Stage 7)
6. If clean: close the issue with a summary comment

Close issue:

```bash
gh issue close <number> --repo <repo> --comment "Feature shipped.

**Stages completed**: idea → spec → schema → code → wire → check → ship → watch
**Files created**: <list>
**Deployment**: <production URL>
**Verified**: <screenshot confirmation>"
```

### Error Recovery

If any stage fails after max retries:

1. Append failure report to the issue
2. Label the issue with `pipeline:blocked` and the failing stage name
3. Report to the human: which stage failed, what the error was, what was tried
4. Do NOT continue to subsequent stages

### Product Context

When a product is specified, read that product's context:

- `hogwarts` → read `/Users/abdout/hogwarts/CLAUDE.md`, use hogwarts agent patterns (multi-tenant, subdomain routing)
- `souq` → read `/Users/abdout/souq/CLAUDE.md`, use souq agent patterns (multi-vendor marketplace)
- `mkan` → read `/Users/abdout/mkan/CLAUDE.md`, use mkan agent patterns (rental marketplace)
- `shifa` → read `/Users/abdout/shifa/CLAUDE.md`, use shifa agent patterns (medical platform)

### Exit Gate

Feature is live in production, verified visually, issue closed with summary.
