# Milestone roadmap

M1–M4 replace future micro-task planning. Preserve historical 07A–07Q research;
no Task 07R is planned. All milestones are future work, not approved execution.
Read [state](project-state.md), [safety](production-safety-boundary.md) and
[07Q design](resolution-persistence-audit-design.md). Start only explicitly
requested scope and STOP when complete; do not automatically continue.

## M1 — Portal-native Request Engine

**Status (2026-09-08): COMPLETE.** Code, schema, API, synthetic validation,
database-backed API acceptance and browser operational acceptance are complete.
The baseline and synthetic user/catalog were applied to the explicitly approved
Azure SQL DEV database. Browser Entra sign-in, catalog, ADD, owned history, audit
and idempotency passed after correcting the synthetic user's cross-tenant Entra
mapping. Browser acceptance verified Portal Request Detail for synthetic ADD,
REMOVE and CHANGE, SUBMITTED/PENDING status, appropriate current/requested roles,
Back and Refresh. Viewing did not create a request or invoke a write. See
[DEV acceptance](m1-db-acceptance.md) and [browser evidence](m1-browser-acceptance.md).
See [M1 implementation](portal-request-engine.md). Do not begin M2 automatically.

- **Objective:** submit and track portal-owned access requests without granting access.
- **Major deliverables:** reviewed request lifecycle, catalog/context snapshots,
  authenticated submission/read UI/API, ownership checks, validation, idempotency,
  versioned persistence and atomic audit; synthetic acceptance cases and reviewed
  local DB setup. Define trusted catalog inputs without importing preview data.
- **Entry conditions:** explicit implementation scope, approved request/catalog
  requirements and authorization policy; separately authorized portal DB target and
  migration scope before DB operations; agreed acceptance cases.
- **Safety boundary:** portal-only approved scope; legacy READ ONLY; no production
  refresh/import, approval execution, activation, provisioning/revocation,
  automation, Entra changes or deployment by default.
- **Completion criteria:** scoped submission/read works; unauthorized, invalid,
  duplicate and stale requests fail safely; snapshots, audit and concurrency are
  verified in authorized local/synthetic tests; no legacy side effects; context
  and validation evidence updated.
- **Dependencies / POLICY REQUIRED:** 07D models and 07N–07Q evidence; catalog
  applicability/identity, source keys/collisions, ownership/target-user authority,
  request states, privacy/retention and replay/recovery policy.

## M2 — Portal Approval Workflow

- **Objective:** auditable employee-request decisions using reviewed rules,
  separate from configuration governance and activation.
- **Major deliverables:** trusted rule resolution/persistence and versioned
  governance as required; independently authorized exact-version activation;
  verified scoped approvers; policy-approved ANY/ALL/SEQUENTIAL behavior;
  decision UI/API, immutable history and conflict/drift/retry safeguards.
- **Entry conditions:** accepted M1 contracts/tests; approved identity, reviewer and
  decision policies; explicitly authorized portal persistence scope. Legacy
  Manager observations cannot fill missing policy or establish authority.
- **Safety boundary:** portal workflow only; no legacy write, Power Automate
  modification/trigger, provisioning or revocation. Approval never executes access
  changes. Resolution, governance approval and activation are separate actions.
- **Completion criteria:** approved routing and negative cases pass; unauthorized,
  stale/replayed/conflicting decisions fail safely; exact rule/version and actors
  are audited; drift blocks unsafe use; no target access changes occur.
- **Dependencies / POLICY REQUIRED:** M1; identity/group eligibility, scope,
  self-approval/separation, delegation/escalation, mode/sequence, Active semantics,
  activation authority, old active-version handling, drift/rollback and retention.

## M3 — Controlled VSTS Provisioning Pilot

- **Objective:** execute and verify narrowly approved VSTS access changes;
  legacy work-item closure is never proof of provisioning success.
- **Major deliverables:** target/action allowlist, least-privilege connector,
  dry-run and human execution gate, idempotency, target-state verification,
  immutable audit/correlation, monitoring, stop controls and recovery runbook.
