# Production safety boundary

This is the authoritative detailed safety reference. [AGENTS.md](../AGENTS.md)
provides repository instructions; [project state](project-state.md) records current
implementation and [roadmap](roadmap.md) defines future gates. Historical reports
retain evidence, not standing authorization for new operations.

## Authorization and ownership

Legacy Production (Power Apps, SharePoint, Power Automate, SQL Server and VSTS)
remains the existing system of record and is **READ ONLY** unless a future task
explicitly authorizes a scoped exception. Portal storage is a separate database
boundary, never permission to migrate or mutate legacy SQL.

Default prohibitions: legacy SQL DML/DDL, schema changes or migrations; SharePoint
item/list writes; VSTS work-item creation/closure, membership, permissions,
repository or pipeline changes; Power Automate editing, triggering, enabling or
disabling; provisioning, revocation and automation. Power Apps, Entra configuration,
cloud resource changes and deployment require separate explicit authorization.
Portal DB writes, migrations, db push, seeds and imports also require explicit
scope and verified targets. A milestone description does not authorize execution.

Production reads need explicit source/projection/limit/output scope. Do not invoke
configured read APIs or refresh production data for documentation. OPT-01 permits
no production access. Future write exceptions require reviewed target/action scope,
least privilege, audit, verification, recovery and stop conditions before execution.

## Mandatory default controls

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
```

`packages/shared/src/index.ts` rejects absent, malformed or permissive settings.
Keep guards and flags unchanged without explicitly authorized review. Flags do not
replace source permissions, network controls or approval. Reader identities need
technically enforced SELECT on approved SQL sources, SharePoint/VSTS read scopes
only, and no Power Automate editing or execution permissions.

## Read and preview safeguards

- SQL uses the central SELECT-only guard, fixed identifiers/projections, parameters,
  bounded reads and sanitized errors. No arbitrary SQL endpoint or mutation port.
- Admin authentication/authorization precedes input validation and lazy connector
  construction. UI guards supplement server checks. Lists cap at 50; Web offers
  20/50. Detail uses TOP (2) to detect duplicate snapshots and caps VSTS backup
  observations at 50. SharePoint and VSTS API clients remain unconnected.
- Matrix DTOs mask Manager. Request projections omit person, free-text and
  infrastructure fields. Preserve minimized responses and sanitized logs/errors.
- 07N catalog projection excludes Manager. 07O processes Manager only in memory;
  production reporting is count-only via summarize(), not candidates, raw values
  or fingerprints. Both analyses have no runtime/API/UI registration/persistence.
  Hashes are correlation aids, not anonymization or authoritative identity.
- 07P is synthetic and React-memory-only with no save/production candidate path.
  07Q contracts/helpers neither persist, verify identities, authorize, activate nor
  emit audit events. Bounded unordered absence is not proof of source deletion.
- M1 introduces only Portal-owned request writes behind the explicit Portal
  database ownership guard. Submission atomically records intent and audit, stops
  at SUBMITTED, and does not call any legacy connector or execution component.

## Identity and data handling

API JWT checks enforce signature, trusted issuer/tenant/audience, lifetime, required
claims, scope and roles. Never trust browser-supplied actors/roles. Portal roles do
not confer legacy permissions. Keep the development fake Viewer mock disabled by
default and restricted to explicit local development. SPA auth needs no secret;
never copy tokens into application state/logs/localStorage. See [authentication](authentication.md).

Use ignored local configuration and committed placeholder examples. Never print,
stage, commit or export secrets, tokens/Authorization headers, credentials,
connection strings, certificates/PATs, real tenant/client/user identifiers,
production personal data, raw Manager values or raw production rows. Do not inspect
secret files just to refresh docs. Use synthetic fixtures and preserve existing
approved aggregate evidence without expanding it into personal records. Prefer
managed identities/secret storage for future hosting.

Future persistence requires server-derived actor/time, scoped authority, immutable
versions, atomic audit and concurrency/idempotency protection. Privacy, retention,
exceptional deletion/redaction and backups remain POLICY REQUIRED; invent no
retention period. Detailed design: [07Q](resolution-persistence-audit-design.md).

## Evidence is not authority

| Term | Meaning |
| --- | --- |
| OBSERVED | Source evidence within stated sample; no entitlement or authority |
| RESOLVED | Explicit interpretation/mapping; an observation link resolves correlation only |
| APPROVED | Authorized exact scope/decision/version; configuration governance differs from employee access approval |
| ACTIVE | Separately authorized configuration activation, not legacy Active |
| PROVISIONED | Verified target access outcome after separately authorized execution |

None implies the next. Manager strings do not prove identity or approver authority;
source names do not establish countries/scope. SharePoint StatusVSTS, VSTS State,
approval fields and timestamps remain independent observations. Work-item closure
is not proof of approval or provisioned access.

## Validation and stopping

Tests use synthetic/fake dependencies without SQL. Builds generate Prisma client;
prisma:validate uses a local placeholder and validates syntax, not database state.
Neither is a migration. Future connectors must test that public contracts expose
no mutation methods and unsafe configuration fails closed. Audit can contact the
package registry, not production.
Do not start configured live API/UI sessions for documentation checks.

Review/security-scan staged changes; preserve unrelated edits and run
`git diff --cached --check`. Report actual checks and limitations, never implied
production/deployment verification. On `CreateProcessWithLogonW failed: 1907`, stop
execution and await user repair without retries, bypasses or credential changes.
Stop after the authorized scope.
