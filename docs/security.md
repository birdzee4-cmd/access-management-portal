# Security

## Phase-one security posture

This repository is a local skeleton. It contains no production credentials, cloud resources, live clients, deployment automation, or write-capable legacy connector contract.

## Mandatory safety controls

All legacy integrations operate in `READ_ONLY` mode. The expected configuration is:

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
```

The parser in `packages/shared` accepts only these exact safe values and throws on absent, malformed, or permissive values. This is defense in depth; feature flags do not replace least-privilege identities, network controls, API permissions, database permissions, code review, or change approval.

## Identity and authorization

Microsoft Entra ID is the identity provider selected for the portal. Task 05A provided code boundaries, and Task 05B wires local testing to app registrations created manually outside this repository. No tenant/client identifiers, user assignments, secrets, or tokens are tracked. See [Authentication Foundation](authentication.md).

A later configuration phase must:

- register separate applications for appropriate client/API trust boundaries;
- validate issuer, tenant, audience, signature, expiry, and scopes/roles in the API;
- use least-privilege application permissions and prefer delegated access where appropriate;
- define portal roles separately from legacy-system permissions;
- prohibit authorization decisions based only on UI state.

No application registration, secret, certificate, or production tenant identifier is created here. The committed development-authentication mock is disabled by default, requires APP_ENV=development plus an explicit request header, and returns only a fixed fake Viewer identity.

## Secrets

- Commit `.env.example` and `local.settings.example.json` only.
- Never commit `.env`, `local.settings.json`, connection strings, tokens, client secrets, certificates, or personal access tokens.
- Use managed identities and a managed secret store in future hosted environments.
- Use synthetic/local data for development.

## Legacy connector controls

Future integration identities must be technically read-only at the source:

- SharePoint: read scopes only; no list or item mutation permissions.
- Existing SQL Server: a dedicated login restricted to `SELECT` on approved views; no DML or DDL grants.
- Azure DevOps / VSTS: read scopes only; no work-item, membership, permission, pipeline, or repository mutation scopes.
- Power Automate: no flow editing, triggering, enabling, or disabling permissions.

Any future connector must add tests proving that its public contract offers no mutation methods and that unsafe configuration prevents startup.

Task 07A adds those safeguards for the inactive legacy SQL foundation: every query passes a central SELECT-only guard, dynamic values are parameterized, matrix identifiers come from a fixed allowlist, and driver errors are replaced with messages that do not expose connection details. A future live connection still requires a database identity technically restricted to SELECT. See [Legacy SQL Read-Only Connector Foundation](legacy-sql-integration.md).

Task 07E exposes only two Admin-protected matrix read routes. Authentication and role authorization run before source/limit validation and lazy connector construction. Unknown query parameters are rejected, manager values are masked, responses and logs omit raw rows/identities/credentials, and automated tests inject fakes rather than contacting SQL. See [Admin-only Legacy Matrix Read API](legacy-matrix-api.md).

Task 07F exposes those bounded results in the Web Access Catalog. Non-Admin users do not initiate matrix requests, but this is only a UX control; the API remains the authorization source of truth. The UI consumes `managerMasked` without identity resolution and displays fixed, sanitized error states.

Task 07G adds an Admin-only legacy User Request list route. Its SQL projection never selects requester email, creator, manager, assignee, free-text detail, or infrastructure identifiers. The API returns a bounded normalized DTO, rejects all filters except a 1-50 row limit, and keeps VSTS `Work_ID` as a passive reference only. No UI or Portal-database persistence is added.

## Logging and privacy

Task 07P `/admin/resolution` reuses the existing Admin route/navigation guard.
Only bundled synthetic fixtures are rendered; Viewer/Approver are denied and
unauthenticated users follow the existing sign-in flow. The page adds no
production candidate endpoint, Matrix read or person lookup. Drafts live only
in React memory, with no browser storage or network persistence. Completeness
never grants authority or activates workflows. Safety flags remain unchanged.
See [Admin resolution workspace](admin-resolution-workspace.md).

Task 07O uses the existing guarded matrix projection for internal approval
analysis. Raw Manager values are processed only in memory and are absent from
candidate output. Approver fingerprints are correlation aids, not anonymization
or security identities; production reporting emits only counts via summarize().
No person values or fingerprints are committed, logged or exposed through a new
API/UI. There is no Graph/Entra lookup, identity assignment, approval execution,
persistence or safety-flag change. See
[Approval rule legacy mapping](approval-rule-legacy-mapping.md).

Task 07N catalog preview selects only RoleName, Department, and Active from the
four existing allowlisted matrices, at most 50 observations per source. It
excludes Manager/person fields and row IDs from candidates and fingerprints.
Hashes are correlation aids, not anonymization. Production reporting is limited
to count-only summaries; candidates and raw observations must not be logged or
committed. The service has no runtime/API/UI registration or persistence port.
All safety flags and existing guards remain unchanged. See
[Legacy catalog mapping](access-catalog-legacy-mapping.md).

Future logs must avoid access tokens, secrets, connection strings, full request payloads, and unnecessary employee data. Audit events should capture actor, action, target, decision, correlation ID, and timestamp, with an approved retention period.

## Threats to address before pilot

- Excessive Microsoft Graph or Azure DevOps scopes
- Confused-deputy behavior between portal and legacy permissions
- IDOR/BOLA on access-request resources
- Injection into legacy query filters
- Token leakage through browser storage or logs
- Privilege escalation through group or role mapping
- Replay and duplicate-request handling
- Incomplete audit trails
