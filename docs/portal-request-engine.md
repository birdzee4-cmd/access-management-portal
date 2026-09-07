# M1 Portal-native Request Engine

## Outcome

M1 implements a Portal-owned self-service request flow for `ADD`, `REMOVE` and
`CHANGE`. It reuses Entra authentication and accepts only active users already
mapped by immutable Entra object ID to an active Portal `User`. Every role comes
from the active Portal catalog. Legacy observations are never request targets.

The implemented lifecycle is intentionally one-way:

```text
validated input -> SUBMITTED (version 1) -> stop
                         |
                         `-> item PENDING + immutable submission audit
```

There is no draft persistence, update, cancel, approval, activation, execution,
provisioning or revocation route. `SUBMITTED` and item `PENDING` record intent;
they do not imply `APPROVED`, `ACTIVE` or `PROVISIONED`.

## API and authorization

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/portal/catalog` | Active Portal catalog roles available to the mapped active user |
| POST | `/api/portal/requests` | Atomically creates one self-service request, one item and one audit event |
| GET | `/api/portal/requests` | Lists at most 100 requests owned by the authenticated requester |
| GET | `/api/portal/requests/{id}` | Returns the request only when its requester matches the authenticated Portal user |

All endpoints independently validate the bearer token through the existing Entra
authentication service and require Admin, Approver or Viewer. Those roles may use self-service because
the operation is scoped to the authenticated user. A missing/inactive Portal user
is denied. Callers cannot supply requester, target user, status, actor, version or
audit fields. Cross-user reads return not found through the scoped repository.
Responses use `Cache-Control: no-store` and sanitized error codes.

## Validation and action semantics

Requests contain exactly one item. Reason is trimmed plain text of 10–1000
characters. Optional dates use exact `YYYY-MM-DD`; expiration cannot precede the
effective date. Unknown JSON fields and malformed UUIDs fail closed.

- `ADD`: requires one requested active Portal role and forbids a current role.
- `REMOVE`: requires one stated current active Portal role and forbids a requested role.
- `CHANGE`: requires distinct current/requested active roles within the same Portal system.

REMOVE/CHANGE do not assert that the current role exists in VSTS or another target.
Target access verification is unavailable without M3 behavior. Inactive or
retired current catalog roles cannot currently be selected; handling historical
entitlements remains POLICY REQUIRED.

## Persistence, idempotency and audit

The full SQL Server baseline migration is
`database/migrations/20260907120000_m1_portal_request_engine/migration.sql`.
It creates the Portal schema and adds database constraints for request/action
vocabularies, role shape, reason, version, idempotency and payload hashes.
`AccessRequest.currentRoleId` supports REMOVE/CHANGE evidence while existing
`roleId` is the requested role. Catalog labels are serialized into the item
snapshot so later catalog edits do not rewrite submitted intent.

Each browser draft gets a UUID idempotency key. The server canonicalizes and
SHA-256 hashes the validated payload. `(requesterId, idempotencyKey)` is unique:
same key/same payload returns the committed request; same key/different payload
returns conflict. Catalog revalidation, request/item creation and
`ACCESS_REQUEST_SUBMITTED` audit append occur in one Prisma transaction. A unique
race is resolved by reading and comparing the committed hash. Audit records use
the Portal user ID, request/action/status/version and correlation key; they omit
reason, display identity, tokens and raw payloads.

Database access additionally requires
`PORTAL_DATABASE_OWNERSHIP=CONFIRMED_PORTAL_OWNED`. This guard does not authorize
or identify a target; operators must still verify it independently. The baseline
was subsequently applied to the explicitly approved Azure SQL DEV database, with
schema and constraint verification. See [DEV acceptance](m1-db-acceptance.md).

## UI

`My Requests` now loads the Portal catalog and the authenticated user's request
history, submits all three action types and shows current/requested roles and
`SUBMITTED` status. Failed retries retain the idempotency key. The page states the
self-service and no-execution boundary. It does not display an approval control or
contact any legacy endpoint.

## POLICY REQUIRED and completion boundary

Requests for another person remain blocked pending ownership/target-user policy.
Also unresolved: authoritative access verification for REMOVE/CHANGE; treatment
of inactive historical roles; catalog population/ownership and applicability;
retention; request cancellation/amendment; and the long-term idempotency replay
window. M1 does not invent these decisions.

Code, schema, migration artifact, API, UI and synthetic tests are complete. M1
database-backed API acceptance passed on the explicitly approved Azure SQL DEV
database, including baseline, synthetic seed, submission/read, atomic audit and
idempotency. Live browser Entra sign-in was not rerun. See the precise scope and
repeatable test in [DEV acceptance](m1-db-acceptance.md). M2 has not started.
