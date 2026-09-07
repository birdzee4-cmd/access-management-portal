# M1 DEV database acceptance — 2026-09-07

**PASS for the database-backed M1 API acceptance scope.** M2 has not started.
The test invokes real HTTP handlers, JWT verification, services, Prisma and Azure
SQL, using ephemeral synthetic JWT signing keys. Live browser sign-in against
Entra and browser UI acceptance were not performed in this run.

## Approved target and configuration

- Subscription: Buzzebees Staging; resource group: Advisor_Security.
- Logical server: access-management-portal-dev-sql; database:
  access-management-portal-dev; Southeast Asia.
- Verified empty target before migration. The server had only DEV and master.
- TLS minimum 1.2; encrypted clients validate the server certificate.
- With explicit user approval, disabled Entra-only authentication on this server.
  Existing Entra administrator and app registrations were not changed.
- Added M1-Dev-Workstation firewall rule for one current workstation public IP.
  Existing Azure-services firewall rule was left unchanged. A changed workstation
  IP requires updating this scoped rule; no broad internet rule was added.
- Created a contained SQL runtime user, portal_m1_runtime, only in DEV. It can
  SELECT Users, Systems, Applications, Roles, AccessContexts, AccessRequests,
  AccessRequestItems and AuditLogs; INSERT only requests, items and audit logs.
  No seed, UPDATE, DELETE, approval, automation or database ALTER permissions.
- DATABASE_URL and PORTAL_DATABASE_OWNERSHIP=CONFIRMED_PORTAL_OWNED are stored only
  in ignored .env and apps/api/local.settings.json. No administrator password was
  changed, and no credential or token is included in this report or test script.

## Migration and synthetic seed

Applied database/migrations/20260907120000_m1_portal_request_engine/migration.sql
as its existing transactional SQL batch, with Entra administrative authentication.
SHA-256: `3ba77291cc589c062e8f2da643d5118ea1ce8b6eedbd1c4683fc66d0b1ff21c4`.
All 18 tables and 126 named constraints were found; checks and foreign keys are
enabled/trusted. Six negative request constraint cases were rejected in rolled-back
transactions. No prisma migrate deploy/db push or migration-history baseline was
run; do not reapply the initial SQL batch to this populated database. Future
Prisma migration adoption must reconcile the manually applied baseline first.

Seeded one synthetic Portal user with synthetic employee ID, name and
example.invalid email, mapped in DEV to the current authenticated account's object
ID. That identifier was not printed or committed. Seeded one synthetic System,
one Application and two Roles. No production catalog or person data was imported.

## Acceptance evidence

- Runtime Prisma connection verifies exact target and TLS.
- Authenticated catalog, ADD/REMOVE/CHANGE, owned list and detail passed.
- Requests persist SUBMITTED/version 1; each has one PENDING item, catalog snapshot
  and one ACCESS_REQUEST_SUBMITTED audit event.
- Same-key retry returns the existing request; changed payload returns conflict.
  Two concurrent submissions return one request and one audit.
- Injected audit failure inside a real Prisma transaction rolls back request/item.
- Missing authentication, unmapped user, missing role, actor override and cross-owner
  repository reads fail closed.
- Runtime permissions reject seed/update/delete/approval/automation/DDL authority.
- Post-test counts: 4 submitted requests, 4 pending items, 4 audit events;
  0 unexpected request states, approvals, automation jobs, legacy sources or mappings.
  Synthetic acceptance requests are retained as DEV evidence; reruns add four more.

Run after the normal build, with existing approved seed and ignored local config:

```powershell
$env:M1_DB_ACCEPTANCE = 'CONFIRMED_DEV_SYNTHETIC_WRITES'
node scripts/m1-db-acceptance.mjs
```

This command writes synthetic DEV requests. It has a fixed DEV target guard and
does not seed, migrate, change Azure settings or connect to legacy integrations.
Synthetic keys exist only in the isolated test process; runtime auth is unchanged.

## Repository checks and boundaries

Existing suite: 285 tests passed; typecheck, build and prisma:validate passed;
npm audit --audit-level=moderate reported zero vulnerabilities. Prisma validate is
syntax-only; the separate SQL evidence above establishes database readiness.

No Legacy SQL, SharePoint, VSTS or Power Automate access was performed. No
provisioning, revocation, automation or deployment was invoked. Safety flags remain
READ_ONLY/false. The only authentication setting change was the approved DEV SQL
Entra-only toggle. The two unrelated authApi files were preserved byte-for-byte
and excluded from staging. Business-policy gaps in the roadmap remain unresolved.
