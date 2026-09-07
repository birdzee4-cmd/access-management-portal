# Project state

M1 implementation snapshot, 2026-09-07; based on repository docs and source
without production refresh. Read [safety](production-safety-boundary.md)
and [roadmap](roadmap.md). Historical findings are scoped to their dates/samples.

## Purpose and architecture

Centralized access management for approximately 1,000 employees; VSTS is the first
planned provisioning pilot. Legacy remains the system of record. The portal now
implements self-service request submission but no approval or execution engine.

npm workspaces: React/TypeScript/Vite Web; Azure Functions v4 TypeScript API;
transport contracts; shared safety policy; read-only connectors; Prisma schema,
client and repositories for a separate future portal SQL Server database.
API services depend on repository interfaces; legacy mssql reads bypass Prisma.
Schema/repositories, synthetic fixtures and an initial Portal baseline migration
exist. The baseline was applied to the explicitly approved Azure SQL DEV target
during [M1 DB acceptance](m1-db-acceptance.md). See [M1 request engine](portal-request-engine.md), [architecture](architecture.md),
[data access](data-access.md), [data model](data-model.md).

## Authentication and completed capabilities

MSAL redirect login/silent API tokens; independent API Entra JWT signature,
issuer/tenant/audience/lifetime/claims and access_as_user scope validation. Roles:
Admin, Approver, Viewer. API checks are authoritative; business ownership and
request-level permissions remain future work. Local sign-in was historically
verified with manually created registrations; this snapshot verifies no tenant
configuration. See [authentication](authentication.md).

- Authenticated responsive shell and synthetic business previews; health with no
  external I/O, /api/auth/me and protected Admin test endpoint.
- Admin-only matrix rows/summary API and Access Catalog view with masked Manager.
- Admin legacy request list/detail APIs and UI. List has four validated exact-match
  filters (system, country, SharePoint-side VSTS status, department), 20/50-row Web
  bounds and URL-preserved navigation. Detail presents bounded SQL-backed VSTS
  observations and independent statuses, not authoritative workflow outcomes.
- Historical 07A–07M delivered SQL safeguards/discovery, model refinement, matrix
  reads, request/VSTS relationship/lifecycle analysis and list/detail/filter views.
  See [list API](legacy-user-request-api.md), [detail API](legacy-user-request-detail-api.md)
  and [lifecycle semantics](legacy-approval-lifecycle-semantics.md).
- M1 adds authenticated self-service ADD/REMOVE/CHANGE submission and owned list/
  detail APIs, Portal catalog selection, immutable catalog snapshots, idempotency,
  version 1, atomic audit, and a real My Requests UI. It stops at SUBMITTED and
  performs no approval, activation or target-system action.

## 07N–07Q outcomes

| Task | Delivered / limits |
| --- | --- |
| [07N](access-catalog-legacy-mapping.md) | Internal catalog analysis: historical sample 153 candidates, all catalog identities unresolved, 2 generated-code collision groups. No import, runtime endpoint or persistence. |
| [07O](approval-rule-legacy-mapping.md) | Internal approval analysis: 130 groups, 14 multi-manager groups, 153 unresolved identities, 21 unique observation links, 109 unresolved/collision links. Mode UNKNOWN, sequence UNRESOLVED; no identity or approval engine. |
| [07P](admin-resolution-workspace.md) | Admin /admin/resolution, five synthetic scenarios, frontend validation and memory-only drafts; no save/production candidate lookup. Historical browser visual QA remains incomplete. |
| [07Q](resolution-persistence-audit-design.md) | Design contracts and pure validators/helpers for decisions, versions/revisions, concurrency, drift and eligibility. No Prisma change, persistence service, write endpoint, audit emission or UI wiring. |

07N/07O evidence is capped, unordered and historical, not a full inventory or new
production verification. Neither analysis is registered in runtime/API/UI.

## Safety and implemented versus design-only

Scoped Admin legacy SQL reads exist. SharePoint/VSTS APIs are unconnected; VSTS
observations come from SQL backup data. Power Automate is unchanged. Integration
mode is READ_ONLY and all write/provision/revoke/automation flags are false; see
[canonical controls](production-safety-boundary.md). OPT-01 performs no production
access and asserts no deployment or database readiness.

Catalog/rule models and request persistence exist. Approval execution, resolution
persistence/governance/activation, provisioning,
reconciliation and JML are future work. 07Q POST examples are unregistered designs.
OBSERVED, RESOLVED, APPROVED, ACTIVE and PROVISIONED remain separate states.

## POLICY REQUIRED

Unresolved: requests for another person; verification of current target access and
inactive historical roles for REMOVE/CHANGE; catalog population/ownership and
applicability; source/department/context meaning and stable
keys; collision/duplicate handling and complete evidence; Manager authority and
eligible issuer-scoped identities/groups; ANY/ALL/SEQUENTIAL and ordering;
ownership, reviewer scope, self-approval/separation, delegation/escalation;
governance/activation authority; material drift and old active-version handling;
retention/privacy/reasons, exceptional deletion/backups; idempotency/replay windows
and recovery. See [07Q requirements](resolution-persistence-audit-design.md) and
[milestone gates](roadmap.md). Observations do not decide policy.

## Local development

Use Node 22.13+ or supported 24+ for jsdom (root declares 22+), npm 10+, Functions
Core Tools 4 only for local API use. Placeholder Entra config yields unconfigured
UI; partial config fails. Ignored .env and API local.settings.json hold local values;
never print/commit them. Mock needs development, enable flag and header, yielding
fake Viewer. Configured legacy views can initiate real reads; do not use them for
routine documentation verification.

Tests use fakes/synthetic fixtures, not live SQL integration. Portal DB access now
requires `PORTAL_DATABASE_OWNERSHIP=CONFIRMED_PORTAL_OWNED`. Build generates Prisma
client with a local placeholder; prisma:validate is syntax-only. Sandbox network
or child-process restrictions may block tooling; report limitations. Stop on
CreateProcessWithLogonW failed: 1907. At OPT-01 entry the two authApi files had
unrelated unstaged edits; preserve if present and inspect current status each time.

M1 database-backed API operational acceptance passed on the approved Azure SQL DEV
target on 2026-09-07: baseline applied, synthetic user/catalog seeded, and
submission/read/audit/idempotency verified. Browser Entra sign-in, catalog, ADD,
owned history, audit and idempotency subsequently passed after correcting the one
synthetic user's cross-tenant Entra mapping. Browser Detail remains incomplete
because the Web UI has no Portal Request Detail route/page. See
[DEV acceptance](m1-db-acceptance.md) and [browser evidence](m1-browser-acceptance.md).
Future prompts may name a milestone and bounded deliverables. Use M1–M4 planning,
retain 07A–07Q traceability, and never start the next milestone automatically.
