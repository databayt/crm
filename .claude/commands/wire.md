---
description: UI layer — page (mirror pattern), content, form, table columns, i18n
argument-hint: <feature> [product]
---

# Wire — UI Layer

Wire everything together: pages, content components, forms, tables, and i18n. The layer users actually see.

## Usage

- `/wire #42` — from issue spec
- `/wire billing` — from feature name
- `/wire` — from most recent feature issue

## Argument: $ARGUMENTS

## Instructions

### 1. READ — Load context

Read the spec, schema output, and code output from the issue:

```bash
gh issue view <number> --repo <repo> --comments
```

Also read:

- The server actions from `src/components/{scope}/{name}/actions.ts`
- The Zod schemas from `src/components/{scope}/{name}/validation.ts`
- An existing similar feature's UI files for pattern reference (e.g., content.tsx, form.tsx, columns.tsx)

### 2. PAGE — Create the route page

Create `src/app/[lang]/{route-group}/{name}/page.tsx`:

```typescript
import { Content } from "@/components/{scope}/{name}/content";

export default function {Name}Page() {
  return <Content />;
}
```

The page is a thin wrapper — all logic lives in the content component (mirror pattern).

Match the product's existing page patterns:

- Route group structure (e.g., `(school-dashboard)`, `(saas-marketing)`)
- Metadata exports if used
- Layout inheritance

### 3. CONTENT — Create the server component

Create `src/components/{scope}/{name}/content.tsx`:

```typescript
import { get{Name}List } from "./actions";
import { columns } from "./columns";
import { DataTable } from "@/components/atom/data-table";
import { {Name}Form } from "./form";

export async function Content() {
  const data = await get{Name}List();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>{/* Use dictionary key */}</h1>
        <{Name}Form />
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
```

Adapt to what the spec requires:

- List view → DataTable + columns
- Detail view → single record display
- Dashboard → stats + charts
- Use existing atoms and templates from the product

### 4. FORM — Create the client form

Create `src/components/{scope}/{name}/form.tsx`:

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { create{Name}Schema, type Create{Name}Input } from "./validation";
import { create{Name} } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";

export function {Name}Form() {
  const form = useForm<Create{Name}Input>({
    resolver: zodResolver(create{Name}Schema),
  });

  async function onSubmit(data: Create{Name}Input) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    await create{Name}(formData);
    form.reset();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{/* Use dictionary key */}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{/* Use dictionary key */}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* FormField for each field in the schema */}
            <Button type="submit">{/* Use dictionary key */}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

Use shadcn/ui form components. Match the product's existing form patterns.

### 5. COLUMNS — Create table columns (if list view)

Create `src/components/{scope}/{name}/columns.tsx`:

```typescript
"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type {Name} } from "@prisma/client";

export const columns: ColumnDef<{Name}>[] = [
  // Column for each visible field
  // Actions column (edit, delete) at the end
];
```

Only create if the feature has a list view.

### 6. I18N — Add dictionary keys

Add keys to both dictionaries:

**`src/dictionaries/en.json`** (or wherever the product keeps dictionaries):

```json
{
  "{name}": {
    "title": "{Name}",
    "create": "Create {Name}",
    "edit": "Edit {Name}",
    "delete": "Delete {Name}",
    "empty": "No {name} found"
  }
}
```

**`src/dictionaries/ar.json`**:

```json
{
  "{name}": {
    "title": "{Arabic translation}",
    "create": "{Arabic}",
    "edit": "{Arabic}",
    "delete": "{Arabic}",
    "empty": "{Arabic}"
  }
}
```

### 7. NAVIGATION — Add nav entry (if needed)

If the feature needs a navigation entry (sidebar, menu), find the product's navigation config and add an entry. Only if the spec calls for it.

### 8. BUILD — Verify everything compiles

```bash
pnpm build
```

**Error recovery loop (max 5 attempts):**

1. Parse build error output
2. Common fixes:
   - Missing import → add import
   - Type mismatch → fix prop types
   - Missing dictionary key → add key
   - Component not found → check path
   - Client/server boundary → add "use client" or restructure
3. Re-run `pnpm build`

### 9. REPORT — Update the issue

```bash
gh issue comment <number> --repo <repo> --body "## Wire Stage Complete

**Page**: \`src/app/[lang]/{route}/{name}/page.tsx\`
**Content**: \`src/components/{scope}/{name}/content.tsx\`
**Form**: \`src/components/{scope}/{name}/form.tsx\`
**Columns**: \`src/components/{scope}/{name}/columns.tsx\` (if created)
**I18n**: Dictionary keys added (en + ar)
**Build**: Passing"
```

## Error Recovery

| Error                  | Fix                                        | Max Retries |
| ---------------------- | ------------------------------------------ | ----------- |
| Build failure          | Parse error, apply targeted fix            | 5           |
| Missing component      | Check import path, verify component exists | 3           |
| Type mismatch in props | Align with action return types             | 3           |
| i18n key not found     | Add missing dictionary key                 | 2           |
| Server/client boundary | Move "use client" or restructure component | 3           |

## Exit Gate

- `pnpm build` passes
- Page exists at the correct route
- Form, content, and table (if applicable) components created
- Dictionary keys added for both languages
