---
description: Logic layer — server actions with auth, validation, tenant isolation
argument-hint: <feature> [product]
---

# Code — Logic Layer

Create server actions and business logic: auth-guarded, validated, tenant-scoped CRUD operations.

## Usage

- `/code #42` — from issue spec
- `/code billing` — from feature name
- `/code` — from most recent feature issue

## Argument: $ARGUMENTS

## Instructions

### 1. READ — Load context

Read the spec and schema stage output:

```bash
gh issue view <number> --repo <repo> --comments
```

Also read:

- The Prisma model created in the schema stage
- The Zod validation schemas from `src/components/{scope}/{name}/validation.ts`
- Existing server actions in the same product for pattern reference

### 2. ACTIONS — Create server actions

Create `src/components/{scope}/{name}/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { create{Name}Schema, update{Name}Schema } from "./validation";

// CREATE
export async function create{Name}(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData);
  const data = create{Name}Schema.parse(raw);

  await prisma.{name}.create({
    data: {
      ...data,
      // Tenant isolation — use the product's pattern
      // schoolId: session.user.schoolId,
    },
  });

  revalidatePath("/{route}");
}

// READ (list)
export async function get{Name}List() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.{name}.findMany({
    where: {
      // Tenant isolation
    },
    orderBy: { createdAt: "desc" },
  });
}

// READ (single)
export async function get{Name}(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.{name}.findUnique({
    where: { id },
  });
}

// UPDATE
export async function update{Name}(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData);
  const data = update{Name}Schema.parse(raw);

  await prisma.{name}.update({
    where: { id },
    data,
  });

  revalidatePath("/{route}");
}

// DELETE
export async function delete{Name}(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.{name}.delete({
    where: { id },
  });

  revalidatePath("/{route}");
}
```

**Adapt to the product's actual patterns:**

- Read 2-3 existing action files in the same product
- Match the auth pattern (session structure, tenant field name)
- Match the error handling pattern
- Match the revalidation pattern
- Add authorization checks if the product uses RBAC

### 3. AUTHORIZATION — Create permission rules (if needed)

If the product uses role-based access, create `src/components/{scope}/{name}/authorization.ts`:

```typescript
import { type Session } from "next-auth";

export function can{Name}(session: Session, action: "create" | "read" | "update" | "delete") {
  const role = session.user.role;

  switch (action) {
    case "read": return true; // All authenticated users
    case "create": return ["admin", "manager"].includes(role);
    case "update": return ["admin", "manager"].includes(role);
    case "delete": return role === "admin";
  }
}
```

Only create this if the product has existing authorization patterns. Skip if not.

### 4. QUERIES — Create optimized queries (if complex)

If the feature needs complex queries (joins, aggregations, search), create `src/components/{scope}/{name}/queries.ts` to separate them from actions.

Only create this if queries are complex enough to warrant separation. For simple CRUD, actions.ts is sufficient.

### 5. VERIFY — Type check

```bash
pnpm tsc --noEmit
```

**Error recovery:**

- Import path errors → fix paths → retry
- Type mismatch with Prisma → regenerate client or fix types → retry
- Auth type errors → match session type from product → retry
- Max 3 attempts

### 6. REPORT — Update the issue

```bash
gh issue comment <number> --repo <repo> --body "## Code Stage Complete

**Actions**: \`{scope}/{name}/actions.ts\` — create, list, get, update, delete
**Authorization**: \`{scope}/{name}/authorization.ts\` (if created)
**Pattern**: Matches existing \`{reference feature}\` actions
**Types**: Compiling cleanly"
```

## Error Recovery

| Error                | Fix                                        | Max Retries |
| -------------------- | ------------------------------------------ | ----------- |
| Import not found     | Fix import paths, check barrel exports     | 3           |
| Prisma type mismatch | Run `prisma generate`, fix field names     | 3           |
| Auth type error      | Read product's auth types, match interface | 3           |
| Zod parse type error | Align Zod schema with action parameters    | 3           |

## Exit Gate

- Server actions created with auth + validation + tenant isolation
- `pnpm tsc --noEmit` passes with 0 errors
- Actions follow the product's existing patterns
