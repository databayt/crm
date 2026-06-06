---
description: Look up a canonical cross-repo pattern (form, table, auth, ...)
argument-hint: <name> [product]
---

# Pattern — Cross-Repo Pattern Reference

Show canonical patterns for reusable code across all databayt repositories.

## Usage

- `/pattern` — list all patterns with status
- `/pattern form` — show the form pattern card
- `/pattern form --status` — show per-repo adoption
- `/pattern form --diff` — show gap between current repo and canonical

## Argument: $ARGUMENTS

## Instructions

### Parse arguments

Extract `keyword` and optional flags from `$ARGUMENTS`:

- No args → show index
- Single word (e.g., `form`) → show that pattern card
- Word + `--status` → show adoption status
- Word + `--diff` → show gap analysis for current repo

### No args — Pattern Index

Read `.claude/patterns/registry.json`. Show a summary table:

```
Cross-Repo Pattern Registry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Keyword     Canonical   Maturity     Description
form        hogwarts    production   14 field atoms + wizard factory + bridges
table       hogwarts    production   DataTable + 14 sub-components + URL sync
modal       hogwarts    production   CRUD modal + route modal + multi-step
auth        hogwarts    production   Login, join, reset, 2FA, OAuth, role-gate
action      hogwarts    production   createFormAction factory + ActionResponse
validation  hogwarts    production   Zod schema factories with i18n
columns     hogwarts    production   getColumns() factory with dictionary labels
wizard      hogwarts    production   createWizardProvider URL-routed steps
sidebar     hogwarts    production   Config-driven nav with role visibility
header      codebase    production   Composable header with 10 sub-components

Use: /pattern <keyword> for full details
```

### Keyword arg — Show Card

Read `.claude/patterns/cards/{keyword}.md` and display the full card content.

If the keyword is not found in the registry, suggest the closest match.

### --status — Adoption Status

Read the registry entry for the keyword. For each repo, show:

- Whether the canonical pattern files exist
- Current pattern name vs canonical
- Maturity level
- File count gap

### --diff — Gap Analysis

Compare current repo's implementation against the canonical:

1. Read registry to find canonical path and repo
2. Check if current repo has the keyword's pattern
3. List: missing files, divergent patterns, extra dependencies
4. Suggest migration steps from the pattern card

### After showing any pattern

Remind the user:

- `/clone pattern:{keyword}` to clone the canonical pattern
- The pattern card location for reference
