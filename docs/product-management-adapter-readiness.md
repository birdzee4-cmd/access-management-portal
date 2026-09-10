# Product Management controlled adapter readiness

PM-07 status on 2026-09-10: **BLOCKED AT THE PRE-WRITE SAFETY GATE**. PM-06
remains **NON-PRODUCTION SYNTHETIC ACCEPTANCE**. Repository source, offline
exports and synthetic fixtures are the evidence. Production was not accessed or
modified.

## Status and non-status

| Status | Result |
| --- | --- |
| CONTRACT CONFIRMED | 13/13 Topics |
| SERIALIZER VERIFIED | 13/13 Topics |
| DRY-RUN READY | yes |
| ADAPTER CONTRACT READY | yes |
| NON-PRODUCTION SYNTHETIC ACCEPTANCE | 13/13 Topics |
| REAL ADAPTER NORMAL-RUNTIME ACCESS | disabled; an isolated PM-07 SharePoint implementation exists but is unregistered |
| SUBMISSION DISABLED | yes; every schema flag remains false |
| PRODUCTION NOT CONNECTED | yes |

`VALIDATED`, `SERIALIZED`, `READY_FOR_ADAPTER`, `ATTEMPTED`,
`ACCEPTED_BY_ADAPTER`, `FAILED`, and `VERIFIED` are execution states. None means
`APPROVED`, `ACTIVE`, or `PROVISIONED`. Adapter acceptance is not verification.
The Portal creates no Product Management approval; Phase 1 approval remains the
Legacy Power Automate / Microsoft Teams workflow.

- `VALIDATED`: the typed 13-Topic input passed the PM-05 contract checks.
- `SERIALIZED`: the exact compatibility payload was constructed and revalidated.
- `READY_FOR_ADAPTER`: the v1 envelope and fingerprint are complete.
- `ATTEMPTED`: one bounded adapter call began.
- `ACCEPTED_BY_ADAPTER`: the adapter returned a downstream reference; processing
  is not yet proven.
- `FAILED`: a known terminal, exhausted, ambiguous, or verification failure
  occurred.
- `VERIFIED`: the separate verifier confirmed the expected synthetic reference.

## Implemented internal boundary

```text
typed 13-Topic Portal compatibility input
        -> PM-05 validation and compatibility serializer
        -> product-management-submission-envelope/v1
        -> in-memory atomic idempotency, audit, metrics and bounded retry guard
        -> ProductManagementSubmissionAdapter
        -> SYNTHETIC_NON_PRODUCTION / PM06_ACCEPTANCE only
        -> independent deterministic verification
```

`ProductManagementSubmissionService` has no API/function registration, Web path,
connector, repository, database, or network dependency. Its constructor accepts
only an adapter declaring the exact `SYNTHETIC_NON_PRODUCTION` target and
`network=false`. The adapter factory rejects absent, unknown, real, and Production
classifications. The normal runtime configuration accepts only an absent or
`disabled` adapter target and continues to require:

```dotenv
PRODUCT_MANAGEMENT_DATA_SOURCE=mock
PRODUCT_MANAGEMENT_SUBMISSION_ENABLED=false
PRODUCT_MANAGEMENT_REAL_ADAPTER_ENABLED=false
PRODUCT_MANAGEMENT_ADAPTER_TARGET=disabled
```

At PM-06, no Production adapter class existed.
`DisabledProductManagementSubmissionAdapter` still always fails closed. Existing
Product Management POST behavior still rejects all 13 schemas because
`submissionEnabled=false`. The later PM-07 adapter is a separate unregistered
one-attempt harness and is not accepted by the normal PM-06 factory/service.

## Version 1 envelope and canonicalization

The envelope contains only the fixed schema version, exact Topic, caller-provided
correlation and idempotency references, SHA-256 payload fingerprint, validated
compatibility payload, exact UTC ISO creation time, and explicit synthetic
non-Production target classification/name. It contains no token, credential,
secret, raw claims object, arbitrary metadata, or separate display-identity
metadata. The compatibility payload necessarily contains the minimum legacy
fields verified by PM-05, including server-derived requester/routing fields; it
must stay inside the future secured adapter boundary and never enter logs/metrics.

Fingerprint canonicalization is versioned by the envelope schema:

1. Start with the exact validated compatibility payload, not the preview-redacted
   payload and not envelope metadata.
2. Sort every object key by stable `en-US` lexical comparison.
3. Preserve array order and string content byte-for-byte; do not trim, case-fold,
   repair delimiters, or alter Unicode/newlines.
