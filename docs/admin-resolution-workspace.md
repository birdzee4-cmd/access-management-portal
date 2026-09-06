# Admin Resolution Workspace preview

Task 07P adds `/admin/resolution`, titled Resolution Workspace, using the
existing Portal role guard and Admin-only navigation. It demonstrates explicit
review of unresolved catalog and approval observations using **bundled synthetic
fixtures only**. It does not consume Task 07N/07O production analysis output.

The page continuously displays ADMIN ONLY, PREVIEW, NOT SAVED, SYNTHETIC DATA,
and “Preview only — changes are not saved.” Its description explicitly says
decisions are not saved or activated. Preview completion uses neutral/information
styling, not a production success confirmation.

## Authorization and data boundary

Admin can open the page. Viewer and Approver cannot see its navigation entry
and direct navigation renders the existing access-denied page before the
workspace mounts. Unauthenticated navigation uses the existing Microsoft sign-in
flow. The existing authenticated shell still verifies its session through the
Portal API; the workspace itself has no API client or network dependency.

This is UI visibility for synthetic data, not a new security mechanism or a
backend authorization substitute. No production candidate endpoint is added.
Any future endpoint would need independent server authentication/authorization.

Five explicitly authored scenarios cover a single observation, a role across
departments, multiple approver observations, a role-code collision, and ambiguous
catalog linkage. Business labels and approver labels/codes are obviously
synthetic. NEW/TH/PH/VN_MY_ID occur only as already documented source categories.
No production RoleName, Manager, Department, request/work ID, row, employee,
catalog candidate, or approval observation is used.

## Frontend contract and lifetime

`resolution/model.ts` defines a frontend-only ResolutionDraft:

- candidateId: a bundled DEMO code, not a database ID;
- catalog: system, application, role, permission, context selections;
- approval: authority decision, identity type, approval mode, sequence
  resolution and synthetic ordering, and explicit scope decisions;
- reviewStatus: UNREVIEWED, IN_REVIEW, RESOLVED_FOR_PREVIEW or BLOCKED.

Warnings, blockers and readiness are derived in PreviewValidation instead of
stored in the draft, avoiding stale validation state. The draft is deliberately
not an ApprovalRule, catalog DTO, persistence record or proof of authority.
Task 07N/07O model/services and the Prisma schema remain unchanged.

React component memory holds per-candidate drafts. Switching candidates retains
drafts while the page remains mounted. Reset candidate creates a fresh unresolved
draft; Reset all preview data clears all drafts and selects Candidate A.
Refreshing, navigating away, signing out, or unmounting the page discards drafts.
There is no localStorage, sessionStorage, IndexedDB, cookie, URL, API or DB
persistence of these decisions. Existing MSAL authentication storage is outside
this preview state and is unchanged.

## Controls and explicit decisions

Catalog selections offer UNRESOLVED plus fixed synthetic codes for System,
Application, Role, Permission and Access Context. All begin unresolved; observed
role labels do not preselect a target or clear collisions.

Approval controls offer:

- Authority: UNRESOLVED / YES / NO.
- Identity type: UNRESOLVED / PORTAL_USER / ENTRA_USER / ENTRA_GROUP / UNKNOWN.
  These are preview labels only; no user IDs or identity lookup occur.
- Approval mode: UNKNOWN / ANY / ALL / SEQUENTIAL, default UNKNOWN.
- Sequence: unresolved by default. Only SEQUENTIAL exposes explicit positions
  with synthetic approver choices. Each must be chosen exactly once. Duplicate,
  missing or unknown choices block readiness. Changing mode clears all ordering;
  selecting SEQUENTIAL again does not restore or infer an order.
- Scope: Role, Department, Source and Context each independently offer
  UNRESOLVED / IN_SCOPE / NOT_IN_SCOPE. No country/source meaning or canonical
  approval key is assumed. At least one explicit included dimension is required
  for this demonstration's completeness rule.

Observed Active remains display text with no lifecycle meaning or action.
Authority NO and identity UNKNOWN are valid explicit review choices, but they
keep this demo candidate blocked rather than falsely implying completeness.

## Blockers, review and readiness

Validation is pure and client-side. It reports a blocker for each unresolved or
unrecognized catalog selection, unconfirmed/rejected authority, unresolved or
unknown identity type, UNKNOWN mode, missing approvers, incomplete/invalid
sequence, unresolved/empty scope, candidate mismatch, catalog collision and
catalog-link ambiguity. Sequence outside SEQUENTIAL is also rejected.

Collision and ambiguous-link blockers originate in immutable fixture scenarios.
Draft controls cannot erase them, merge candidates or select a catalog match
automatically. Scenarios A–C can demonstrate complete synthetic drafts; D–E
remain blocked. Optional Application/Permission/Context support in the real
catalog model is unchanged: this demo deliberately requires all five selections
and does not establish future production applicability rules.

