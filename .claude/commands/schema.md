---
description: Data layer — Prisma model, migration, and Zod validation
argument-hint: <model> [product]
---

# Schema — Data Layer

Create the data foundation: Prisma model, migration, Zod validation, TypeScript types.

## Usage

- `/schema #42` — from issue spec
- `/schema billing` — from feature name
- `/schema` — from most recent feature issue

## Argument: $ARGUMENTS

## Instructions

### 1. READ — Load the spec

Find the feature issue and read the spec comment:

```bash
gh issue view <number> --repo <repo> --comments
```

Extract the data model sketch and file plan from the `## Technical Spec` comment.

If no spec exists, stop: "No spec found. Run `/spec` first."

### 2. MODEL — Create Prisma schema

Based on the spec's data model sketch:

1. Create the model in the appropriate location:
   - If `prisma/models/` directory exists → create `prisma/models/{name}.prisma`
   - Otherwise → add to `prisma/schema.prisma`

2. Follow existing patterns in the schema:
   - Same ID strategy (cuid, uuid, autoincrement)
   - Same timestamp pattern (createdAt/updatedAt)
   - Same tenant isolation pattern (schoolId, vendorId, etc.)
   - Same relation naming conventions
   - Same index patterns

3. Add relations to existing models where needed

### 3. MIGRATE — Apply the migration

```bash
pnpm prisma migrate dev --name add-{feature-name}
```

**Error recovery:**

- If migration fails due to schema error → read error → fix model → retry
- If migration fails due to data conflict → read error → adjust model → retry
- Max 3 attempts. If still failing, report the error and stop.

Then generate the client:

```bash
pnpm prisma generate
```

### 4. VALIDATE — Create Zod schemas

Create `src/components/{scope}/{name}/validation.ts`:

```typescript
import { z } from "zod";

// Create schema — fields for creating a new record
export const create{Name}Schema = z.object({
  // ... fields from Prisma model (exclude id, timestamps, relations)
  // Use .min(), .max(), .email(), .url() etc. as appropriate
});

// Update schema — partial version for edits
export const update{Name}Schema = create{Name}Schema.partial();

// Filter schema — for list view filtering (if applicable)
export const filter{Name}Schema = z.object({
  // ... filterable fields
});

// Type exports
export type Create{Name}Input = z.infer<typeof create{Name}Schema>;
export type Update{Name}Input = z.infer<typeof update{Name}Schema>;
```

Follow the validation patterns used by existing features in the same product.

### 5. VERIFY — Type check

```bash
pnpm tsc --noEmit
```

**Error recovery:**

- If type errors → read errors → fix imports/types → retry
- Max 3 attempts

### 6. REPORT — Update the issue

```bash
gh issue comment <number> --repo <repo> --body "## Schema Stage Complete

**Model**: \`{ModelName}\` created in \`{file path}\`
**Migration**: \`add-{feature-name}\` applied
**Validation**: \`{scope}/{name}/validation.ts\` created
**Types**: Compiling cleanly

Files created:
- \`prisma/models/{name}.prisma\` (or location in schema.prisma)
- \`src/components/{scope}/{name}/validation.ts\`"
```

## Error Recovery

| Error                   | Fix                                       | Max Retries |
| ----------------------- | ----------------------------------------- | ----------- |
| Migration syntax error  | Read Prisma error, fix model definition   | 3           |
| Relation conflict       | Check existing models, fix relation names | 3           |
| Type compilation error  | Fix imports, adjust types                 | 3           |
| Prisma generate failure | Check schema validity, fix                | 3           |

If all retries exhausted: stop, report error on issue, label `pipeline:blocked`.

## Exit Gate

- Migration applied successfully
- `pnpm prisma generate` succeeds
- Zod validation schemas created
- `pnpm tsc --noEmit` passes with 0 errors
