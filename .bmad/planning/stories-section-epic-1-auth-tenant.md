# Story Breakdown: Epic-1 — Auth + Tenant Control Plane

## Status: PROPOSED

> **Phase 1** of `~/.claude/plans/here-in-crm-we-typed-hickey.md`. Covers PRD
> **FR-A1, FR-A2, FR-A3** and ADR-001/003/005/008. Builds the control plane: the
> Prisma schema (Workspace/User/Member/Account + metadata registry), the hogwarts
> tenancy chain copied near-verbatim (`schoolId`→`workspaceId`), Auth.js v5 with
> cross-subdomain cookies, and the `/join` onboarding **saga** that provisions the
> `ws_<id>` Postgres schema. The data-plane DDL primitives (`createWorkspaceSchema`,
> `materializeObject`) land here in skeletal form and are completed in Epic-2.

---

## Epic Goal

A user can register or log in (Google + email/password) on the main domain, create a
workspace `acme` at `/join`, have its `ws_<id>` Postgres schema provisioned with the
standard-object tables materialized, and land in the platform at
`acme.localhost:3000/ar`. A second workspace `globex` cannot see `acme`'s schema —
**isolation proven** (PRD M2). Every later epic resolves tenant context through the
machinery built here.

## Dependencies

- **Upstream:** Epic-0 (scaffold, i18n shell, `[lang]` routing, `prisma/` dir, CI).
- **External:** a provisioned Neon project with `DATABASE_URL` (pooled) +
  `DIRECT_URL` (unpooled) in the central `.env`; Google OAuth client; optional Upstash
  Redis (fail-open).
- **Downstream:** Epic-2 (metadata engine) consumes `getTenantContext()`'s `pgSchema`
  and the `schema-manager` primitives; all platform epics depend on the auth/tenant gate.

### Dependency Graph

```
STORY-1.1 (Control-plane Prisma schema + first migration)
   ├──> STORY-1.2 (Tenancy chain: proxy + tenant-context + db + adapter)
   │        └──> STORY-1.3 (Auth.js v5 + cross-subdomain cookies)
   │                 └──> STORY-1.4 (Global (auth) routes: login/register)
   │                          └──> STORY-1.5 (/join onboarding saga + schema-manager stubs)
   │                                   └──> STORY-1.6 (Platform shell + dashboard landing)
   └──> STORY-1.7 (Tenant-isolation + auth unit/integration tests)
```

---

## STORY-1.1: Control-plane Prisma schema + first Neon migration

**As a** developer
**I want** the control-plane Prisma models and the first migration applied to Neon
**So that** identity, tenancy, and the object/field metadata registry exist in `public`

**Acceptance Criteria:**

- Given `prisma/schema.prisma`, when inspected, then `datasource` declares both
  `url = env("DATABASE_URL")` (pooled) and `directUrl = env("DIRECT_URL")` (unpooled),
  and models are modular under `prisma/models/`.
- Given `prisma migrate dev`, when run against a Neon branch, then `workspaces`, `users`,
  `members`, `accounts`, `verification_tokens`, `password_reset_tokens`,
  `object_metadata`, `field_metadata`, `views`, `favorites` tables are created in `public`.
- Given `Workspace`, when inspected, then it has `subdomain @unique`, `customDomain?
@unique`, `pgSchema @unique`, `defaultLocale @default("ar")`, `defaultCurrency`.
- Given `Member`, when inspected, then it has `@@unique([userId, workspaceId])`,
  `@@index([workspaceId])`, and `role MemberRole @default(MEMBER)`
  (`OWNER/ADMIN/MEMBER/VIEWER`).
- Given `ObjectMetadata`/`FieldMetadata`, when inspected, then they match the
  architecture §3.3 bodies (`@@unique([workspaceId, nameSingular])`,
  `@@unique([objectId, name])`, `type` string enum, `options Json?`).
- Given `pnpm prisma generate` then `pnpm typecheck`, when run, then zero errors.

**Files to change:**

