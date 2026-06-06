# CRM

An open-source CRM — a [Twenty](https://github.com/twentyhq/twenty) clone built
on the **databayt** architecture: Next.js 16 · React 19 · Prisma 6 · TypeScript 5
· Tailwind CSS 4 · shadcn/ui.

## What makes it different

- **Arabic-first** — RTL by default, English (LTR) supported, locale-scoped routes.
- **Multi-tenant** — subdomain-per-workspace (`acme.crm.databayt.org`), the
  hogwarts pattern (subdomain proxy → tenant context → schema isolation).
- **Metadata-driven** — standard _and_ custom objects/fields are real Postgres
  tables materialized at runtime by a metadata engine, so the table/kanban/form
  UI is generic. Custom objects are first-class, not bolted on.
- **Atomic, URL-mirror blocks** — `app/[lang]/s/[subdomain]/(platform)/<object>`
  mirrors `components/platform/<object>`, reusing databayt forms/tables/auth.

## Architecture — two planes

| Plane       | Where                                                  | What                                                                       |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Control** | Prisma, `public` schema                                | identity, tenancy, auth, and the object/field **metadata registry**        |
| **Data**    | one Postgres schema per workspace (`ws_<id>`), raw SQL | the actual CRM records — created/altered at runtime by the metadata engine |

See `/Users/abdout/.claude/plans/here-in-crm-we-typed-hickey.md` for the full plan
and `.bmad/planning/` for the BMAD brief / PRD / architecture / epics.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3000  (redirects → /ar)
pnpm validate     # typecheck + lint + test + build
```

Port is always **3000**. The central `.env` is the only env file.
