---
description: Quality gate — typecheck + build + visual verify before shipping
argument-hint: [feature] [--visual <route>]
---

# Check — Quality Gate

The gate between building and shipping. Type-check, build, and visually verify before anything goes to production.

## Usage

- `/check` — full quality gate on current working directory
- `/check billing` — focused on a specific feature's files
- `/check --visual /billing` — include visual verification of a route

## Argument: $ARGUMENTS

## Instructions

### 1. TYPE CHECK — TypeScript compilation

```bash
pnpm tsc --noEmit
```

**If errors found — fix loop (max 5 attempts):**

1. Read the error output
2. Categorize errors:
   - Missing import → add the import
   - Type mismatch → fix the type annotation
   - Missing field → add the field or make optional
   - Unused variable → remove it
   - Module not found → fix path or install package
3. Apply fixes
4. Re-run `pnpm tsc --noEmit`
5. Repeat until 0 errors or max attempts

### 2. BUILD — Production build

```bash
pnpm build
```

**If build fails — fix loop (max 5 attempts):**

1. Parse the build error output
2. Categorize errors:
   - Server/client boundary violation → add "use client" or restructure
   - Missing env var → check .env, not .env.local
   - Dynamic import issue → fix import syntax
   - CSS/Tailwind error → fix class names
   - Prisma client not generated → run `pnpm prisma generate`
3. Apply fixes
4. Re-run `pnpm build`
5. Repeat until success or max attempts

### 3. VISUAL — Browser verification (if --visual flag or in pipeline)

Navigate to the feature page using browser MCP:

1. **Navigate**: `browser_navigate` to `http://localhost:3000/{route}`
   - If dev server not running, start it first: `pnpm dev`
   - Wait for page to load

2. **Screenshot**: `browser_take_screenshot`
   - Verify the page renders (not blank, not error page)
   - Check layout looks reasonable (not broken, not overlapping)

3. **Snapshot**: `browser_snapshot`
   - Check accessibility tree for the expected elements
   - Verify headings, buttons, forms are present

4. **Console**: `browser_console_messages`
   - Check for JS errors (red)
   - Ignore warnings unless they indicate real issues

If visual issues found: fix and re-verify.

### 4. TEST — Run existing tests (if they exist)

```bash
# Only if test files exist for the feature
pnpm test -- --passWithNoTests
```

Do not generate new tests in this stage. Only run existing ones.

### 5. REPORT — Summary

Output a structured report:

```
## Quality Gate Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | PASS/FAIL | 0 errors / N errors remaining |
| Build | PASS/FAIL | Compiled successfully / Error details |
| Visual | PASS/FAIL/SKIP | Renders correctly / Issues found |
| Tests | PASS/FAIL/SKIP | N passed / N failed / No tests |

**Verdict**: READY TO SHIP / BLOCKED
```

### 6. SENTINEL — Cache the pass

On verdict `READY TO SHIP`, write to the shared session sentinel at `.claude/session-state.json`:

```json
{
  "check": {
    "status": "PASS",
    "at": "<ISO timestamp>"
  }
}
```

Merge with existing keys — do not overwrite the file. `/ship` and `/release` read this and skip their inline `/check` if the timestamp is within 10 minutes.

Skip the sentinel on BLOCKED.

## Error Recovery

| Error             | Fix                                         | Max Retries |
| ----------------- | ------------------------------------------- | ----------- |
| TypeScript errors | Auto-fix types, imports                     | 5           |
| Build errors      | Auto-fix server/client boundary, imports    | 5           |
| Visual blank page | Check route exists, check component exports | 3           |
| Test failures     | Read failure, fix code                      | 3           |

If all retries exhausted on any check: report BLOCKED with the remaining errors.

## Exit Gate

- `pnpm tsc --noEmit` → 0 errors
- `pnpm build` → compiled successfully
- Visual verification → page renders (if checked)
- Verdict: READY TO SHIP
