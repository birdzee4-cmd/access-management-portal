# Product Management runtime integration readiness

PM-06 status on 2026-09-09: **NON-PRODUCTION SYNTHETIC ACCEPTANCE**. PM-05 remains
**DRY-RUN READY**. These statuses are based on repository source, committed
offline Power Apps/Flow exports, and synthetic tests only. No Production system
was accessed. See [controlled adapter readiness](product-management-adapter-readiness.md).

## Status vocabulary

| Status | Current result | Meaning |
| --- | --- | --- |
| CONTRACT CONFIRMED | 13/13 Topics | PM-03/PM-04 field, destination, serialization, omission, and owner decisions remain confirmed. |
| SERIALIZER VERIFIED | 13/13 Topics | A typed, deterministic compatibility serializer has exact synthetic assertions for every Topic. |
| DRY-RUN READY | yes | An internal preview can validate and return a sanitized compatibility payload without side effects. |
| ADAPTER CONTRACT READY | yes | PM-06 adds a typed envelope, adapter/result/verification contracts, and synthetic-only executor. |
| NON-PRODUCTION SYNTHETIC ACCEPTANCE | 13/13 Topics | Serializer through verification passes with synthetic fixtures and zero network I/O. |
| REAL ADAPTER DISABLED | yes | No Production implementation or registration exists; the disabled adapter always rejects. |
| SUBMISSION DISABLED | yes | Schema flags remain false and runtime guards reject every enabling or selectable adapter value. |
| PRODUCTION NOT CONNECTED | yes | No SharePoint, SQL, VSTS, Power Automate, Entra, network, or Portal DB integration was added. |

These statuses do not mean APPROVED, ACTIVE, or PROVISIONED. PM-06 makes the
boundary testable only against an in-memory synthetic adapter; it grants no
integration or activation authority.

## Runtime architecture

```text
validated typed Portal contract
        |
        v
topic-specific compatibility serializer
        |
        v
typed legacy field payload + exact Detail text
        |
        v
allowlist/destination/delimiter/omission validation
        |
        v
sanitized DRY-RUN preview
        |
        `---- submissionAllowed=false; adapterEnabled=false; no side effects
