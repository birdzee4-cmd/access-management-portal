# Resolution persistence and audit foundation

**DESIGN ONLY — NOT ACTIVE**

Task 07Q defines TypeScript design contracts and pure in-memory validation. It
does not enable persistence, create real records/events, register write routes,
query legacy sources, resolve real identities, modify Prisma, or activate any
Portal behavior. Task 07P remains a synthetic React-memory preview with no Save.

## Independent meanings and state dimensions

| Concept | Meaning | Not implied |
| --- | --- | --- |
| OBSERVED | Source evidence exists | A correct mapping, verified identity or approval |
| RESOLVED | A reviewer explicitly decides a mapping against specific evidence | Governance approval |
| APPROVED | A separate configuration-governance action authorizes that exact decision version | Activation or employee access approval |
| ACTIVE | An explicitly authorized decision may participate in Portal configuration behavior | An access action has executed |
| PROVISIONED | A target-system access action actually executed | Part of a ResolutionRecord lifecycle |

Resolution status is UNRESOLVED / IN_REVIEW / RESOLVED / SUPERSEDED / BLOCKED.
Governance status is NOT_SUBMITTED / PENDING_REVIEW / APPROVED / REJECTED.
Activation status is INACTIVE / ACTIVE / SUSPENDED. None of these vocabularies
contains PROVISIONED; execution and its evidence belong to a separate future
provisioning/audit domain. Governance here concerns Portal configuration, not
legacy employee access-request approval or legacy Manager authority.

## Existing Prisma assessment and gaps

The existing schema was reviewed and remains byte-for-byte unchanged.

| Existing model | Reusable foundation | Gap for safe resolution persistence |
| --- | --- | --- |
| System / Application / Role / Permission / AccessContext | Reviewed target references and scoped catalog relationships | Their active flags and mutable rows do not represent resolution/governance history; same-system and context applicability still need verification |
| ApprovalRule | Code/version/level uniqueness and configuration relationships | No source-evidence-bound decision aggregate, governance attestations, aggregate concurrency token or separate activation gate |
| ApprovalRuleApprover | Optional user link and sequence | Text reference is not authoritative identity proof; no issuer-scoped identity verification or per-decision attestation |
| LegacySource | Source object provenance separate from optional system/context | Source code does not prove business scope or stable row identity |
| LegacyApprovalMapping | Optional fingerprint and mapping status plus target references | No immutable decision chain, snapshot hash contract, ownership, governance/activation separation or optimistic concurrency; raw person columns are not appropriate new resolution payloads |
| User | Immutable Portal key and Entra object reference | Display name/email are not authoritative; tenant/issuer strategy and deleted/disabled identities require reviewed handling |
| AuditLog | Actor relation, time, action, entity, correlation, before/after text | Schema alone does not enforce append-only history, decision-version binding, atomic audit/write commit, tamper resistance or privacy minimization; generic before/after text is not a typed resolution ledger |

The proposed design therefore needs separately reviewed resolution, immutable
decision, governance attestation, audit and idempotency concepts rather than
overloading active catalog/approval rows. These are documentation and TypeScript
types only. No Prisma models, migration files, repository implementations, write
services, generated database artifacts or database operations are added.

## Conceptual records and typed payloads

`ResolutionRecord` is a future aggregate head with ID, candidate type/fingerprint,
owner, independent resolution/governance/activation states, current decision
version, aggregate revision, latest decision reference, version-pinned approved
and active decision references, and created/updated timestamps and actors. It
contains no provisioning status. Head projections could change only through a
future guarded transaction; immutable decisions remain the historical authority.

`ResolutionDecision` is immutable content: ID, parent record, monotonically
increasing version, typed payload, bounded reason, decidedBy/decidedAt, source
evidence, previousDecisionId, and optional rollbackOf reference. Its initial
decisionStatus is DRAFTED and is never rewritten to APPROVED. Separate immutable
attestations record REVIEWED / APPROVED / REJECTED outcomes for an exact decision
ID/version with actor, role, time, reason and policy version. Aggregate governance
status is a projection for the current decision, not a rewrite of old content.

`ResolutionDecisionDraft` carries a record reference, concurrency token, typed
payload, reason, source evidence and optional rollback reference. It intentionally
does not accept authoritative decidedBy or server timestamps from a browser.
Future ingestion must validate the envelope, authenticate the actor, compare the
payload candidate type to source evidence, verify referenced targets and policies,
and reject unexpected fields before constructing a decision.

Payloads are a discriminated union with schemaVersion 1:

- CatalogResolutionPayload has typed System and Role references and explicit
  RESOLVED / UNRESOLVED / NOT_APPLICABLE choices for Application, Permission and
  Context. NOT_APPLICABLE requires a reason; it is not inferred from null. Target
  kind and reference syntax are validated, but same-system relationships and
  business applicability require future trusted validation.