| File                             | Change                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`           | `generator` + `datasource` (pooled `url` + unpooled `directUrl`); modular includes                       |
| `prisma/models/workspace.prisma` | `Workspace` (subdomain, customDomain, pgSchema, defaultLocale='ar')                                      |
| `prisma/models/auth.prisma`      | `GlobalRole`, `MemberRole` enums; `User`, `Member`, `Account`, `VerificationToken`, `PasswordResetToken` |
| `prisma/models/metadata.prisma`  | `ObjectMetadata`, `FieldMetadata`, `View`, `Favorite` (the registry)                                     |
| `prisma/migrations/*`            | First migration (committed; not `.vercelignore`d)                                                        |

**Neon safety:** create a Neon branch first; rehearse the migration there before the
primary branch. **Estimate:** 3-4 hours

---

## STORY-1.2: Tenancy chain — proxy + tenant-context + db guard + adapter

**As a** workspace member
**I want** my subdomain resolved to a workspace and Postgres schema on every request
**So that** all data access is scoped to my tenant (FR-A3)

**Acceptance Criteria:**

- Given a request to `acme.localhost:3000/ar/companies`, when `src/proxy.ts` runs (Node
  runtime), then it extracts `acme`, sets `x-subdomain: acme`, and rewrites to
  `/[lang]/s/acme/companies`.
- Given the main domain (`localhost:3000`), when requested, then it serves marketing +
  global auth, **not** a tenant rewrite.
- Given `getTenantContext()`, when called, then it resolves in priority order
  `impersonate_workspaceId` cookie → `x-subdomain` header → `session.user.workspaceId`
  (JWT), with a Redis 5min → in-memory 1min → DB cache behind a circuit breaker.
- Given resolution succeeds, when returned, then it yields
  `{ workspaceId, pgSchema, userId, role, isPlatformAdmin }` where `pgSchema = "ws_<id>"`.
- Given a bulk Prisma op omitting `workspaceId` in dev, when run, then the
  `TENANT_SCOPED_MODELS` `$extends` guard logs an error (zero prod overhead).

**Files to change:**

| File                                     | Change                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/proxy.ts`                           | Copy hogwarts `proxy.ts`; rename school→workspace; set `x-subdomain`, rewrite to `/[lang]/s/[subdomain]/...` |
| `src/lib/tenant-context.ts`              | Copy hogwarts; add `pgSchema` to the return; rename to `workspaceId`                                         |
| `src/lib/db.ts`                          | Copy hogwarts; `TENANT_SCOPED_MODELS` for control-plane models; `$extends` dev guard                         |
| `src/lib/circuit-breaker.ts`             | Copy hogwarts verbatim                                                                                       |
| `src/lib/multi-tenant-prisma-adapter.ts` | Copy hogwarts; rename school→workspace                                                                       |

**Estimate:** 3-4 hours

---

## STORY-1.3: Auth.js v5 + cross-subdomain cookies

**As a** user
**I want** to sign in once and stay signed in across workspace subdomains
**So that** I move from the main domain to `acme.localhost:3000` without re-auth (FR-A1)

**Acceptance Criteria:**

- Given Auth.js v5 config, when inspected, then it uses the **JWT** session strategy and
  the multi-tenant Prisma adapter, with providers **Google OAuth + Credentials
  (email/password)**.
- Given any Auth.js cookie, when set, then `domain: '.crm.databayt.org'` in prod /
  `undefined` in dev, `sameSite: 'lax'`, `httpOnly: true`.
- Given a successful sign-in, when the JWT is issued, then `token.workspaceId` is
  populated and a lightweight non-`httpOnly` `authjs.role` cookie is synced for Edge.
- Given `trigger === 'update'` (after `/join`), when the JWT callback runs, then the
  session is force-refreshed to pick up the new `workspaceId`.
- Given credentials sign-in, when the password is checked, then it is verified against a
  bcrypt hash; invalid credentials yield a localized error toast and no session.

**Files to change:**

| File                     | Change                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/auth.ts`        | Copy hogwarts auth core; cross-subdomain cookies (`.crm.databayt.org`); JWT `workspaceId`; `trigger==='update'` refresh; `authjs.role` sync |
| `src/lib/auth.config.ts` | Providers: Google + Credentials (bcrypt)                                                                                                    |
| `.env` / `.env.example`  | `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, cookie domain knobs                                                                                 |

**Estimate:** 3-4 hours

---

## STORY-1.4: Global (auth) routes — login / register

**As a** new sales user
**I want** localized login and register screens on the main domain
**So that** I can authenticate before I have a workspace (FR-A1)

**Acceptance Criteria:**

- Given the routes, when inspected, then they live at `app/[lang]/(auth)/{login,register}`
  — **global, never under `s/[subdomain]/`**.
- Given `/ar/login`, when locale is `ar`, then the layout is RTL and copy comes from
  `dictionaries/ar/auth.json`.
- Given "Continue with Google", when OAuth completes, then an `Account` is linked, a
  session is issued, and the user is redirected to `/join` (no `Member`) or their
  workspace (existing `Member`).
- Given `/ar/register`, when a valid email + password is submitted (Zod-validated), then
  a `User` is created with a hashed password.
- Given invalid input, when submitted, then field-level localized errors render and no
  session/user is created.

**Files to change:**

| File                                      | Change                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `src/app/[lang]/(auth)/layout.tsx`        | Auth shell; RTL-correct, dictionary-threaded                           |
| `src/app/[lang]/(auth)/login/page.tsx`    | Login page (RSC)                                                       |
| `src/app/[lang]/(auth)/register/page.tsx` | Register page (RSC)                                                    |
| `src/components/auth/login-form.tsx`      | Copy + adapt `codebase/src/components/auth/`; RHF + Zod, Google button |
| `src/components/auth/register-form.tsx`   | RHF + Zod register                                                     |
| `src/components/auth/actions.ts`          | `'use server'` register (bcrypt), `ActionResponse<T>`                  |
| `src/dictionaries/{ar,en}/auth.json`      | `common`/`validation`/`toast` auth keys                                |

**Estimate:** 3-4 hours

---

## STORY-1.5: `/join` onboarding saga + schema-manager stubs

**As an** authenticated user without a workspace
**I want** to create a workspace and have its isolated schema provisioned
**So that** I get a CRM with standard objects ready to use (FR-A2)

**Acceptance Criteria:**

- Given `/ar/join`, when a workspace name + unique subdomain (Zod: lowercase, DNS-safe,
  uniqueness checked vs `Workspace.subdomain`) is submitted, then a `Workspace`
  (`defaultLocale='ar'`, `pgSchema='ws_<id>'`) and an owner `Member` (`OWNER`) are
  created in the control plane.
- Given the `Workspace` is committed, when onboarding continues, then
  `schemaManager.createWorkspaceSchema(workspaceId)` runs `CREATE SCHEMA IF NOT EXISTS
"ws_<id>"` over `DIRECT_URL`, and the standard objects are seeded as metadata +
  materialized (full materialization completed in Epic-2; Epic-1 lands the schema +
  `pipeline`/`stage` + `company` skeleton).
- Given provisioning fails midway, when the error surfaces, then the DDL transaction
  rolls back **and** the `Workspace`/`Member` writes are reverted (saga) — no
  half-provisioned workspace remains; a localized error is returned (FR-A2 / ADR-008 / S4).
- Given a chosen subdomain already exists, when submitted, then a localized "subdomain
  taken" error renders and nothing is provisioned.
- Given a successful `/join`, when the JWT refreshes (`trigger==='update'`), then the
  user is redirected to `acme.localhost:3000/ar` (platform).

**Files to change:**

| File                                       | Change                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/app/[lang]/(auth)/join/page.tsx`      | Onboarding page (RSC)                                                                                                       |
| `src/components/auth/join-form.tsx`        | RHF + Zod (name, subdomain), live uniqueness hint                                                                           |
| `src/components/auth/join-actions.ts`      | `'use server'` saga: create Workspace+Member → `createWorkspaceSchema` → seed+materialize → JWT refresh; revert on failure  |
| `src/lib/schema-manager.ts`                | Stub `createWorkspaceSchema`, `dropWorkspaceSchema`, `materializeObject` over `DIRECT_URL` (`pg` Pool) — full DDL in Epic-2 |
| `prisma/seed-metadata.ts`                  | Seed `ObjectMetadata`/`FieldMetadata` for standard objects (skeleton; full set in Epic-2)                                   |
| `src/dictionaries/{ar,en}/onboarding.json` | Join copy + errors                                                                                                          |

**Estimate:** 4-6 hours

---

## STORY-1.6: Platform shell + dashboard landing

**As a** workspace member
**I want** a tenant-scoped platform shell with a sidebar and a landing dashboard
**So that** I land somewhere usable immediately after onboarding (FR-A3)

**Acceptance Criteria:**

- Given the route group, when inspected, then it lives at
  `app/[lang]/s/[subdomain]/(platform)/` with a `layout.tsx` (sidebar + topbar) and a
  `page.tsx` (dashboard landing).
- Given `acme.localhost:3000/ar`, when loaded post-onboarding, then
  `getTenantContext()` resolves `acme` and the shell renders with RTL layout, the
  workspace name, and a localized empty dashboard.
- Given locale `ar`, when the shell renders, then directional affordances mirror via
  `rtl:rotate-180` and logical CSS only (`ms/me/ps/pe`, `text-start/end`).
- Given an unauthenticated request to a platform route, when made, then it redirects to
  `/ar/login`.

**Files to change:**

| File                                                 | Change                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `src/app/[lang]/s/[subdomain]/(platform)/layout.tsx` | Platform shell; `getTenantContext()`; redirect if unauth            |
| `src/app/[lang]/s/[subdomain]/(platform)/page.tsx`   | Dashboard landing (zero-state)                                      |
| `src/components/platform/shell/sidebar.tsx`          | Adapt `hogwarts/src/components/saas-dashboard/`; RTL-safe           |
| `src/components/platform/shell/topbar.tsx`           | Workspace name, `UserButton` (copy `codebase/src/components/auth/`) |
| `src/dictionaries/{ar,en}/platform.json`             | Shell/nav/dashboard keys                                            |

**Estimate:** 3-4 hours

---

## STORY-1.7: Tenant-isolation + auth tests

**As a** developer
**I want** unit + integration tests for tenant resolution, the onboarding saga, and auth
**So that** isolation is a verified invariant before any record data exists (PRD M2)

**Acceptance Criteria:**

- Given `tenant-context.test.ts`, when run, then resolution priority (impersonate →
  header → JWT), cache tiers, circuit-breaker fail-open, and `pgSchema` derivation pass.
- Given the onboarding integration test, when `/join` runs, then `Workspace` + `Member`
  are written, `ws_<id>` exists in Neon, and a simulated DDL failure rolls back cleanly
  (no orphan schema or metadata).
- Given a two-workspace test (`acme`, `globex`), when `globex` resolves context, then it
  cannot see `acme`'s `pgSchema` — confirmed in Neon via `mcp__Neon__run_sql`.
- Given auth action tests, when run, then `ActionResponse<T>` shape holds and credentials
  verify against bcrypt hashes.
- Given `pnpm validate`, when run, then green.

**Files to change:**

| File                                       | Change                                             |
| ------------------------------------------ | -------------------------------------------------- |
| `src/lib/tenant-context.test.ts`           | Resolution priority, cache, breaker, `pgSchema`    |
| `src/components/auth/join-actions.test.ts` | Onboarding saga + rollback                         |
| `src/components/auth/actions.test.ts`      | Register/credentials, `ActionResponse`             |
| `src/lib/schema-manager.test.ts`           | `createWorkspaceSchema` quoting / `ws_<id>` naming |

**Estimate:** 2-3 hours

---

## Summary

| Story                                       | Files         | Estimate    | Priority      |
| ------------------------------------------- | ------------- | ----------- | ------------- |
| STORY-1.1 Control-plane schema + migration  | 5             | 3-4h        | P0 (blocking) |
| STORY-1.2 Tenancy chain                     | 5             | 3-4h        | P0 (blocking) |
| STORY-1.3 Auth.js + cookies                 | 3             | 3-4h        | P0            |
| STORY-1.4 (auth) login/register             | 7             | 3-4h        | P0            |
| STORY-1.5 /join saga + schema-manager stubs | 6             | 4-6h        | P0            |
| STORY-1.6 Platform shell                    | 5             | 3-4h        | P1            |
| STORY-1.7 Isolation + auth tests            | 4             | 2-3h        | P0            |
| **Total**                                   | **~35 files** | **~21-29h** |               |

### Implementation Order

1. STORY-1.1 first (everything depends on the schema).
2. STORY-1.2 next (tenancy chain) — STORY-1.7 isolation tests can start against it.
3. STORY-1.3 → 1.4 → 1.5 sequentially (auth → routes → onboarding saga).
4. STORY-1.6 after 1.5 (shell needs a provisioned workspace to land in).
5. STORY-1.7 throughout, finalized last.

**Exit:** register → `/join` creates `acme` → `ws_<id>` schema exists in Neon → land in
platform on `acme.localhost:3000/ar`; `globex` cannot see `acme`'s schema (M2).
