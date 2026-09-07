# M1 browser acceptance — 2026-09-07

**INCOMPLETE.** This record does not supersede the separate
[database-backed API acceptance](m1-db-acceptance.md). M2 has not started.

## Observed evidence

- Existing Web and API services answered HTTP 200 at the local Web root and
  health endpoint. An unauthenticated auth/me call answered 401.
- The operator completed manual Entra login. Read-only browser accessibility
  inspection then observed the Portal dashboard with Admin and Sign out.
  Source inspection confirms AuthenticatedPortal renders the shell after
  AuthApiClient.getMe succeeds. This supports session/role acceptance indirectly;
  an authenticated HTTP response was not independently captured.
- Ignored API configuration matched the previously approved Azure SQL DEV target,
  with Portal ownership confirmed and READ_ONLY/false safety controls. The
  development authentication mock was not enabled. No configuration was changed.

## Blockers and unverified cases

Computer Use could inspect the VS Code integrated browser, but clicking My
Requests failed with `coordinate input geometry is unavailable`. Re-selecting
and activating the window followed by one retry produced the same error.
Further UI input stopped. The operator then manually opened /requests. Read-only
inspection observed the My Requests form, the error "Portal request data is
unavailable. No request was submitted.", a disabled Submit request button and
an empty displayed history. That display is not proof of an empty database.

Catalog/history loading acceptance FAILS at the page level; the combined loader
does not reveal which API call failed. ADD is blocked; REMOVE/CHANGE,
SUBMITTED/PENDING states, audit count and idempotent replay remain NOT TESTED.
No new request was submitted. A separate read-only Prisma check with an exact
DEV target guard failed to connect, including outside the sandbox. The sanitized
error indicated unreachable/timeout; no firewall or login rejection was identified.
DNS resolution and a TCP 1433 probe subsequently succeeded, but a guarded Prisma
retry still failed with the same sanitized classification. The SQL/TDS-session
cause is unconfirmed. The intended synthetic seed checks could not execute. Root
and API local database/ownership configuration matched.
Azure SQL DEV was the attempted target, but successful use is NOT VERIFIED.

Repository inspection also found no Portal Request Detail page or route:
PortalApplication registers /requests only, and MyRequestsPage renders request
numbers as plain text. The client detail method and server API exist, but the
requested browser Detail acceptance cannot pass with this UI. No implementation
change was made during this acceptance attempt.

## Validation and boundaries

- npm test: PASS, 285 tests. The sandbox initially blocked child-process spawn
  with EPERM; the authorized run outside the sandbox passed.
- npm run typecheck: PASS.
- npm run build: PASS.
- npm run prisma:validate: PASS, local schema syntax only.
- npm audit --audit-level=moderate: PASS, zero vulnerabilities.

No Legacy/Production reads or writes, provisioning, revocation, automation,
migration, seed, Entra configuration change or deployment was performed.
Existing unrelated authApi.ts and authApi.test.ts edits were left untouched and
excluded from staging. Only this acceptance record belongs to this attempt.