- ApprovalResolutionPayload pins a catalog resolution decision ID/version,
  contains issuer-scoped approver references, explicit UNKNOWN / ANY / ALL /
  SEQUENTIAL mode, an explicit sequence for SEQUENTIAL only, and separate role/
  department/source/context scope choices. Sequence must be a unique permutation
  of the supplied approvers, including identity type and issuer context.

Structural payload validation accepts explicit unresolved draft states. It does
not declare completeness, authority, governance, or activation eligibility.
UNKNOWN mode and unresolved dimensions must become business blockers where
applicable in a future trusted resolution service. Arbitrary unvalidated JSON is
not the source of truth: known keys, versions, reference kinds and bounded arrays
are checked. SQL Server's current string payload convention would require those
checks before any later serialized storage; no such storage exists here.

## Actors, ownership and reason

Actor references distinguish PORTAL_USER with portal context from ENTRA_USER
with tenant context, using immutable opaque identity IDs rather than display
names. Approver references may additionally describe ENTRA_GROUP. Structural
reference validity is not proof that an account exists, is enabled, belongs to
the scope, or has reviewer/approver authority. Manager display strings, email
matching and fingerprints cannot establish that authority. Graph/Entra lookup
and production identity population are absent in Task 07Q.

createdBy, updatedBy, decidedBy, reviewedBy, approvedBy and activatedBy remain
distinct responsibilities, represented on records, decisions, attestations or
audit actor-role fields. The future server derives actors from a verified session
and checks scope/ownership and current policy. Whether roles must be different
people, self-approval is prohibited, group approval is allowed, or service actors
may participate is **POLICY REQUIRED**. Task 07Q does not invent those policies.

The proposed reason contract requires 1–2000 characters, nonblank plain text,
rejects HTML delimiters and disallowed control characters, and allows ordinary
newlines/tabs. This is a bounded design constraint, not an approved retention or
legal policy. Reasons stay immutable with the version/attestation. Future clients
must render them as escaped text and prohibit sensitive/unnecessary content;
plain-text validation alone does not detect personal data or secrets.

## Versioning, concurrency, superseding and rollback

Two counters are intentionally separate:

- `currentVersion` identifies the immutable decision chain (0 before the first
  decision, then 1, 2, 3...). New decision content always creates another version.
- `revision` covers **every** future aggregate mutation, including governance,
  source-state changes and explicit activation/deactivation. ConcurrencyToken's
  expectedVersion is this aggregate revision, bound to a record ID.

For example, decision v3 may have aggregate revision 7 after reviews. Both Admins
read revision 7. Admin B creates v4/revision 8; Admin A's token for revision 7
must conflict. A concurrent governance change must also invalidate the token even
if the decision number did not change. Future compare-and-swap plus decision,
head, audit and idempotency changes must occur atomically in one transaction.
The pure token check is simulation only; a check-then-write outside that atomic
boundary would still be vulnerable to races.

`validateExpectedVersion()` returns VERSION_CONFLICT for stale or wrong-record
tokens; a future API would map this to 409 (or a consistently specified ETag
precondition equivalent). Invalid, missing, non-integer or unsafe tokens fail
closed. A reviewer must load and review the latest state before a new attempt;
no blind overwrite or automatic conflict retry is allowed.

`createNextVersionMetadata()` returns only metadata: incremented decision
version and revision, prior decision link, optional rollback reference, fresh
NOT_SUBMITTED governance and INACTIVE status **for the proposed new version**.
It does not save or mutate the aggregate or deactivate an older active version.
If an older version is active, future policy must explicitly suspend/deactivate
it or retain a separately pinned activeDecision while the new proposal is under
review. **POLICY REQUIRED**; never silently repoint active configuration.

Superseding makes a record/version inapplicable while retaining historical
visibility and prior decisions. SUPERSEDED is terminal in the proposed transition
graph. Rollback is a new version copying a reviewed prior decision's intent,
referencing both the current predecessor and old decision via rollbackOf; version
counters never decrease and history is not removed. Referenced history must
actually exist under the same record and be verified by the future server.
Rollback must recheck current evidence, identity and governance; old approval or
activation is never inherited. Unknown rollback/active-version policy fails closed.

## Drift and stale evidence

ResolutionSourceEvidence contains candidate type, source scope, candidate
fingerprint, sourceSnapshotHash, algorithm and normalization version; no raw
person snapshot. An observation/candidate fingerprint is only correlation, not
proof of uniqueness. A snapshot hash should cover all materially relevant
evidence using reviewed canonical encoding and normalization versions, including
duplicates and ordering only where ordering is meaningful. Which changes are
material is **POLICY REQUIRED**. This task compares supplied synthetic hashes;
it does not introduce production snapshot hashing, polling or reads.

