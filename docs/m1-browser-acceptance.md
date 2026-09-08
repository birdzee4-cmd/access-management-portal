# M1 browser acceptance — 2026-09-07

**INCOMPLETE pending live browser Detail verification.** The Portal Request Detail
route/page and Web regression coverage are implemented, but this run could not
operate Chrome: the Computer Use app approval timed out before any browser input.
Consequently it did not perform Entra sign-in, read a request, refresh, navigate
Back, or make any Portal/Legacy write. The earlier browser evidence below remains
valid for its stated scope only.
Entra sign-in, catalog loading, browser ADD submission, owned history, audit and
idempotent replay otherwise passed against Azure SQL DEV. This record does not
supersede the separate [database-backed API acceptance](m1-db-acceptance.md).
M2 has not started.

## Configuration and connectivity

- Existing Web and API services answered HTTP 200 at the local Web root and
  health endpoint. Browser auth/me returned 200 and the Portal showed Admin.
- Ignored root and API configuration were present and structurally matched the
  approved Azure SQL DEV host, port, database, SQL-password auth, encryption,
  certificate validation and Portal ownership guard. The two copies matched;
  DATABASE_URL was not changed. READ_ONLY/false controls remained unchanged and
  the development authentication mock was not enabled.
- Azure reported the DEV server Ready, public network access enabled, TLS minimum
  1.2, Entra-only authentication false, no VNet rules and no private endpoint.
  The documented scoped workstation and Azure-services firewall rules existed.
- DNS and TCP 1433 passed. Direct mssql login/handshake, database selection and
  SELECT 1 passed. Prisma SELECT 1 and Portal repository catalog, actor and owned
  list queries passed. No Azure setting was changed.

## Diagnosis and minimal fix

The original Prisma timeout/unreachable result was transient and was not
reproducible during layered diagnosis. Direct SQL and Prisma both passed without
an Azure or DATABASE_URL change. The local API was restarted to clear its prior
process/session state.

After restart, browser Network evidence separated the remaining failure from SQL:
auth/me returned 200 while catalog and requests returned 403 with the sanitized
code `portal_user_not_found`. The Portal API tenant differed from the Azure
subscription tenant used for the original seed. The same account consequently
had different Entra object IDs in those tenants, and the synthetic Portal user
held the subscription-tenant value.

With explicit approval, exactly one active synthetic user row in
access-management-portal-dev was updated to the signed-in user's object ID from
the Portal API tenant. The transaction verified the exact database and synthetic
employee/email guard, found zero conflicting rows, updated exactly one row and
verified exactly one post-update match before commit. No other user or setting
was changed.

## Browser and database evidence

- Catalog and owned history loaded after the mapping fix. My Requests displayed
  the four prior synthetic requests.
- One ADD was submitted through Chrome using the synthetic Reader role and a
  synthetic reason. The success message appeared and My Requests increased from
  four to five, with the new ADD shown first as SUBMITTED.
- Read-only DEV verification found exactly one matching request: SUBMITTED,
  version 1, exactly one PENDING item, the expected synthetic role and exactly one
  ACCESS_REQUEST_SUBMITTED audit event. The request was the newest owned item.
- The exact committed browser payload and idempotency key were replayed through
  the real HTTP handler with an ephemeral synthetic JWT. It returned HTTP 200,
  replayed=true and the same request. Request and audit counts remained exactly
  one before and after, so no duplicate was created.
- REMOVE and CHANGE were not repeated in the browser; database-backed API
  acceptance already covers those actions with synthetic DEV data.

The Detail UI now registers `/requests/:id`; My Requests links the selected
request number to it. The route validates a UUID locally, calls only the existing
authenticated `GET /api/portal/requests/{id}` client method, and leaves ownership
enforcement to the API's authenticated requester scope. It displays Portal-owned
action/status/item status, immutable role snapshots, reason and request metadata,
with Back and Refresh as its only actions. Unit/regression coverage verifies the
route, authenticated GET path, safe 401/403/404/503/generic states, and the absence
of M2+ actions. It does not replace the required live browser proof.

## Detail browser acceptance status — 2026-09-08

- Local Azure Functions started and registered `portal-request-detail` at the
  expected local route. This did not write Portal data.
- The browser automation bridge reported `Computer Use app approval timed out`
  while obtaining the existing Chrome window. No browser navigation, sign-in,
  request read, refresh or write was attempted after that result.
- ADD Detail: NOT TESTED in this run.
- REMOVE Detail: NOT TESTED in this run.
- CHANGE Detail: NOT TESTED in this run.
- Back/Refresh: NOT TESTED in this run.
- The remaining operational acceptance blocker is a user-available authenticated
  browser session or a functioning browser automation approval, not an identified
  code/API failure.

## Validation and boundaries

- npm test: PASS, 285 tests.
- npm run typecheck: PASS.
- npm run build: PASS.
- npm run prisma:validate: PASS, local schema syntax only.
- npm audit --audit-level=moderate: PASS, zero vulnerabilities.

The first test/typecheck/build attempt encountered a Windows Prisma query-engine
DLL file lock because the accepted local API was still running. After stopping
that process, all three required checks passed. This was a validation-process
lock, not an application or Azure SQL failure.

No Legacy/Production reads or writes, SharePoint, VSTS, Power Automate,
provisioning, revocation, automation, migration, seed, Entra configuration change
or deployment was performed. Existing unrelated authApi.ts and authApi.test.ts
edits remained untouched and excluded from staging.
