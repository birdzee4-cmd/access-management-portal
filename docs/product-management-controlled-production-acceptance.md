# Product Management controlled Production acceptance

PM-07 status on 2026-09-10: **CONTRACT ALIGNED; PRODUCTION ACCEPTANCE REMAINS
BLOCKED AT THE PRE-WRITE SAFETY GATE**.
Repository/offline workflow tracing and the isolated adapter implementation were
completed. No Production system was read or written, no request was submitted,
and no approval was created or rejected.

PM-07 FIX replaces the former `REJECT_AT_FIRST_TEAMS_APPROVAL` configuration
contract with the distinct exact intent
`REJECT_AT_VSTS_AFTER_EXISTING_APPROVAL`. The old value and every unknown value
fail closed; they are not reinterpreted. This task performed no dry-run or live
operation.

## Scope and decision

The current owner-approved acceptance boundary permits at most one clearly marked
Production request, its existing Teams Approval and normal SharePoint/SQL/Flow
artifacts, followed by exactly one VSTS work item created by the legacy workflow.
An authorized human operator must reject that work item before any business
execution. The future write remains conditional on every pre-write gate passing.
They have not yet passed:

- the exported failure path contains a generic HTTP action whose downstream
  semantics are not proven;
- the environment has no PM-07 Production target or credential configuration;
- least-privilege delegated SharePoint read/write scope was not evidenced;
- no approved internal requester/test email and matching delegated identity were
  available; a fake domain cannot be used because the workflow sends mail;
- exact platform-managed notification fan-out from the approval connector cannot
  be counted from the export alone.

Therefore `CONTROLLED PRODUCTION WRITE: BLOCKED`. No gate was bypassed and the
single-write allowance remains unused.

### PM-07 FINAL gate re-evaluation

The final gate-closure attempt on 2026-09-10 confirmed, without recording any
identifier or secret, that all 16 required `PRODUCT_MANAGEMENT_PM07_*`
configuration values were absent from the process environment and ignored local
configuration. No controllable Microsoft browser session was available, and the
existing signed-in CLI context could not obtain a Power Automate resource token.
Consequently it could not perform the bounded live flow, target, schema,
notification, approver, or permission reads needed to replace the offline
UNKNOWNs with Production evidence.

An available signed-in user context is not an approved PM-07 requester identity
and does not evidence delegated SharePoint least privilege. The task did not name
an approved internal requester, expected Manager approver, safe notification
destinations, exact site/list, or reviewed permission assignment. The final run
therefore stopped before the Production-specific dry run, target inspection, and
POST. No Legacy Production source was read or written and the one-write allowance
remains unused.

## Offline target correlation

The inspected Power Apps export names its writable intake data source
`USR_PowerApp`. The exported Power Automate flow uses a `GetOnNewItems` trigger.
Privacy-safe comparison of the two exports found both the dataset and table
references equal. This identifies the intended logical boundary in offline
evidence; it is not a live target or credential verification.

## Workflow and side-effect trace

The exported path is:

```text
Power App form
  -> SharePoint USR_PowerApp item
  -> new-item Power Automate run
  -> item/manager reads and same-item manager update
  -> initial email and two Teams messages
  -> Product Management SQL backup insert
  -> existing human Manager approval in Microsoft Approvals / Teams
  -> legacy workflow creates one VSTS work item and correlation/status artifacts
  -> authorized human rejects the VSTS work item
  -> bounded verification confirms no access/provisioning/revocation effect
```

The Portal has no Product Management approval step. The existing legacy Teams
Approval is retained without adding a second Portal approval; VSTS rejection is a
later authorized human action outside the adapter.

| Step / artifact | Classification | Expected effect for one controlled request |
| --- | --- | --- |
| Power App submit to `USR_PowerApp` | `PRE_APPROVAL_WRITE` | one SharePoint item |
| new-item flow trigger and run record | `PRE_APPROVAL_WRITE` | one Power Automate run/history artifact |
| item read, guard checks, manager lookup | `READ_ONLY` | bounded workflow/source reads |
| manager write-back | `PRE_APPROVAL_WRITE` | one update to the same SharePoint item |
| initial email | `PRE_APPROVAL_WRITE` | one email connector action |
| initial Teams posts | `PRE_APPROVAL_WRITE` | two Teams connector actions |
| Product Management SQL backup insert | `PRE_APPROVAL_WRITE` | one SQL row |
| existing Teams Approval | `EXPECTED_CONTROLLED_WRITE` | one legacy approval record/task; no Portal approval |
| VSTS work item and correlation/status updates | `EXPECTED_CONTROLLED_WRITE` | exactly one work item created only by the legacy workflow |
| VSTS rejection | `HUMAN_ACTION_REQUIRED` | authorized operator action; the adapter has `reject: false` |
| VSTS approval/completion into business execution | `PROHIBITED` | zero |
| entitlement/provisioning/revocation | `PROHIBITED` | zero before and after VSTS rejection |
| generic HTTP flow-failure handler | `UNKNOWN` | external failure-path side effect; destination semantics not established |