4. Omit `undefined`; encode null, booleans, and finite numbers as JSON primitives;
   reject unsupported/non-finite values.
5. Encode canonical JSON as UTF-8 and hash with SHA-256, represented as
   `sha256:<lowercase hexadecimal>`.

Correlation ID, idempotency key, creation time, and target are not part of the
payload fingerprint. The same serialized logical payload has the same fingerprint
even when object insertion order or correlation metadata differs.

## Idempotency and concurrency

PM-06 implements the state model and an acceptance-only in-memory store; it does
not invent a Production persistence target.

| Scenario | Behavior |
| --- | --- |
| Same key + same fingerprint | Await/reuse the original terminal result with `replayed=true`; do not invoke the adapter again. |
| Same key + different fingerprint | Fail closed with `IDEMPOTENCY_CONFLICT`; do not invoke the adapter. |
| Concurrent duplicate | Record the first promise synchronously; duplicates share it, so at most one acceptance occurs. |
| Retryable pre-acceptance failure | Retry the same envelope/key under the bounded policy. |
| Unknown acceptance outcome | Store a terminal failed-safe result and never automatically resubmit it. |

Process-local memory is not sufficient for multi-instance or restart-safe real
submission. PM-07 needs an approved durable store with atomic unique key binding,
fingerprint comparison, in-flight ownership/lease semantics, terminal result
retention, and reviewed replay/retention rules.

## Retry and failure/recovery

The policy permits at most three attempts. Conceptual backoff slots are 0, 250,
and 1,000 milliseconds. Tests perform no sleep; scheduling/waiting is a future
runtime concern. There is no infinite retry.

- Retryable before known acceptance: adapter unavailable, timeout explicitly known
  to be pre-acceptance, temporary network failure, downstream 429, and selected
  downstream 5xx.
- Non-retryable: validation/serialization/contract mismatch, authentication or
  authorization failure, unsupported Topic, idempotency conflict, explicit
  business rejection, verification failure, and retry exhaustion.
- Unknown: a timeout, disconnect, or partial response where acceptance cannot be
  determined. It becomes `UNKNOWN_OUTCOME`; automatic retry stops even if a
  downstream action might have occurred.

Validation and serialization fail before adapter readiness. Known retryable
failures are audited per attempt. Exhaustion terminates as `RETRY_EXHAUSTED`.
Acceptance followed by unavailable/failed verification remains
`ACCEPTED_BY_ADAPTER` with a failed transition; it is never labeled `VERIFIED`.

Unknown or accepted-but-unverified outcomes require manual reconciliation by an
authorized operator: locate the downstream action using correlation, idempotency
key and fingerprint; compare its expected reference/payload; record a reviewed
terminal result; only then decide whether a new submission is safe. PM-06
implements no reconciliation write, compensating action, or automatic resubmit.

## Verification

The adapter contract exposes `verify` separately from `submit`. A successful
verification returns the same synthetic downstream reference. PM-06 also simulates
verification failure and unavailability. A future real verifier must establish at
least that the downstream reference exists, the expected correlation/fingerprint
was received, and the expected workflow instance exists. Production was not
queried for verification.

## Audit and observability

The acceptance-only sink is append-only in memory and emits prepared, attempted,
accepted, failed, and verified Product Management submission events. Each contains
only correlation reference, Topic, synthetic adapter classification, payload
fingerprint, attempt, result classification, and timestamp. It contains no payload,
raw email, requester display identity, token, credential, claim, Manager value,
approval record, or Production identifier.

The exact event names are `PRODUCT_MANAGEMENT_SUBMISSION_PREPARED`,
`PRODUCT_MANAGEMENT_SUBMISSION_ATTEMPTED`,
`PRODUCT_MANAGEMENT_SUBMISSION_ACCEPTED`,
`PRODUCT_MANAGEMENT_SUBMISSION_FAILED`, and
`PRODUCT_MANAGEMENT_SUBMISSION_VERIFIED`.

In-memory counters cover prepared, attempted, accepted, failed, retry,
idempotency-conflict, verification-failure, and unknown-outcome counts. A future
runtime may add latency histograms without payload labels. PM-06 creates no
Production logging, monitoring, alerting, or audit integration. Durable audit
persistence, retention, access control, alert thresholds, and downstream
correlation require PM-07 approval and design.