```

`ProductManagementCompatibilityPreviewService` is internal service/test code. It
is not registered in an Azure Function and has no Web route or preview panel.
Consequently, the existing `/requests/new` behavior and its disabled button are
unchanged. The service accepts only server-context identity and approved-config
markers; browser-shaped identity, extra fields, unsupported Topics, missing
stable keys, and invalid values fail closed.

The internal payload model names the confirmed SharePoint compatibility fields,
including the common fields and the Product Management business fields:
`CompanyName(Product)`, `Emailลูกค้า(Product)`, `ProviderType(Product)`,
`Package(Product)`, `AppName(Product)`, `PackageHid(Product)`,
`AccountName(Product)`, `RoleName(Product)`, `RoleInternal(Product)`,
`ProductName(Product)`, and `Detail`. It is a typed allowlist, not an arbitrary
dictionary contract. Fields outside the allowlist fail validation.

## Serializer coverage

| # | Topic | Serializer | Verified compatibility behavior |
| --- | --- | --- | --- |
| 1 | Create New Account | VERIFIED | App `[ AppID ] display` with trailing `" , "`; optional Add-On with trailing `" , "` to `PackageHid(Product)` only; omitted from `Detail` and all downstream paths. |
| 2 | เพิ่ม Email เข้า Account(ลูกค้า) | VERIFIED | Validated, trimmed, unique canonical Email array becomes comma-space adapter grammar v1; Role values retain trailing `", "`. |
| 3 | เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า) | VERIFIED | Account and multi-Role map to `AccountName(Product)` and `RoleName(Product)`; requester remains server-derived. |
| 4 | เพิ่ม App เข้า Account(ลูกค้า) | VERIFIED | App mapping is exact; all-Roles filters candidates by Account, preserves source order, joins with `", "`, and has no final delimiter. |
| 5 | ขอสิทธิ์เข้า Role(พนักงาน) | VERIFIED | Internal Roles use trailing `", "`; candidate must have stable key, `Active=true`, and resolved Manager context. |
| 6 | เพิ่ม App เข้า Role(พนักงาน) | VERIFIED | Same internal-Role rule plus required stable App identities and exact App serialization. |
| 7 | เพิ่ม Permission เข้า Role(ลูกค้า) | VERIFIED | Account/Role typed destinations; `featureList` remains unparsed raw text in `Detail`. |
| 8 | เพิ่ม Package Add On(ลูกค้า) | VERIFIED | Customer Role reuses `ProductName(Product)`; Add-On reuses `AppName(Product)` with exact owner-approved delimiters. |
| 9 | Create New Role สำหรับ Account(ลูกค้า) | VERIFIED | New Role maps to `RoleName(Product)`; `featureList` remains raw `Detail` text. |
| 10 | เปลี่ยน Provider สำหรับ Account(ลูกค้า) | VERIFIED | Provider reuses `RoleName(Product)` and remains independently represented in `Detail`; `emailList` is raw text. |
| 11 | Tranfer Owner Account(ลูกค้า) | VERIFIED | Provider reuses `RoleName(Product)`; Customer Email is `Detail`-only and never becomes `Emailลูกค้า(Product)` or identity/ownership authority. |
| 12 | ลบ User ใน Account(ลูกค้า) | VERIFIED | Account is typed; `emailList` preserves raw whitespace, punctuation, and ordering in `Detail`. |
| 13 | ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account | VERIFIED | Only observed `เปิด`/`ปิด`; notification remains `Detail`-only with no typed action field. |

Power Fx `Concat` compatibility intentionally retains its final delimiter for App,
customer Role, internal Role, and Add-On multi-select fields. Only the confirmed
all-Roles formula removes its final `", "`. Raw `featureList`, `emailList`, and
Transfer Owner Customer Email are neither parsed nor silently repaired.

## Preview and validation contract

The sanitized preview includes Topic, source contract status, mapped legacy
fields, omitted fields, deterministic warnings, compatibility notes, validation
status, `submissionAllowed=false`, `adapterEnabled=false`, and explicit false
side-effect markers for network, database write, legacy write, approval task,
audit event, and provisioning task. Server identity/routing values and email
addresses are redacted in the preview; exact internal serialization is validated
before sanitization.

Validation rebuilds the expected payload from the canonical input and compares
each expected field. It rejects missing, unknown, forbidden, misplaced, or altered
fields; wrong delimiters; changed `Detail`; cross-Account selected Roles; duplicate
stable keys; missing App; invalid/duplicate canonical customer Emails; inactive or
unknown-active Matrix candidates; and unresolved Manager context. It never infers
an approver, owner, identity, entitlement, or authority from names, Manager data,
Email, or legacy field labels.

## Adapter and runtime guards

PM-06 implements the typed `ProductManagementSubmissionAdapter` contract and an
explicit `SYNTHETIC_NON_PRODUCTION / PM06_ACCEPTANCE` adapter with independent
verification. It also provides in-memory audit/idempotency and bounded retry for
acceptance tests. None is registered in the API or Web application. No Production
adapter exists; the disabled implementation always throws. The preview service
still receives no adapter and cannot call one.

`readProductManagementRuntimeSafety` accepts only this state:

```dotenv
PRODUCT_MANAGEMENT_DATA_SOURCE=mock
PRODUCT_MANAGEMENT_SUBMISSION_ENABLED=false
PRODUCT_MANAGEMENT_REAL_ADAPTER_ENABLED=false
PRODUCT_MANAGEMENT_ADAPTER_TARGET=disabled
```

Missing submission/adapter-enable variables default to false and a missing target
defaults to the non-executable `disabled` state. `real`, an unknown data source,
any non-false enabling value, or any selectable runtime adapter target fails
service construction. Existing write/automation flags cannot turn this preview
into a submission path. The 13 schema registry entries independently retain
`submissionEnabled=false`.

## Approval boundary

Phase 1 Product Management approval remains exclusively:

```text
Legacy Power Automate -> Microsoft Teams Approval
```

The Portal creates no Product Management approval, approval task, approval audit
event, automation/provisioning task, or double approval. Runtime-readiness tests
assert those preview side effects are false.

## Activation prerequisites

Before any real adapter or submission can be proposed, all of the following need
separate explicit authorization and review:

- approved target systems, exact write actions, source/destination schema version,
  credentials, network boundary, and least-privilege connector permissions;
- reviewed server-side master-data adapters with stable keys, allowlisted reads,
  `Active=true` enforcement, ambiguity handling, privacy minimization, and stale
  data/drift behavior;
- an approved versioned Email compatibility grammar and acceptance evidence at the
  actual legacy boundary;
- write idempotency, concurrency, retry, replay, audit, monitoring, verification,
  stop, rollback/recovery, and support runbooks;
- explicit decision on legacy approval ownership during cutover, preventing Portal
  plus Legacy double approval;
- security review, synthetic/non-Production acceptance, separately authorized
  Production acceptance scope, and explicit authorization for every safety-flag or
  deployment change.

Changing an environment variable alone never authorizes activation. PM-06 adds no
real adapter, Production connection, deployment, provision, revoke, or migration.