The expected normal-path counts above are action counts from the export, not live
observations. An exported action does not prove a Production connector will
succeed or that a platform will create exactly one notification artifact.

## Pre-write safety gate

| Gate | Result | Evidence |
| --- | --- | --- |
| A. Human Teams Approval exists | PASS | first `StartAndWaitForAnApproval` follows the SQL insert |
| B. No access/entitlement change before VSTS rejection | PARTIAL | no provisioning connector action was found offline, but this must be re-verified before the live request |
| C. No unknown pre-approval access-capable step | FAIL | generic HTTP failure handler remains semantically unknown |
| D. Exact bounded artifacts known | PARTIAL | one workflow-created VSTS item is now EXPECTED/ALLOWED; approval notification fan-out remains unverified |
| E. Topic is low risk | PASS | Topic 13 is Detail-only and does not directly grant, remove, or transfer access |
| F. Safe test data and destinations | FAIL | no approved internal requester/email/delegated identity was supplied |
| G. Intended Production target verified | FAIL | offline Power App/Flow target matches; no bounded live target verification occurred |
| H. Authorized least-privilege credentials/config | FAIL | no relevant environment configuration or permission evidence was present |
| I. Normal user route remains disabled | PASS | no API/Web registration; all 13 schema flags and normal runtime guards remain disabled |

The exact external input required to continue is one reviewed PM-07 operational
configuration package containing: the generic HTTP failure action's destination
and side-effect classification; complete pre-approval/Reject/Approve recipients
and connector fan-out; an approved internal requester with its delegated
SharePoint identity, expected Manager approver, company and routing value; the
exact Production SharePoint site/list and verified schema/read-back method; a
credential technically limited to creating and reading the one intake item with
no site administration, Flow modification, VSTS write, or direct SQL write; and
an authorized human rejection path plus bounded post-rejection read access.

### Synthetic downstream artifact gate

The code now evaluates a privacy-minimized observation containing artifact counts,
origin, VSTS state and prohibited-effect counts. It accepts exactly one controlled
request, SharePoint item, SQL backup row, Flow run, existing Teams Approval and
legacy-workflow-generated VSTS work item. `AWAITING_AUTHORIZED_REJECT` returns
`HUMAN_ACTION_REQUIRED`; only an observed `REJECTED` state completes the gate.

The gate aborts on excess/missing bounded artifacts, direct VSTS creation, Portal
double approval, VSTS approval/completion into business execution, access change,
provisioning, revocation, unexpected side effect, invalid count or ambiguous
outcome. It performs no I/O and gives the SharePoint adapter no VSTS capability.

## Selected Topic and planned data

Selected Topic: `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account`.

It has the lowest reasonable first-test risk because its confirmed serializer has
one Account selection and one `เปิด`/`ปิด` value, transports the choice only in
`Detail`, and does not directly remove access, transfer ownership, grant employee
entitlement, or add an App to an employee Role. It could still change business
notification behavior if approved, so rejection remains mandatory.

The isolated harness requires the exact marker `PORTAL-TEST-PM07` as the Account
display value, causing the marker to appear in `Detail`. It also requires an exact
reviewed fingerprint, a single explicit idempotency key, an approved deliverable
requester email, matching delegated SharePoint user identity/display name, and
approved company/routing values. None of those real values is committed here.

## Adapter and isolation

`product-management-controlled-acceptance.ts` implements a real SharePoint REST
compatibility adapter and isolated runner, but neither is composed into an Azure
Function, API route, Web page, or normal Product Management service.

The controlled configuration requires the exact rejection intent
`REJECT_AT_VSTS_AFTER_EXISTING_APPROVAL`, classification
`PRODUCTION_CONTROLLED_ACCEPTANCE`, one Topic, one marker, one reviewed payload
fingerprint, one idempotency key, the exact `USR_PowerApp` title, target/permission
attestations, rejection intent, and normal runtime values remaining disabled.
Missing, malformed, unclassified, or drifted configuration fails closed.