Safe future latency records are elapsed milliseconds grouped only by envelope
version, Topic, target classification and result class. Logs may use those same
fields plus safe correlation, fingerprint and attempt; they must not include the
payload, display identity, email, Manager data, token, secret, credential, raw
claim, exception body, or downstream response body.

## Security and future least privilege

No credential is created or configured in PM-06. The exact Production integration
target is unresolved, so availability of managed/workload identity is not claimed.

| Future boundary | Minimum action/scope | Preferred credential and storage | Rotation/review |
| --- | --- | --- | --- |
| SharePoint compatibility intake, if selected | Create one item in the exact approved list with only v1 allowlisted fields; optional read of that reference for verification | Managed/workload identity where support is proven; otherwise certificate/secret in an approved secret store, never source | Automated rotation where possible; owner-defined expiry, emergency revoke and periodic permission review |
| Legacy workflow verification, if selected | Read only the exact workflow/reference state needed for one correlated submission; no Flow edit/enable/disable permission | Separate read and write identities; managed/workload identity preferred when supported | Independent rotation and access review |
| Audit/idempotency store | Create/read/update only PM execution records; atomic key constraint; no unrelated Portal/Legacy data | Portal-owned managed identity scoped to an approved store | Backup, retention, restore, rotation and break-glass review |
| Monitoring | Emit numeric status/latency telemetry with safe correlation; no payload or personal-data labels | Platform workload identity with telemetry-write only | Periodic access and sampling/privacy review |

Direct Legacy SQL, VSTS work-item, and Power Automate write permissions are not
implied. The future intake action must be selected and approved first; every
unrelated permission remains denied.

## Synthetic acceptance coverage

All 13 PM-05 fixtures run through serializer, v1 envelope, synthetic adapter,
result, audit, and independent verification. Tests assert exact Topic/payload,
deterministic fingerprint, one accepted action, expected audit sequence, no Portal
approval, no provisioning/revocation, and zero network calls.

Additional tests cover same-key replay, different-payload conflict, concurrent
duplicates, timeout/network/429/selected-5xx/adapter-unavailable retry, bounded
exhaustion, authentication/authorization/contract/business non-retryable results,
unknown-after-acceptance stop, verification failed/unavailable, safe audit data,
runtime submission disablement, and rejection of unsafe targets.

## PM-07 activation prerequisites — not performed

Every item below needs explicit evidence and authorization before real submission:

- accountable owner authorization for real submission and exact envelope/serializer version;
- exact Production integration target and exact downstream write action;
- approved credential mechanism and secret-storage boundary;
- technically enforced least-privilege write/read/verification permissions;
- durable atomic multi-instance idempotency persistence and replay retention;
- durable append-only audit persistence, retention, access and privacy policy;
- target-specific retry classification, backoff, timeouts and recovery policy;
- operator-owned ambiguous-result reconciliation and compensating-action runbook;
- safe monitoring/alerting, latency/error thresholds and support ownership;
- separately authorized real-adapter acceptance against an isolated, explicitly
  classified non-Production target;
- threat model/security/privacy review and evidence that credentials/payloads do
  not enter logs;
- deployment, rollback, cutover, stop and restoration plan;
- explicit proof that the Portal adds no Product Management approval while Legacy
  Teams approval remains authoritative;
- separately authorized deployment and every safety-flag/configuration change;
- final Production acceptance plan with exact scope, limits, verification, abort
  conditions, and authorization.

Changing configuration is not authorization. These were the PM-06 exit gates;
PM-07 later implemented only the isolated adapter/harness and stopped when the
operational pre-write gate failed. Normal submission, Production integration,
approval creation, provisioning, and revocation remain disabled.

## PM-07 controlled acceptance outcome

PM-07 repository work completed an offline workflow trace and added an isolated
SharePoint REST adapter/one-attempt harness. The operational Production write is
**BLOCKED AT THE PRE-WRITE SAFETY GATE** and was not performed. The adapter is not
registered in API/Web/normal runtime and cannot approve, reject, provision, or
revoke. It requires exact `PRODUCTION_CONTROLLED_ACCEPTANCE` configuration,
reviewed payload fingerprint, marker collision read, delegated-user/target/schema
verification, and normal submission settings to remain disabled. Ambiguous POST
outcomes are terminal with no automatic retry. See
[controlled Production acceptance](product-management-controlled-production-acceptance.md).

Durable multi-instance idempotency/audit remains unresolved; the isolated
one-attempt guard and downstream marker reconciliation do not claim to solve it.
No Production access, request, approval, or modification occurred in PM-07.
