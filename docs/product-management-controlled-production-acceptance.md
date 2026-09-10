# Product Management controlled Production acceptance

PM-07 status on 2026-09-10: **BLOCKED AT THE PRE-WRITE SAFETY GATE**.
Repository/offline workflow tracing and the isolated adapter implementation were
completed. No Production system was read or written, no request was submitted,
and no approval was created or rejected.

## Scope and decision

The task authorized at most one clearly marked Production request, followed by
rejection at the first Microsoft Teams Approval. That write was conditional on
all nine pre-write gates passing. They did not pass:

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
  -> first human Manager approval in Microsoft Approvals / Teams
       -> Reject: SharePoint + SQL decision updates, rejection email/message, stop
       -> Approve: VSTS work item and correlation/status writes, notifications,
                   then IT Manager acknowledgement/approval and later updates
```

The Portal has no Product Management approval step. The legacy first approval is
the only approval that PM-07 intended to reach and reject.

| Step / artifact | Classification | Expected effect for one request before first decision |
| --- | --- | --- |
| Power App submit to `USR_PowerApp` | `PRE_APPROVAL_WRITE` | one SharePoint item |
| new-item flow trigger and run record | `PRE_APPROVAL_WRITE` | one Power Automate run/history artifact |
| item read, guard checks, manager lookup | `READ_ONLY` | bounded workflow/source reads |
| manager write-back | `PRE_APPROVAL_WRITE` | one update to the same SharePoint item |
| initial email | `PRE_APPROVAL_WRITE` | one email connector action |
| initial Teams posts | `PRE_APPROVAL_WRITE` | two Teams connector actions |
| Product Management SQL backup insert | `PRE_APPROVAL_WRITE` | one SQL row |
| first Manager approval | `PRE_APPROVAL_WRITE` | one approval record/task; platform notification count not proven |
| rejection response persistence | `POST_APPROVAL_WRITE` | one same-item SharePoint update and one SQL status update for one response |
| rejection notices and terminate | `POST_APPROVAL_WRITE` | one email action, one Teams action, flow stops |
| VSTS work item and correlation/status updates | `POST_APPROVAL_WRITE` | approval-only branch; zero when first approval is rejected |
| IT Manager acknowledgement/approval | `POST_APPROVAL_WRITE` | later approval-only branch; zero when first approval is rejected |
| VSTS status synchronization flow | `POST_APPROVAL_WRITE` | applies only after a work item exists; zero for first-stage rejection |
| generic HTTP flow-failure handler | `UNKNOWN` | external failure-path side effect; destination semantics not established |
| entitlement/provisioning/revocation | no action found | no such connector action appears in the inspected Product Management branch |

The expected normal-path counts above are action counts from the export, not live
observations. An exported action does not prove a Production connector will
succeed or that a platform will create exactly one notification artifact.

## Pre-write safety gate

| Gate | Result | Evidence |
| --- | --- | --- |
| A. Human Teams Approval exists | PASS | first `StartAndWaitForAnApproval` follows the SQL insert |
| B. Rejection precedes access/entitlement change | PASS | rejection branch updates status, sends notices, terminates before VSTS creation; no provisioning action was found |
| C. No unknown pre-approval access-capable step | FAIL | generic HTTP failure handler remains semantically unknown |
| D. Exact pre-rejection artifacts known | FAIL | connector action types/counts are known, but approval notification fan-out is not |
| E. Topic is low risk | PASS | Topic 13 is Detail-only and does not directly grant, remove, or transfer access |
| F. Safe test data and destinations | FAIL | no approved internal requester/email/delegated identity was supplied |
| G. Intended Production target verified | FAIL | offline Power App/Flow target matches; no bounded live target verification occurred |
| H. Authorized least-privilege credentials/config | FAIL | no relevant environment configuration or permission evidence was present |
| I. Normal user route remains disabled | PASS | no API/Web registration; all 13 schema flags and normal runtime guards remain disabled |

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

The controlled configuration requires the exact classification
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

- Product Management/API inventory: 185/185 passed with
  `node --test --test-isolation=none`.
- Complete repository fallback inventory: 362/362 passed (contracts 46,
  connectors 40, database 8, Web 83, API 185).
- `npm test`: TypeScript compilation passed, then the standard Node worker runner
  failed only with Windows `spawn EPERM`; the identical inventories passed with
  `--test-isolation=none` as required by the task.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run prisma:validate`: passed; syntax validation only, no database access.
- `npm audit --audit-level=moderate`: passed with zero vulnerabilities.
- Tests and builds used synthetic data/fakes. No real adapter test performed
  network I/O; the SharePoint transport tests inject a synthetic `fetch`.
