---
description: Post-deploy verification — visual + console + smoke test
argument-hint: [url] [product]
---

# Watch — Post-Deploy Monitor

Verify the deployment is healthy in production. The final stage — confirm the customer can actually use it.

## Usage

- `/watch` — check the latest deployment
- `/watch https://kingfahad.databayt.org/admission` — check a specific production URL
- `/watch #42` — check the deployment for a feature issue

## Argument: $ARGUMENTS

## Instructions

### 1. IDENTIFY — What to check

Determine the target:

**If `$ARGUMENTS` is a URL**: use that URL directly.

**If `$ARGUMENTS` is `#N`**: read the issue, find the deployment URL from the latest comment.

**If no argument**: check the latest Vercel deployment:

```bash
npx vercel list --yes --limit 1
```

### 2. DEPLOYMENT STATUS — Verify Vercel

Check deployment health:

```bash
npx vercel inspect <deployment-url>
```

Verify:

- Status is "Ready" (not "Error" or "Building")
- All domains/aliases are assigned
- No build warnings that indicate runtime issues

If status is "Error": fetch logs, diagnose, report. Do NOT attempt to fix here — delegate back to `ship` stage.

If status is "Building": wait 30 seconds, re-check (max 10 minutes).

### 3. VISUAL — Screenshot production

Navigate to the production URL with browser MCP:

1. `browser_navigate` to the production URL
2. `browser_take_screenshot` — capture the live page
3. Verify:
   - Page loads (not blank, not 404, not 500)
   - Content is present and correctly rendered
   - Layout is not broken
   - No error boundaries visible

### 4. ERRORS — Check for runtime issues

1. `browser_console_messages` — check for JS errors
   - Filter for actual errors (red), ignore warnings
   - Note any failed API calls

2. `browser_network_requests` — check for failed requests
   - Look for 4xx and 5xx responses
   - Look for CORS errors
   - Look for slow responses (> 5 seconds)

### 5. SMOKE — Basic interaction test

If the feature has interactive elements:

1. Click the primary action (e.g., "Create" button)
2. Verify the form/dialog opens
3. Close without submitting
4. Verify the page returns to normal state

This is a quick smoke test, not a full flow test.

### 6. VERDICT — Pass or escalate

**If healthy:**

```
## Watch Report — HEALTHY

**URL**: <production URL>
**Status**: Ready
**Visual**: Page renders correctly
**Errors**: None
**Network**: All requests successful
**Smoke**: Interactive elements working

Feature is live and verified.
```

If this is part of the feature pipeline, close the issue:

```bash
gh issue close <number> --repo <repo> --comment "Feature verified in production.

**URL**: <production URL>
**Visual**: Confirmed
**Errors**: None
**Status**: Live and healthy"
```

**If unhealthy:**

```
## Watch Report — ISSUES FOUND

**URL**: <production URL>
**Status**: <status>
**Issues**:
- <issue 1>
- <issue 2>

**Recommended action**: <what to fix>
```

If part of the pipeline: do NOT close the issue. Label `pipeline:watch-failed`. Report to human.

## Error Recovery

This stage does not fix code. It only observes and reports. If issues are found:

- Report them clearly
- If in pipeline context, delegate fixing back to earlier stages
- If standalone, provide diagnosis for the human

## Exit Gate

- Deployment status: Ready
- Page renders correctly in production
- No console errors
- No failed network requests
- Feature issue closed (if in pipeline context)