Before POST, the adapter reads and verifies the configured list by GUID, title,
list template, visibility, exact writable field schema, delegated current user,
and absence of any existing marker/Topic match. It dynamically maps the confirmed
legacy display fields to exact writable SharePoint internal names. It permits one
POST attempt per adapter instance and one execution attempt per runner instance.
It has read-back by item reference and reconciliation by marker. It exposes no
approve, reject, provision, or revoke capability.

The pre-submission dry run performs canonical validation, exact serializer and
compatibility validation, sanitized preview, v1 envelope construction, target
classification, marker check, and expected SHA-256 fingerprint comparison before
any target read or write.

## Idempotency and unknown outcomes

For the bounded test, the harness requires one explicit idempotency key and binds
it to the canonical payload fingerprint. A pre-write marker/Topic query blocks a
second logical PM-07 request already present in the target. Neither key nor
payload is logged.

The adapter performs no automatic retry. A thrown transport error, HTTP 408/429,
5xx, or success response without a usable item reference becomes
`UNKNOWN_OUTCOME`; execution stops. Reconciliation is a separate explicit read by
marker and exact payload comparison. It is never invoked automatically and a
second request is prohibited. Durable multi-instance idempotency remains a PM-08
blocker; process memory and a marker query are not represented as a general
durable solution.

## Operational result

| Result | Status |
| --- | --- |
| Pre-write workflow trace | PARTIAL |
| Pre-write safety gate | FAIL |
| Production-specific dry run | NOT PERFORMED |
| Controlled Production submission | NOT PERFORMED |
| Teams Approval reached | NO |
| Test request rejected | NO |
| Post-rejection verification | NOT PERFORMED |
| Unexpected observed side effects | NO |
| Portal double approval | NO |
| Normal Product Management submission | DISABLED |
| Controlled adapter available to normal users | DISABLED |
| Production access | NO |
| Production modification | NO |

Observed Production artifact counts are all zero because Production was not
accessed: Product Management requests 0, SharePoint items 0, SQL rows 0, Flow runs
0, Teams Approvals 0, VSTS items 0, and access/provisioning changes 0.

## Abort conditions

The harness stops before POST for missing/invalid explicit configuration; normal
runtime enablement; wrong Topic/marker; unapproved or mismatched requester,
company, or routing value; payload/fingerprint drift; target/list/schema mismatch;
non-human or mismatched delegated identity; hidden/non-generic list; or an existing
marker match. After POST begins, any ambiguous outcome stops without retry. Any
unexpected downstream artifact, inability to prove state, or inability to reject
must stop the operational acceptance without a second request.

## Remaining PM-08 blockers

- resolve/review the generic HTTP failure action and approval notification fan-out;
- approve an internal delegated test identity/email and routing/company values;
- configure and positively verify the exact Production site/list without storing
  identifiers or credentials in Git;
- evidence technically enforced least privilege and approved credential storage;
- provide authorized human rejection capability and bounded post-rejection reads;
- add durable atomic multi-instance idempotency and append-only audit with approved
  retention, access, recovery, reconciliation, and monitoring policy;
- separately authorize deployment/configuration and any future activation.

PM-08 was not started. `submissionEnabled=false` remains mandatory.

## Validation

- PM-07 FIX focused controlled-acceptance inventory: 12/12 passed, including
  new/old/unknown intent handling, one/excess VSTS artifacts, manual rejection,
  double approval, ambiguity and prohibited-effect cases.
- PM-07 FIX Product Management/API inventory: 188/188 passed with
  `node --test --test-isolation=none`.
- Complete PM-07 FIX fallback inventory: 365/365 passed (contracts 46,
  connectors 40, database 8, Web 83, API 188).
- Standard `npm test`: TypeScript compilation passed, then the Node worker runner
  failed only with Windows `spawn EPERM`; no test assertion failed before the
  identical inventories passed with `--test-isolation=none`.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run prisma:validate`: passed; syntax validation only, no database access.
  Prisma engine verification required the approved non-sandboxed network
  allowance.
- `npm audit --audit-level=moderate`: passed with zero vulnerabilities.
- Tests and builds used synthetic data/fakes. No real adapter test performed
  network I/O; the SharePoint transport tests inject a synthetic `fetch`.
