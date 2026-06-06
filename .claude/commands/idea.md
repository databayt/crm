---
description: Capture a feature idea as a structured GitHub issue
argument-hint: <description> [product]
model: sonnet
---

# Idea — Feature Capture

Capture a feature idea as a structured GitHub issue. The entry point of the pipeline.

## Usage

- `/idea billing` — create a billing feature issue
- `/idea billing hogwarts` — scoped to hogwarts repo
- `/idea "user can filter invoices by date"` — from a user story

## Argument: $ARGUMENTS

## Instructions

### 1. PARSE — Extract intent

From `$ARGUMENTS`, determine:

- **Feature name**: the first word or quoted phrase
- **Product scope**: second word if it matches a known product (hogwarts, souq, mkan, shifa, kun)
- **Repo**: product scope maps to repo (`hogwarts` → `databayt/hogwarts`). Default: current repo.

### 2. DEDUPLICATE — Check for existing issues

```bash
gh issue list --repo <repo> --search "<feature-name>" --state open --limit 5
```

If a matching issue exists, report it and ask: "Issue #N already exists. Use that one? (Y/n)"

### 3. CONTEXT — Read the product

Read the target product's existing features to understand what's already built:

- `ls src/app/[lang]/` — existing pages
- `ls src/components/` — existing component directories
- Read `prisma/schema.prisma` or `ls prisma/models/` — existing data models

### 4. GENERATE — Create structured issue body

Write the issue body:

```markdown
## User Story

As a [role], I want to [action] so that [benefit].

## Acceptance Criteria

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

## Scope

- **Data**: [new models or fields needed]
- **Pages**: [new routes needed]
- **Components**: [new UI components needed]
- **Integrations**: [external services if any]

## Out of Scope

- [What this feature does NOT include]

## Context

- **Product**: [product name]
- **Related features**: [existing features this connects to]
```

### 5. CREATE — File the issue

```bash
gh issue create --repo <repo> \
  --title "feat: <feature-name>" \
  --label "type:feature" \
  --body "<generated body>"
```

Add product-specific labels if applicable.

### 6. REPORT — Output

Report:

- Issue URL
- Issue number (needed for subsequent pipeline stages)
- Summary of what was captured

## Exit Gate

Issue exists with structured body, acceptance criteria, and scope definition.