`detectSourceDrift()` classifies:

| Evidence | Result |
| --- | --- |
| One valid match, same type/scope/fingerprint/hash/normalization | UNCHANGED |
| One comparable match with changed hash, candidate fingerprint, type or scope | SOURCE_CHANGED |
| Explicit absence confirmed by an authoritative lookup | SOURCE_MISSING |
| Multiple matches, even identical hashes | SOURCE_COLLISION |
| Unavailable/invalid evidence, empty bounded result, unconfirmed absence, changed normalization/algorithm | UNKNOWN |

Absence from a capped unordered 07N/07O sample is not proof of source deletion.
The future server must establish the lookup scope, uniqueness and authoritative
absence; callers cannot assert those facts themselves. Any state other than
UNCHANGED blocks new activation eligibility. Later drift must not silently apply
an old resolution to new evidence: mark/review drift, invalidate prior eligibility,
and require explicit reviewed re-resolution or controlled suspension according
to approved policy. No real transition is performed here.

## Transition and activation safeguards

Proposed resolution graph:

- UNRESOLVED → IN_REVIEW or BLOCKED.
- IN_REVIEW → RESOLVED or BLOCKED.
- RESOLVED → IN_REVIEW, BLOCKED or SUPERSEDED.
- BLOCKED → IN_REVIEW or SUPERSEDED; SUPERSEDED has no onward transition.

Proposed governance graph per decision:

- NOT_SUBMITTED → PENDING_REVIEW.
- PENDING_REVIEW → APPROVED or REJECTED.
- APPROVED/REJECTED are terminal attestations for that version. A correction or
  resubmission creates a new decision version, retaining earlier outcomes.

Transition helpers check structural graph edges only. They do not implement
authorization, completeness, source validation or mutation. Unknown states and
invalid edges fail closed; even a valid edge is not authorization to execute it.

Activation eligibility requires resolution RESOLVED, governance APPROVED for the
**exact current record/decision/version**, source UNCHANGED, no blockers, verified
policy and identity checks, and a currently INACTIVE or SUSPENDED activation
state. The helper returns ELIGIBLE_FOR_EXPLICIT_ACTIVATION or NOT_ELIGIBLE plus
blocker codes. It never returns a transition to ACTIVE, creates an audit event,
updates state, or provisions anything. All facts must come from future trusted
server checks; a browser-provided VERIFIED value would be unacceptable.

Eligibility is not durable authorization: a future explicit activation command
must recheck the expected revision, exact approved decision, source drift,
identities, collisions, ownership and policy inside its authoritative transaction.
Authorization can become stale between review and action. Activation never
creates an execution/provisioning request implicitly.

## Immutable audit and deletion

Defined audit event names include RESOLUTION_CREATED, DECISION_DRAFTED,
DECISION_REVIEWED, DECISION_REJECTED, DECISION_APPROVED, RESOLUTION_ACTIVATED,
RESOLUTION_DEACTIVATED, RESOLUTION_SUPERSEDED and SOURCE_DRIFT_DETECTED. This task
defines types only and emits no real event.

Future events pin the resolution/decision version, actor reference and role,
server time, aggregate revision, prior event reference, correlation, reason and
optional source snapshot hash. Do not copy raw payloads or person profiles into
before/after audit blobs. Event-to-actor-role consistency, ordering, unique event
IDs and decision references must be enforced by a future service/transaction.

Normal decision/audit history is append-only with no hard delete. Corrections
create new events/versions. Access controls, database restrictions and reviewed
tamper-evidence/backup policy must make historical edits detectable; TypeScript
readonly and an AuditLog table alone do not enforce immutability. Audit failure
must abort the associated decision/state transaction; no unaudited partial success.

Use supersede/deactivate when a decision is no longer applicable. Exceptional
legally required deletion/redaction needs a separate authorized administrative
process, scope review, minimum retained trace where permitted and backup handling.
That policy and process are not implemented or presumed authorized here.

## Privacy and retention

Keep only required immutable actor references, typed target references, bounded
reasons and source hashes. Avoid duplicating employee profiles or unnecessary
legacy rows. No raw Manager strings, tokens, credentials or production identity
values belong in these test fixtures or docs. A hash over low-entropy personal
data can be guessed: it is not an anonymous identity or a security credential.
Snapshot hash is preferred to raw sensitive snapshots, but its privacy controls,
scope and canonicalization need review.

Retention duration is **UNRESOLVED / POLICY REQUIRED**, including audit records,
identity tombstones, reasons, snapshots/hashes, idempotency records and backups.
No duration or legal obligation is invented. Historical actor references must
remain interpretable without enabling a deleted/disabled identity to act.

## Future write API concepts — documentation only

No routes below are implemented or registered:

