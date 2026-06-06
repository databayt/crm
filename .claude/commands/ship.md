---
description: Promote a checked build to production (Vercel --prod)
argument-hint: [product]
---

# Ship — Production Deploy

Promote a `/check`-passed build to **production** on Vercel. The pipeline's final commit-to-live step.

`/ship` is for production. For staging/preview, use `/deploy preview`.

## Usage

- `/ship` — deploy current branch to production
- `/ship logs` — fetch and analyze the latest production deployment's logs
- `/ship status` — show the last 5 production deployments

## Argument: $ARGUMENTS

## Instructions

### If argument is `logs`

1. `npx vercel list --prod --yes`
2. Identify the most recent failed production deployment
3. `npx vercel inspect <url> --logs` and surface the error with root cause
4. Suggest the fix; do not auto-apply

### If argument is `status`

1. `npx vercel list --prod --yes`
2. Show status of the last 5 production deployments
3. Report current alias mapping (`databayt.org`, product subdomains)

### Default (no argument): full ship loop

#### Phase 1 — Pre-flight

1. **Git state**
   - Refuse if working tree has uncommitted changes (`git status --short`) — instruct user to commit or stash first
   - Refuse if current branch is not `main` and user did not pass `--from-branch`
   - Confirm branch is up to date with `origin/main`

2. **Quality gate** (sentinel-aware)
   - Read `.claude/session-state.json`. If `check.status == PASS` and `check.at` is within the last 10 minutes, skip the inline gate.
   - Otherwise run `pnpm tsc --noEmit` + `pnpm build` inline. Write the sentinel on PASS.
   - Block on failure — production should never receive a build that does not compile locally.

#### Phase 2 — Deploy

1. `npx vercel --prod --yes` — capture the deployment URL and ID
2. Poll `npx vercel inspect <url>` every 30 seconds until status is `Ready` or `Error`

#### Phase 3 — Auto-fix loop (max 5 attempts)

If status is `Error`:

1. Fetch logs: `npx vercel inspect <url> --logs`
2. Parse the error category:
   - TypeScript → fix types, re-run
   - Missing import → add it
   - Server/client boundary → add `"use client"` or restructure
   - Env var missing → check Vercel dashboard, do not invent values
   - Prisma → ensure `prisma generate` runs in build
3. Commit the fix (`fix: deploy error — <category>`), push, retrigger deploy
4. Repeat until `Ready` or max attempts hit
5. If max attempts exhausted: surface the full error trail and stop — do not silently retry

#### Phase 4 — Hand-off

On `Ready`:

1. Print deployment URL + commit SHA
2. Print production aliases (`databayt.org`, product subdomain)
3. Suggest `/watch` next: _"Production is live. Run `/watch` to verify the customer-facing flow."_

## Exit gate

- Vercel reports `Ready` on the production deployment
- Production aliases are bound to the new deployment
- No unhandled error in the auto-fix loop
- Next step (`/watch`) surfaced to the user

## Common errors and fixes

| Error                  | Fix                                                | Retries |
| ---------------------- | -------------------------------------------------- | ------- |
| TypeScript             | Auto-fix types, imports                            | 5       |
| Server/client boundary | `"use client"` or restructure                      | 5       |
| Env var missing        | Stop — never invent prod env vars                  | 0       |
| Prisma client missing  | Ensure `prisma generate` in build script           | 3       |
| Build timeout          | Suggest splitting components; do not retry blindly | 0       |
