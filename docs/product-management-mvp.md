# Product Management MVP UI

Phase 1 exposes Product Management request history and `/requests/new` while
`VITE_PRODUCT_MANAGEMENT_MVP=true`. The system value is fixed. Country, Topic,
schema, and mock lookup behavior now follow the offline Power Apps evidence in
[Product Management source discovery](product-management-source-discovery.md).
The Portal does not read or write the legacy application in this mode.

## Confirmed request context

Country is a hard-coded Power Apps list in this exact order:

1. Thailand
2. Philippines
3. Vietnam
4. Malaysia
5. Indonesia

Topic is also hard-coded. The same exact ordered set is returned for every
supported Country:

1. `Create New Account (ลูกค้าใหม่)`
2. `เพิ่ม Email เข้า Account(ลูกค้า)`
3. `เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)`
4. `เพิ่ม App เข้า Account(ลูกค้า)`
5. `ขอสิทธิ์เข้า Role(พนักงาน)`
6. `เพิ่ม App เข้า Role(พนักงาน)`
7. `เพิ่ม Permission เข้า Role(ลูกค้า)`
8. `เพิ่ม Package Add On(ลูกค้า)`
9. `Create New Role สำหรับ Account(ลูกค้า)`
10. `เปลี่ยน Provider สำหรับ Account(ลูกค้า)`
11. `Tranfer Owner Account(ลูกค้า)`
12. `ลบ User ใน Account(ลูกค้า)`
13. `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account`

The spelling and ordering intentionally preserve the exported application.
Country does not filter Topic. Together, Country and Topic resolve a registry
entry corresponding to the legacy `Navigate(...)` then `NewForm(...)` behavior:

```text
/requests/new
  -> Country
  -> Topic
  -> evidence-based schema registry
  -> dynamic form
```

## Schema registry coverage

Every one of the 13 Topics has a registry entry containing its legacy screen
pattern, `USR_PowerApp` form pattern, controls/fields, lookup requirements,
effective requiredness, multiplicity, legacy binding/default/visibility, Portal
handling, submit destination, transformations, implementation status, and
machine-readable `partialReasons`. See the complete
[legacy form contract](product-management-form-contract.md).

PM-03 inspected all 65 effective supported Country/Topic forms. It added the
previously omitted List Feature field for Create New Role and List Email field
for Change Provider, and recorded the observed multi-value and reused-field
behavior. PM-03A initially closed five contracts from source and retained eight
explicit owner-policy gaps. PM-03B subsequently applies all ten explicit owner
decisions; the current registry result is `10 CONFIRMED / 3 PARTIAL`. The three
remaining PARTIAL contracts expose technical downstream-verification gaps rather
than OPEN owner decisions.

The registry now also records exact serialization metadata, overloaded legacy
field evidence, derived all-Account-Roles behavior, and effective Matrix behavior.
Contract status is independent of activation: `submissionEnabled=false` for all
13 schemas, so even a source-closed `CONFIRMED` schema remains non-submittable.

The Web renders only fields supported by the discovery evidence. A `PARTIAL`
schema displays a mapping-in-progress message and disables mock submission so it
cannot appear production-ready. The API mock submission boundary now rejects a
`PARTIAL` schema as well. All 13 schemas independently retain
`submissionEnabled=false`, including the ten currently `CONFIRMED` schemas.

## Phase 1 approval architecture

Product Management approval authority remains the existing Legacy Power Automate
workflow and Microsoft Teams Approval for Phase 1. Matrix data is candidate lookup
metadata only and grants no approval authority. The Portal introduces no Product
Management approval step, so Portal approval and Legacy Teams approval cannot both
be required. Migration to Portal-native Product Management approval is out of
scope and requires separate authorization. This is contract/policy metadata only;
no flow call or runtime integration is active.

## Read-only master-data boundary

The boundary remains Portal Web -> Portal API ->
`ProductManagementMasterDataService` -> `ProductManagementMasterDataAdapter`.
The Web consumes authenticated Portal API routes:

- `GET /api/product-management/countries`
- `GET /api/product-management/countries/{country}/topics`
- `GET /api/product-management/forms/{country}/{topic}`
- `GET /api/product-management/lookups/{lookup}` with `country`, `topic`, and,
  only for customer Role, `account`

`PRODUCT_MANAGEMENT_DATA_SOURCE=mock|real` remains explicit. Mock mode contains
synthetic values shaped around the confirmed legacy source partitions. Real mode
fails closed with HTTP 503 and never falls back to mock.

## Confirmed lookup model

| Portal lookup | Confirmed legacy behavior | Portal mock behavior |
| --- | --- | --- |
| Provider Type | Hard-coded form choices; observed union is SAML, Office 365, Hotmail/Outlook, Google, Local Account | Same observed union; no dependent lookup |
| Package | Country-specific `DB - vw_ListPackageStandard*` | Synthetic options differ by Country |
| Package Add On | Country-specific `DB - vw_ListPackagHidden*` | Synthetic options differ by Country |
| App Name | Country-specific Sponsor App source | Synthetic options differ by Country |
| Product | `DB - Product_TH` is used for all Countries | One shared synthetic option set for all Countries |
| Account | Country-specific `DB - AccountName_EX_*` / Account-and-Role source | Synthetic options differ by Country |
| Customer Role | Country-specific `DB - Account&Role_EX_*`, filtered by selected Account | Requires `account`; unknown accounts return no options |
| Internal Role | TH, PH, or combined VN/MY/ID Matrix; effective routes use requester-as-Manager then requester-manager fallback, without `Active` | Country/Matrix partition is represented; no browser-supplied identity filter |

The only client-provided dependent lookup confirmed by the export is
`Account -> Customer Role`. Internal Role filtering depends on authenticated-user
Manager evidence in the effective legacy routes and must be designed as a
server-authoritative concern before real integration.

The obsolete mock dependencies below have been removed from form schemas,
contracts, API parsing, and Web state handling:

- Provider Type -> Package
- Package -> App Name
- Package -> Package Add On
- App Name -> Account
- App Name -> Role

Extra legacy synthetic dependency query values do not affect current mock lookup
results. They are not part of `ProductManagementLookupContext`.

## Legacy behavior versus Portal implementation

The source discovery describes observed Power Apps behavior; it does not approve
future Portal policy. Mock data is synthetic and demonstrates shape/dependency
only. It is not a copy of SharePoint or SQL rows and establishes no authoritative
ownership, entitlement, approval, or lifecycle meaning.

Before a real read adapter can be enabled, source ownership, stable keys,
per-topic Provider variants, the shared `Product_TH` intent, allowlisted
projections, and privacy/authorization controls still require technical and
governance verification. PM-03B resolves Matrix candidate policy and the approved
reused-field compatibility semantics, but does not implement their adapter.
Backend SharePoint access, allowlisted projections, limits, credentials/scopes,
sanitized errors, and approved read acceptance also remain unimplemented.

## Preserved safety boundary

No Product Management request submission, production request write, persistence,
`USR_PowerApp` call, Power Automate
change or invocation, SQL mutation, VSTS work-item creation, approval workflow,
provisioning, revocation, or production adapter is implemented. Existing Portal
access-request code remains recoverable behind `VITE_ACCESS_MANAGEMENT_UI=true`;
API authorization, Portal Request Detail, audit, and idempotency behavior are
unchanged.
