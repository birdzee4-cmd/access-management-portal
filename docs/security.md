# Security

## Current security posture

The [production safety boundary](production-safety-boundary.md) is authoritative
for default flags, prohibited actions, source permissions, secrets, privacy and
validation. [Project state](project-state.md) distinguishes implemented SQL reads
from previews and future workflows.

## Identity and authorization

Microsoft Entra ID is the identity provider selected for the portal. Task 05A provided code boundaries, and Task 05B wires local testing to app registrations created manually outside this repository. No tenant/client identifiers, user assignments, secrets, or tokens are tracked. See [Authentication Foundation](authentication.md).

A later configuration phase must:

- register separate applications for appropriate client/API trust boundaries;
- validate issuer, tenant, audience, signature, expiry, and scopes/roles in the API;
- use least-privilege application permissions and prefer delegated access where appropriate;
- define portal roles separately from legacy-system permissions;
- prohibit authorization decisions based only on UI state.

No application registration, secret, certificate, or production tenant identifier is created here. The committed development-authentication mock is disabled by default, requires APP_ENV=development plus an explicit request header, and returns only a fixed fake Viewer identity.

## Legacy connector implementation history

These notes describe controls as introduced, not new production authorization.
Current request filters are documented in the [list API](legacy-user-request-api.md).

Task 07A adds those safeguards for the inactive legacy SQL foundation: every query passes a central SELECT-only guard, dynamic values are parameterized, matrix identifiers come from a fixed allowlist, and driver errors are replaced with messages that do not expose connection details. A future live connection still requires a database identity technically restricted to SELECT. See [Legacy SQL Read-Only Connector Foundation](legacy-sql-integration.md).

Task 07E exposes only two Admin-protected matrix read routes. Authentication and role authorization run before source/limit validation and lazy connector construction. Unknown query parameters are rejected, manager values are masked, responses and logs omit raw rows/identities/credentials, and automated tests inject fakes rather than contacting SQL. See [Admin-only Legacy Matrix Read API](legacy-matrix-api.md).

Task 07F exposes those bounded results in the Web Access Catalog. Non-Admin users do not initiate matrix requests, but this is only a UX control; the API remains the authorization source of truth. The UI consumes `managerMasked` without identity resolution and displays fixed, sanitized error states.

Task 07G adds an Admin-only legacy User Request list route. Its SQL projection never selects requester email, creator, manager, assignee, free-text detail, or infrastructure identifiers. The API returns a bounded normalized DTO, rejects all filters except a 1-50 row limit, and keeps VSTS `Work_ID` as a passive reference only. No UI or Portal-database persistence is added.

## Logging and privacy

Task 07Q defines DESIGN ONLY resolution/audit contracts. Future actor references
are immutable and issuer-scoped, without display names, raw Manager strings or
credentials. Source hashes are correlation evidence, not anonymization. Pure
helpers validate synthetic transitions, revision conflicts and explicit
activation eligibility; they grant no authority, perform no lookup and emit no
audit event. Retention, self-approval and ownership policies remain POLICY
REQUIRED. No UI save, API write, DB change or safety-flag change is enabled. See
[Resolution persistence and audit design](resolution-persistence-audit-design.md).

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

PM-05 Product Management runtime readiness is internal and preview-only. Its
typed allowlist rejects unknown/destination-incompatible payload fields, accepts
identity only with an authenticated-server-context marker, requires stable lookup
keys, and fails closed for inactive/unknown-active Matrix candidates, unresolved
Manager context, duplicates, invalid canonical Email arrays, and unsafe runtime
configuration. Preview output redacts server identity/routing fields and Email
addresses. The service has no API/UI registration or connector dependency; its
side-effect contract declares network, DB/legacy write, approval/audit, and
provisioning false. The only adapter is disabled and always throws. See
[Product Management runtime readiness](product-management-runtime-readiness.md).

PM-06 keeps the same runtime disablement while adding synthetic-only adapter
acceptance. Envelope hashing uses a documented canonical representation; the
in-memory idempotency store atomically shares concurrent duplicates and rejects a
key bound to a different fingerprint. Unknown acceptance outcomes are terminal
and are never automatically retried. Audit events contain correlation, Topic,
synthetic target, fingerprint, attempt, result and time only—never payloads,
emails, identities, Manager values, claims, tokens, or credentials. No Production
adapter, credential, persistence, route, monitoring connection, or network call is
added. See
[Product Management controlled adapter readiness](product-management-adapter-readiness.md).

PM-07 introduces an isolated real SharePoint REST adapter but no runtime route.
It accepts an injected access-token provider and never persists or logs the token,
payload, email, target identifiers, or downstream response body. Pre-write checks
require exact target classification, list metadata/schema, matching delegated
human identity, reviewed payload fingerprint, fixed marker/Topic, no prior marker,
and explicit least-privilege/target attestations. Each adapter and runner instance
permits one POST; ambiguous outcomes stop with no retry and reconciliation is an
explicit read. It exposes no approve/reject/provision/revoke operation. The live
gate failed and Production was not accessed. Remaining credential scope/storage,
durable idempotency/audit, failure-handler, notification, retention and operations
reviews are blockers. See
[PM-07 acceptance](product-management-controlled-production-acceptance.md).

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
