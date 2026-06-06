<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all
differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/`
before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# CRM

An open-source CRM — a [Twenty](https://github.com/twentyhq/twenty) clone rebuilt
on the **databayt** stack. Arabic-first, multi-tenant, metadata-driven. Companies,
people, opportunities, a Kanban pipeline, an activities timeline, saved views, and
**runtime-configurable custom objects/fields**.

## The two-plane architecture (read this first)

- **Control plane** — Prisma, the `public` schema. Identity, tenancy, auth, and the
  **metadata registry** (`ObjectMetadata` / `FieldMetadata` / `View` / `Favorite`)
  that describes every object and field. Copied near-verbatim from hogwarts with
  `schoolId` → `workspaceId`.
- **Data plane** — one Postgres schema per workspace (`ws_<workspaceId>`), raw SQL.
  The actual CRM records. Standard objects (company/person/opportunity/activity)
  **and** custom objects are real tables created/altered at runtime by the
  **metadata engine** (`src/lib/schema-manager.ts`). Tenant isolation here is
  schema-level. Every query goes through `src/lib/query-builder.ts`, which emits
  **fully-qualified** SQL (`"ws_acme"."company"`) — **never `SET search_path`**
  (unsafe under Neon's pooled connections; use `DIRECT_URL` for DDL).

Standard objects are seeded _as metadata_ and materialized the same way custom
objects are — so the table/kanban/form/detail UI is generic and metadata-driven.

## Conventions

- **Next.js 16**: `params`/`searchParams` are Promises — `await` them. Server
  Components by default. Subdomain middleware is `proxy.ts` (Node runtime), not
  `middleware.ts`. Turbopack is default; no custom webpack.
- **Routing**: locale-scoped under `src/app/[lang]/`. `/` → `/ar`. Tenant app lives
  under `app/[lang]/s/[subdomain]/(platform)/<object>`; **auth routes stay global**
  (`app/[lang]/(auth)/{login,register,join}`), NOT under a subdomain.
- **Multi-tenancy**: host `acme.localhost:3000` (dev) / `acme.crm.databayt.org` (prod)
  → `proxy.ts` sets `x-subdomain` + rewrites → `getTenantContext()` resolves
  `{ workspaceId, pgSchema, userId, role }`. Every server action resolves tenant
  context first, then scopes by `pgSchema`/`workspaceId`. Never trust a client-sent
  workspace id.
- **Feature blocks (URL mirror)**: `app/[lang]/s/[subdomain]/(platform)/<object>/page.tsx`
  mirrors `components/platform/<object>/` with the standard set — `content.tsx`
  (server fetch), `actions.ts` (`'use server'`, `ActionResponse<T>`), `validation.ts`
  (zod), `types.ts`, `columns.tsx`, `table.tsx`, `form.tsx`, `constants.ts`.
- **API**: server actions only. No REST/GraphQL. Validate with Zod on the server
  before touching the data plane; return a uniform `ActionResponse<T>`.
- **Auth**: Auth.js v5 (JWT), cross-subdomain cookies (`domain: '.crm.databayt.org'`
  in prod). Providers: Google + email/password credentials.
- **Styling**: Tailwind 4 (CSS-first, OKLCH tokens in `globals.css`, no
  `tailwind.config.js`), shadcn `radix-nova`. **Logical properties only**
  (`ms`/`me`/`ps`/`pe`, `text-start/end`, `border-s/e`, `rtl:rotate-180`) —
  `components.json` has `rtl: true`. Fonts switch by `dir`: Inter (LTR) / Tajawal (RTL).
- **i18n**: `src/components/internationalization/config.ts` is the single source
  (`locales = ['ar','en']`, default `ar`). Per-feature dictionaries in
  `src/dictionaries/<locale>/<feature>.json`, threaded Content → Table → Form.
- **Testing**: Vitest, co-located `*.test.ts` beside source (no `__tests__/`). Unit
  tests target the pure modules — the metadata engine (schema-manager, query-builder),
  tenant-context, validation, and action logic. Run `pnpm validate` before pushing.
- **Env**: central `.env` only — never `.env.local`/`.env.x`. Port **3000** only.
- **Components**: `ui/` (shadcn radix-nova) → `atom/` (2+ primitives) → `template/`
  (page layouts) → `platform/<object>/` (feature blocks). `cn()` is the sole export
  of `src/lib/utils.ts`.