| Example future command | Intended separate action |
| --- | --- |
| POST /api/admin/resolutions | Create owned unresolved aggregate; no activation |
| POST /api/admin/resolutions/{id}/decisions | Append typed, reasoned decision version |
| POST /api/admin/resolutions/{id}/submit-review | Submit exact decision for configuration governance |
| POST /api/admin/resolutions/{id}/approve | Append authorized governance approval for exact version |
| POST /api/admin/resolutions/{id}/activate | Explicit independently authorized activation only |

Requirements before implementation: authenticated Admin plus approved business
ownership/scope policy; server-derived actor/time; validated bounded request and
payload schema; required reason; expectedVersion/ETag; immutable source evidence;
fail-closed eligibility and approved decision binding; atomic audit; and 409 for
conflicts. Non-create commands require a matching aggregate token. Initial create
needs an atomic uniqueness/candidate-collision policy and idempotency protection,
not a fabricated pre-existing version. **POLICY REQUIRED** for candidate identity
and uniqueness when source keys remain unproven.

Idempotency keys must bind authenticated actor, scope, operation and canonical
request hash, including expected version and target decision. Same key/same
request may replay the committed result after authorization checks; same key with
different content must conflict. Claim key, compare revision, append immutable
content/audit and advance head in one transaction. A timeout cannot be assumed a
failure or success; query/retry by the same idempotency key, then review confirmed
outcome. Do not let retries append duplicate decisions or repeated activation.
Key retention and replay window are **POLICY REQUIRED**.

Transport/auth design must consider session mechanism: cookie-authenticated writes
need CSRF protections; bearer-authenticated routes need strict token/scope/audience
validation, CORS/origin policy and protection against token leakage/XSS. CORS alone
is not authorization. Error bodies/logs must not disclose identities, source rows,
tokens or credentials. No security setting is changed in Task 07Q.

## Threat and failure analysis

| Scenario | Required future behavior |
| --- | --- |
| Stale candidate or source changes after resolution | Compare reviewed evidence at decision/review/activation; fail closed on changed/missing/collision/unknown; re-review or controlled suspension policy required |
| Concurrent edits or governance races | Atomic aggregate revision comparison; 409 and explicit review of latest state |
| Duplicate submit | Actor/operation/request-bound idempotency with atomic commit and replay-safe result |
| Unauthorized reviewer or wrong scope | Server authorization and ownership/policy checks before any persistence |
| Self-approval | POLICY REQUIRED; do not assume same-actor acceptance or separation rule; block eligibility until policy is verified |
| Identity deleted/disabled or wrong issuer | Validate immutable identity and eligibility again; retain historical reference, deny new action |
| Approval rule or catalog linkage collision | Block resolution/activation until an explicit reviewed ambiguity decision exists |
| Activation without governance or for an old approved version | Require exact current decision approval plus explicit activation command and revision check |
| Retry after timeout | Confirm result via idempotency; never blind append or activate again |
| Audit failure | Abort state/content mutation atomically; fail closed |
| Partial transaction | Roll back head, decision, audit and idempotency changes together; never publish incomplete success |
| Replayed request | Authenticate/authorize again, bind content/version/idempotency, enforce reviewed replay window |

## Verification and next boundary

Synthetic tests exercise independent statuses, allowed/rejected transitions,
activation blockers and exact-version binding, drift including bounded absence,
monotonic version/revision handling, stale concurrency, immutable-history rollback,
typed payload/identity/sequence validation, bounded reasons, privacy fields and
07P no-save/synthetic regression. Helpers import no DB, network, clock or
identity service and never emit real audit events. All tests run without SQL.

POLICY REQUIRED decisions remain: ownership and reviewer scope, self-approval and
separation of duties, identity eligibility, group/sequence/scope semantics,
catalog applicability and uniqueness, material source drift, active-old-version
handling, reason/privacy review, governance/activation authority, retention,
exceptional deletion, idempotency/replay windows and recovery obligations.

Validation on 2026-09-07, Node 24.15.0:

| Required check | Result |
| --- | --- |
| npm test | PASS: 271/271 (45 new contracts tests, connectors 40, database 6, web 73, API 107) |
| npm run typecheck | PASS |
| npm run build | PASS |
| npm run prisma:validate | PASS against unchanged schema and existing local placeholder |
| npm audit --audit-level=moderate | PASS: online registry, 0 vulnerabilities |

No new dependencies are introduced. Prisma schema, migrations, Task 07N/07O
service implementations and Task 07P page/state/fixtures are unchanged. Existing
unrelated auth edits participate in working-tree tests but remain outside this
task's commit, with their original file hashes preserved.

Recommended Task 07R: obtain Business/Admin approval of those policies and define
the corresponding synthetic acceptance cases and transaction/API specification.
Keep persistence, production candidate exposure, migrations, activation and
provisioning separately authorized. Task 07Q does not begin Task 07R.