Readiness is computed as:

| Condition | Readiness |
| --- | --- |
| Any blocker | NOT_READY |
| Complete draft awaiting explicit client validation | READY_FOR_REVIEW |
| Complete draft after Validate Preview | RESOLVED_FOR_PREVIEW |

Initial review status is UNREVIEWED. Editing sets IN_REVIEW and invalidates a
previous preview resolution. Validate Preview sets BLOCKED if blockers remain,
otherwise RESOLVED_FOR_PREVIEW. Reset restores UNREVIEWED. Completeness and
preview validation do not mean persisted, active, approved, production-ready or
provisionable; the page states this alongside the readiness result.

Allowed actions are candidate selection, draft changes, Reset candidate, Reset
all preview data and Validate Preview. There is no Save, Submit, Publish,
Activate, Approve, Provision, Revoke, Import or Sync action and no form submission.

## Safety and verification

Task 07P performs no production Matrix read, production candidate API exposure,
Manager exposure, Portal persistence, schema change, migration/db push, identity
or Graph/Entra lookup/change, SharePoint/VSTS API call, Power Automate operation,
approval execution, workflow activation, provisioning, revocation or deployment.
All safety flags and pre-existing unrelated auth changes remain unchanged.

Tests use synthetic fixtures only. Domain tests cover explicit defaults,
individual blockers, sequence permutations, collision persistence, readiness
transitions, reset and invalid IDs/options. Web tests use the existing route and
auth context, server rendering, and jsdom with real React DOM events to test
authorization, navigation, editing, validation, switching/reset, remount reset,
sequence visibility, safety text and prohibited-action absence. Network and
storage writes are trapped during DOM interactions; new module dependencies
are checked for network, persistence and backend paths. jsdom and its types are
development-only dependencies and do not enter the production application bundle.

## Validation results — 2026-09-06

| Check | Result |
| --- | --- |
| npm test | PASS: 226/226 (connectors 40, database 6, web 73, API 107), including 27 new domain/web tests |
| npm run typecheck | PASS |
| npm run build | PASS |
| npm run prisma:validate | PASS, local placeholder only |
| npm audit --audit-level=moderate | PASS, online registry, 0 vulnerabilities |
| Browser visual QA | Not completed: browser tooling reported no connected browsers |

Validation ran on Node 24.15.0. The jsdom 30 development test dependency requires
Node 22.13+ or 24+; use a supported Node release for these tests. The lockfile
also synchronizes its existing root engine metadata with package.json (Node 22+).
Initial sandbox execution denied test-runner child processes; the authorized
rerun completed. The temporary synthetic QA harness and local server were removed
and stopped. DOM interaction tests passed, but do not verify visual layout or
responsive rendering in a real browser.

## Future persistence boundary — design only

Before any resolution can be saved, Business/Admin must approve ownership and
scope: who owns each decision, which reviewers may propose/review/accept it,
and which source/system/context each reviewer may access. Reviewer identity
must come from a verified server session, never a browser-supplied person code.

A separately authorized persistence design would require:

- Server-owned created/updated timestamps and optimistic concurrency tokens or
  versions. Reject stale edits; never silently overwrite concurrent decisions.
- The source candidate fingerprint plus an immutable source observation snapshot
  or reviewed hash, with capture/version metadata. Detect changed source evidence
  and require re-review. Fingerprints are correlation aids, not identities or
  sufficient anonymization of person data.
- A reason/comment for decisions, explicit resolution status, decision owner,
  authenticated reviewer, and Business/Admin acceptance under reviewed policy.
- Append-only audit history and retained prior versions describing who changed
  what, when and why, including conflict handling and reviewed rollback/change
  history. A rollback must remain visible rather than erasing prior decisions.
- An activation status and authorization process separate from resolution
  status. A saved or reviewed resolution must never automatically activate a
  workflow, provision access or grant approver authority.
- A protected API with independent authorization, server-side validation,
  least-privilege persistence, retention/privacy controls and separate handling
  of sensitive identity evidence. The browser draft contract is not sufficient.

Task 07P implements none of that storage or API design. Business/Admin still
must confirm catalog identifiers and applicability, source/department/context
semantics, collision/link resolution policy, Manager authority and verified
identity, decision modes, sequence evidence, Active interpretation and the
required acceptance/activation separation.

Recommended next task: review the synthetic UX and agree on these decisions and
acceptance cases, then specify the protected persistence/audit contract under
separate authorization. Do not connect this preview to production candidates or
activate approval rules. Task 07Q is not started automatically.