- **Entry conditions:** accepted M1/M2; explicit business/security approval for
  exact pilot subjects, targets, permissions and execution authority; reviewed
  credentials, verification/recovery criteria. Obtain explicit authorization for
  each VSTS write scope and necessary safety-control change before either occurs.
- **Safety boundary:** flags remain disabled pending separate scoped approval.
  Legacy SQL, SharePoint and Power Automate remain untouched; no broad sync,
  revocation or unattended automation by implication. Entra/deployment require
  separate authorization. Pilot failures stop execution for review.
- **Completion criteria:** approved cases have verified target outcomes and
  approval-to-execution audit; duplicate/failure tests pass; recovery/stop procedure
  demonstrated in approved scope; outcomes reviewed before expansion.
- **Dependencies / POLICY REQUIRED:** M2; target role mapping, least privilege,
  execution authority, pilot limits, verification source, retry windows,
  compensating actions and any separately authorized revocation/recovery exception.

## M4 — Governance / JML

- **Objective:** govern access over time through Joiner/Mover/Leaver and access
  reviews with approved ownership, evidence and operational controls.
- **Major deliverables:** authoritative lifecycle-event design, scoped access
  review/reconciliation proposals, join/move/leave policies, exceptions/escalation,
  audit/retention reporting, controlled revocation design, simulations and runbooks
  before separately approved execution.
- **Entry conditions:** reviewed M1–M3 outcomes and operating controls; approved
  lifecycle/identity sources, governance owners, privacy/retention and revocation
  policies; explicit authorization for live reads/writes or automation.
- **Safety boundary:** proposals/simulations by default. No bulk import, unattended
  provisioning/revocation, legacy write or Power Automate change from an observed
  event/discrepancy alone. Every enabled capability/rollout needs scoped approval.
- **Completion criteria:** agreed JML/review, exception, stale-evidence, ambiguity
  and recovery tests pass; audit/retention controls evidenced; operators accept
  runbooks and approved rollout boundaries.
- **Dependencies / POLICY REQUIRED:** M1–M3; authoritative HR/identity events,
  ownership, review frequency, lifecycle timing, revocation authority/exceptions,
  legal/privacy retention, reconciliation truth and recovery policy.

## Product Management controlled integration track

**PM-06 status (2026-09-09): COMPLETE — NON-PRODUCTION SYNTHETIC ACCEPTANCE.**
The versioned envelope, synthetic-only adapter, idempotency/concurrency guard,
bounded retry, safe audit/metrics, independent verification, failure recovery
model, and 13/13 synthetic acceptance are implemented without Production access,
external I/O, durable/external persistence, approval creation, or activation. See
[adapter readiness](product-management-adapter-readiness.md).

**PM-07 status (2026-09-10): BLOCKED AT PRE-WRITE SAFETY GATE.** The authorized
repository/offline trace and isolated real-adapter implementation are complete,
but no Production access or write occurred. Unknown failure-handler semantics,
unproven approval-notification fan-out, missing approved internal test identity,
missing exact live target/configuration, and missing least-privilege credential
evidence prevent the one-request acceptance. Normal submission remains disabled.
See [PM-07 acceptance](product-management-controlled-production-acceptance.md).
The PM-07 FINAL gate-closure attempt reconfirmed the block: controlled-acceptance
configuration was absent and neither a controllable Microsoft browser session nor
a usable Power Automate CLI resource token was available for bounded live
verification. No Production-specific dry run, target read, or write occurred.
PM-07 FIX aligns the inactive contract to the separately approved
`REJECT_AT_VSTS_AFTER_EXISTING_APPROVAL` boundary. Exactly one VSTS item created
by the legacy workflow is expected; an authorized human rejection is required,
while direct VSTS creation, business execution, excess artifacts, ambiguity,
double approval and access/provisioning/revocation remain blocked. The old
first-Teams rejection intent fails closed. This contract change neither runs nor
unblocks the Production acceptance.
PM-08 is not started and requires a separate decision after the remaining gates.
