# Product Management legacy form contract

## Scope, evidence, and status language

PM-03/PM-03A/PM-03B are offline contract-discovery results. PM-03 and PM-03A
inspected the exported Power Apps and Power Automate packages under the ignored
`reference/legacy-product-management/` boundary. It did not connect to a live
environment, submit a form, trigger or edit a flow, query production, or perform
any write.

PM-03B additionally analyzed the supplied offline `qurey111.csv` historical
submission extract. Only aggregate counts, field-label occurrence, and structural
patterns are retained below. The source file is not committed, and no raw row,
person, email address, Account name, Work ID, SharePoint ID, or other source value
is reproduced. Historical submissions are OBSERVED evidence, not approval of a
schema, Topic, mapping, or multiplicity policy.

The Power Apps export contains 114 `Src/*.pa.yaml` files. `Home.Button1.OnSelect`
contains 67 navigation branches, 66 effective Country/Topic routes, and 65
effective routes for the supported 5 Countries x 13 Topics. Every supported
route resolved to a form and every form has `DataSource=USR_PowerApp`.

- **CONFIRMED** means directly observed in a route, control, DataCard, formula,
  or flow definition.
- **PARTIAL** means the observed implementation is documented but at least one
  business-policy, semantic, or downstream-mapping gap remains.
- Requiredness is based on submit-button guards as well as DataCard metadata.
  Except for hidden `Title`, the observed DataCards say `Required=false`; those
  values alone do not represent the effective form validation.
- `DELIMITED_TEXT` means the label describes a list but the runtime input is one
  free-text control. PM-03A confirmed that `featureList` and `emailList` are
  passed through verbatim: no `Split`, `Concat`, delimiter validation, trimming,
  escaping, normalization, or reordering is applied. The exact legacy contract
  is therefore raw text, not a structured list grammar.

PM-03A initially closed five contracts from source and left eight
policy-dependent contracts open. PM-03B applied all ten explicit owner decisions.
PM-04 then re-inspected the five effective country forms for each of the three
remaining Topics plus the exported Product Management and VSTS update flows. It
technically verifies the exact downstream behavior, including intentional
omission where no destination exists. The registry is now
`13 CONFIRMED / 0 PARTIAL`. Owner decisions are recorded separately in
[Product Management owner decisions](product-management-owner-decisions.md).

No export identifiers, connection identifiers, credentials, raw rows, real user
identifiers, Manager values, or routing addresses are recorded here.

## PM-03B historical submission evidence

The offline extract contains 77 records across 19 distinct `TopicRequest` values.
It contains 53 records for 11 of the 13 current Portal Topics and 24 records for
eight legacy or out-of-contract Topics. No sample was present for `เปลี่ยน
Provider สำหรับ Account(ลูกค้า)` or `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง
Owner Account`. Absence in this bounded historical sample does not prove that a
Topic was unused or removed. The eight historical Topics are not added to the
Portal contract by observation alone.

Labels below are structural tokens recognized at line starts. `consistent` means
all sampled rows for that Topic had the same recognized label sequence. A
`variant` records only the differing labels/counts and does not reproduce values.
“Comma evidence” counts rows whose parsed field value contained a comma followed
by whitespace; it is evidence that multiple-looking text occurred, not a complete
delimiter grammar. Conversely, a zero count never changes a source-confirmed
`MULTIPLE` field to `SINGLE`. A value can contain a newline or a colon that looks
like another field label, so `Detail` remains raw text and consumers must not use
an unrestricted `label: value` line parser.

| Topic | Samples | Label consistency | Multiplicity / raw-text evidence | Contract treatment |
| --- | ---: | --- | --- | --- |
| `Create New Account (ลูกค้าใหม่)` | 5 | consistent: Company Name, Email (ลูกค้า), Providers Type, Package, App Name | App Name comma evidence 0/5 | current CONFIRMED; App remains `MULTIPLE`; PM-04 verifies Add-On as SharePoint-only |
| `เพิ่ม Email เข้า Account(ลูกค้า)` | 5 | variant: Role Name 4/5; Role 1/5 | Role Name comma evidence 1/4; Email comma evidence 0/5 | current CONFIRMED; owner-approved email array; history does not define its grammar |
| `เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)` | 5 | variant: Role Name 4/5 and absent 1/5 | Account comma evidence 1/5; Role Name 0/4; neither establishes field grammar | current CONFIRMED; Role remains `MULTIPLE` |
| `เพิ่ม App เข้า Account(ลูกค้า)` | 5 | variant: Product Name 3/5; Role Name 2/5 | App Name comma evidence 3/5; derived Role/Product label comma evidence in all five rows | current CONFIRMED; corroborates Role-label drift |
| `ขอสิทธิ์เข้า Role(พนักงาน)` | 5 | consistent: Role Internal | Role Internal comma evidence 2/5 | current CONFIRMED; remains `MULTIPLE`; owner-approved Matrix policy applies |
| `เพิ่ม App เข้า Role(พนักงาน)` | 5 | variant: Role 3/5; Role Internal 2/5 | Role/Role Internal comma evidence 1/5; App Name 2/5 | current CONFIRMED; both fields remain `MULTIPLE`; App is required for new Portal requests |
| `เพิ่ม Permission เข้า Role(ลูกค้า)` | 5 | consistent: Account Name, Role Name, List Feature | List Feature has embedded newline evidence 1/5 and comma evidence 0/5 | current CONFIRMED; corroborates PMD-008 raw text |
| `เพิ่ม Package Add On(ลูกค้า)` | 5 | consistent: Account Name, Role Name, Package Add On | Role Name comma evidence 3/5; Add-On 0/5 | current CONFIRMED; both remain `MULTIPLE`; legacy field reuse is owner-approved |
| `Create New Role สำหรับ Account(ลูกค้า)` | 5 | consistent: Account Name, Create Role Name, List Feature | List Feature has embedded newline evidence 1/5 and comma evidence 0/5 | current CONFIRMED; corroborates PMD-010 raw text |
| `เปลี่ยน Provider สำหรับ Account(ลูกค้า)` | 0 | no historical sample | no historical multiplicity evidence | current CONFIRMED from exported source/flow mapping; history remains absent |
| `Tranfer Owner Account(ลูกค้า)` | 5 | consistent: Account Name, Name Provider Type (New), Email | no comma/newline evidence in sampled fields | current CONFIRMED from exported source/flow mapping; PMD-012/013 remain unchanged |
| `ลบ User ใน Account(ลูกค้า)` | 3 | consistent: Account Name, List Email | List Email comma/newline evidence 0/3 | current CONFIRMED; corroborates PMD-014 raw text; not `SINGLE` evidence |
| `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account` | 0 | no historical sample | no historical multiplicity evidence | current CONFIRMED; owner-approved Detail-only Phase 1 representation |
| `Special Caseพนักงาน` | 5 | variant: base labels plus one Agency-like and one Email-like line | Role Name comma evidence 1/5; Detail newline evidence 3/5 | legacy/out-of-contract; colon-like value lines may mimic labels |
| `Special Caseลูกค้า` | 5 | consistent base label sequence | Role Name and Product Name comma evidence 1/5 each; Detail newline evidence 3/5 | legacy/out-of-contract |
| `ขอ Product เข้า Role พนักงาน` | 1 | one observed sequence | Role Internal and Product Name comma evidence 1/1 | legacy/out-of-contract |
| `ขอสิทธิ์ใช้งาน` | 1 | one observed sequence | Role comma evidence 1/1 | legacy/out-of-contract |
| `เพิ่ม Product เข้า Account(ลูกค้า)` | 5 | consistent: Account Name, Product Name | Product Name comma evidence 3/5 | legacy/out-of-contract; matches the non-selectable route candidate only as history |
| `สร้าง Account(ลูกค้า)` | 5 | variant: App Name + Providers Type 4/5; App ID 1/5 | App Name comma evidence 1/4; Product Name 3/5 | legacy/out-of-contract; corroborates App Name/App ID drift |
| `สร้าง Account(ลูกค้า)_Standard` | 1 | one observed sequence | App Name comma evidence 1/1 | legacy/out-of-contract |
| `สร้างAccountลูกค้า_Standard` | 1 | one observed sequence | App Name comma evidence 0/1 | legacy/out-of-contract |

Across the current Topics, historical labels corroborate three important drift
families: `Role` / `Role Name` / `Role Internal`; `เพิ่ม App เข้า Account(ลูกค้า)`
uses either `Role Name` or `Product Name` for its derived role fragment; and older
account-creation history uses either `App Name` or `App ID`. These observations
must not be normalized into a new mapping without an owner decision. In particular,
the latest-five sampling pattern is too small and too value-dependent to override
the multiplicity established by Canvas controls and formulas.

## Route inventory

Forms in each row are ordered TH, PH, VN, MY, ID.

| # | Topic | Effective screen pattern | Forms |
| --- | --- | --- | --- |
| 1 | `Create New Account (ลูกค้าใหม่)` | `{CC}_สร้างAccountลูกค้า` | `Form1`, `Form1_50`, `Form1_56`, `Form1_62`, `Form1_68` |
| 2 | `เพิ่ม Email เข้า Account(ลูกค้า)` | TH base; PH/VN/MY/ID use `_{CC}` suffix | `Form1_1`, `Form1_51`, `Form1_57`, `Form1_63`, `Form1_69` |
| 3 | `เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)` | `{CC}_..._{CC}` | `Form1_103`, `Form1_104`, `Form1_105`, `Form1_106`, `Form1_107` |
| 4 | `เพิ่ม App เข้า Account(ลูกค้า)` | TH base; PH/VN/MY/ID use `_{CC}` suffix | `Form1_4`, `Form1_52`, `Form1_58`, `Form1_64`, `Form1_70` |
| 5 | `ขอสิทธิ์เข้า Role(พนักงาน)` | TH base; PH/VN/MY/ID use `_{CC}` suffix | `Form1_3`, `Form1_54`, `Form1_60`, `Form1_65`, `Form1_72` |
| 6 | `เพิ่ม App เข้า Role(พนักงาน)` | TH base; PH/VN/MY/ID use `_{CC}` suffix | `Form1_5`, `Form1_53`, `Form1_59`, `Form1_66`, `Form1_73` |
| 7 | `เพิ่ม Permission เข้า Role(ลูกค้า)` | TH base; PH/VN/MY/ID use `_{CC}` suffix | `Form1_7`, `Form1_55`, `Form1_61`, `Form1_67`, `Form1_71` |
| 8 | `เพิ่ม Package Add On(ลูกค้า)` | TH base; PH/VN/MY/ID use `_{CC}` suffix | `Form1_11`, `Form1_74`, `Form1_75`, `Form1_76`, `Form1_77` |
| 9 | `Create New Role สำหรับ Account(ลูกค้า)` | `{CC}_Create New Role สำหรับ Account(ลูกค้า)` | `Form1_78` through `Form1_82` |
| 10 | `เปลี่ยน Provider สำหรับ Account(ลูกค้า)` | `{CC}_เปลี่ยน Provider สำหรับ Account(ลูกค้า)` | `Form1_83` through `Form1_87` |
| 11 | `Tranfer Owner Account(ลูกค้า)` | `{CC}_Tranfer Owner Account(ลูกค้า)` | `Form1_88` through `Form1_92` |
| 12 | `ลบ User ใน Account(ลูกค้า)` | `{CC}_ลบ User ใน Account(ลูกค้า)` | `Form1_93` through `Form1_97` |
| 13 | `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account` | Navigate name contains `/`; exported file uses `_` | `Form1_98` through `Form1_102` |

The first Thailand branch for Topic 3 is effective and targets `Form1_103`. A
later duplicate branch targets `Form1_6` and is unreachable under the observed
ordered `If` formula. PM-03A treats the effective `Form1_103` behavior as the
legacy contract and does not treat the stale branch as a supported alternative. A
Thailand-only `เพิ่ม Product เข้า Account(ลูกค้า)` route also exists but is not
selectable from the exported Topic dropdown, so it is not one of the 13 Portal
Topics.

## Common fields, defaults, and Portal handling

These fields occur on all 65 supported forms. `AUTO-FILL + HIDE` means a future
Portal API must derive the value from authenticated/server context and must not
trust a browser-supplied substitute.

| Legacy field | Control / binding | Required | Default or source | Legacy presentation | Expected Portal handling | Downstream use |
| --- | --- | --- | --- | --- | --- | --- |
| `ID_Employee` | disabled `TextInput.Text` | `CONFIRMED_OPTIONAL` at DataCard | current user's display name | visible, locked | `AUTO-FILL + LOCK`; server identity | VSTS description only |
| `Company_` | disabled `TextInput.Text` | `CONFIRMED_OPTIONAL` | fixed legacy organization value | visible, locked | `AUTO-FILL + LOCK`; configuration | SQL `Company` |
| `Department` | disabled `TextInput.Text` | `CONFIRMED_OPTIONAL` | current user's Department | visible, locked | `AUTO-FILL + LOCK`; server directory context | SQL `Department`, VSTS description |
| `Sysytem_` | disabled `TextInput.Text` | `CONFIRMED_OPTIONAL` | `Product Management` | visible, locked | `AUTO-FILL + LOCK` | flow switch, SQL `SystemProgram`, VSTS |
| `Topic_Request` | disabled `TextInput.Text` | `CONFIRMED_OPTIONAL` | exact route Topic | visible, locked | `AUTO-FILL + LOCK` | SQL `Topic`, derived `Detail` |
| `Title` | `TextInput.Text` | `CONFIRMED_REQUIRED` by DataCard | authenticated user's email | hidden | `AUTO-FILL + HIDE`; server identity | SQL `Email_User`, VSTS request email |
| `Country` | single SharePoint Choice `ComboBox.Selected` | `CONFIRMED_OPTIONAL` at DataCard | one fixed Country per screen | hidden | `AUTO-FILL + HIDE` from selected validated route | SQL `Country`, VSTS description |
| `Type_ALL` | `TextInput.Text` | `CONFIRMED_OPTIONAL` | `Product Management` | hidden | `AUTO-FILL + HIDE` | SQL `TypeAll`, VSTS custom field |
| `Sub_Type` | `TextInput.Text` | `CONFIRMED_OPTIONAL` | `Product Management` | hidden | `AUTO-FILL + HIDE` | SQL `SubType`, VSTS custom field |
| `Impact_Case` | `TextInput.Text` | `CONFIRMED_OPTIONAL` | `User Request` | hidden | `AUTO-FILL + HIDE` | SQL `ImpactCase`, VSTS custom field |
| `AssignTo` | `TextInput.Text` | `CONFIRMED_OPTIONAL` | fixed legacy routing address, redacted | hidden | `AUTO-FILL + HIDE`; approved server configuration only | SQL `Assign_To`, VSTS Assigned To |
| `Detail` | topic-specific derived `TextInput.Text` | `CONFIRMED_OPTIONAL` at DataCard | concatenated labels and selected/input values | normally hidden; its topic input is visible on Topics 7 and 9-13 | `AUTO-FILL`; display only the contributing business input | SQL `Detail`, VSTS description |

## Topic field contracts

All listed controls are visible and user-editable unless stated otherwise.
Country-specific lookup aliases are listed in
[source discovery](product-management-source-discovery.md). All values first
write to the named `USR_PowerApp` field through the form DataCard.

### 1. Create New Account (ลูกค้าใหม่) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default / dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `companyName` | `CompanyName(Product)` / Company Name | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | encoded in `Detail`; submit guard permits English letters, digits, and spaces only |
| `customerEmail` | `Emailลูกค้า(Product)` / Email ลูกค้า | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `Email_Customer` and `Detail`; guard rejects more than one `@`, but performs no full email validation |
| `providerType` | `ProviderType(Product)` / Name Provider Type | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | sentinel `Select Providers Type`; hard-coded choices | SQL `EmailProviderType` and `Detail` |
| `package` | `Package(Product)` / Package | `ComboBox.Selected.DisplayName` | `CONFIRMED_REQUIRED` / `SINGLE` | country Package source | encoded in `Detail` only |
| `appName` | `AppName(Product)` / App Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | country App source | SQL `AppName` and `Detail`; each item becomes `[AppID] display`, comma-separated |
| `packageAddOn` | `PackageHid(Product)` / Package Add On | `ComboBox.SelectedItems` | `CONFIRMED_OPTIONAL` / `MULTIPLE` | country hidden-package/Add-On source | exact `" , "` serialization into SharePoint only; intentionally omitted from `Detail`, SQL, approval text, and VSTS |

PMD-001 remains `RESOLVED_BY_OWNER`: the Portal represents a typed multi-value
Add-On and invents no destination. PM-04 verifies the legacy boundary as
`SelectedItems` -> `Concat(DisplayName, " , ")` ->
`USR_PowerApp.PackageHid(Product)` only. The Create Account `Detail` formula omits
the value; the Product Management SQL insert has no `PackageHid` parameter; the
approval payloads and VSTS description consume `Detail`; and the VSTS update flow
only synchronizes status. No inspected downstream consumer reads the field. This
verified omission closes the technical mapping without activating submission.

### 2. เพิ่ม Email เข้า Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default / dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `customerEmail` | `Emailลูกค้า(Product)` / Email ลูกค้า | legacy `TextInput.Text`; Portal validated array | `CONFIRMED_REQUIRED` / `MULTIPLE` | blank | Portal trims and validates each address independently; legacy serialization is adapter-only |
| `providerType` | `ProviderType(Product)` / Name Provider Type | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | SQL `EmailProviderType` and `Detail` |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account source; change resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `RoleName(Product)` / Role Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Account-filtered Role source | SQL `RoleName` and `Detail`; comma-separated role names |

PMD-002 is `RESOLVED_BY_OWNER`: inconsistent historical text is not the canonical
grammar. The Portal contract is a non-empty validated Email array; it trims and
validates each item and rejects duplicate normalized addresses.

### 3. เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า) — CONFIRMED

The employee is the authenticated requester from the common fields; no separate
employee-email input exists on the effective forms.

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; change resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `RoleName(Product)` / Role Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Account-filtered Role | SQL `RoleName` and `Detail`; comma-separated |

The earlier Thailand branch is the effective branch in the ordered `If` and
targets `Form1_103`; the later `Form1_6` branch is unreachable. Preserving the
effective route resolves the contract without treating the stale branch as an
alternative.

### 4. เพิ่ม App เข้า Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency/default | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `appName` | `AppName(Product)` / App Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | country App; not filtered by Account | SQL `AppName` and `Detail`; `[AppID] display`, comma-separated |
| derived only | `Detail` Role Name fragment | hidden `TextInput` | `CONFIRMED_OPTIONAL` / derived lookup | automatically lists every source Role for the selected Account | `Detail` -> SQL `Detail` -> approval/VSTS description |

The exact derived formula is:

```powerfx
With(
  { roles: Filter(<country Account&Role source>, <account column> = <selected Account>) },
  If(IsEmpty(roles), "", Left(
    Concat(roles, AccountRoleName & ", "),
    Len(Concat(roles, AccountRoleName & ", ")) - 2
  ))
)
```

It emits every filtered `AccountRoleName` with `", "`, removes only the final
delimiter, returns `""` for no rows, and performs no sort, deduplication,
escaping, or normalization. Filter result order is preserved. The fragment is
appended after `Role Name : ` in `Detail`; the Flow copies `Detail` unchanged to
SQL and the VSTS description.

### 5. ขอสิทธิ์เข้า Role(พนักงาน) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `internalRole` | `RoleInternal(Product)` / Role Internal | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | TH, PH, or shared VN/MY/ID Matrix; effective routes use Manager fallback logic | SQL `RoleInternal` and `Detail`; exact delimiter `", "` |

Portal lookup resolution is server-authoritative. PMD-005/PMD-006 are
`RESOLVED_BY_OWNER`: Matrix is candidate metadata only; eligible candidates require
`Active=true`; unknown Active fails closed; unusable Manager is `UNRESOLVED`;
duplicate Role names require stable identity or fail closed; deterministic display
order never implies approval priority. Legacy behavior remains recorded separately.

### 6. เพิ่ม App เข้า Role(พนักงาน) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `internalRole` | `RoleInternal(Product)` / Role Internal | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | effective Manager-fallback Matrix | SQL `RoleInternal` and `Detail`; exact delimiter `", "` |
| `appName` | `AppName(Product)` / App Name | `ComboBox.SelectedItems` | Portal `CONFIRMED_REQUIRED` / `MULTIPLE`; legacy guard was optional | country App | SQL `AppName` and `Detail`; `[AppID] display`, comma-separated at compatibility boundary |

Every observed legacy submit guard requires only Internal Role. PMD-007 is
`RESOLVED_BY_OWNER`: new Portal requests require at least one valid stable App
identity. PMD-005/PMD-006 apply the approved Matrix policy from Topic 5.

### 7. เพิ่ม Permission เข้า Role(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `RoleName(Product)` / Role Name | `ComboBox.Selected.AccountRoleName` | `CONFIRMED_REQUIRED` / `SINGLE` | Account-filtered Role | SQL `RoleName` and `Detail` |
| `featureList` | unbound List Feature control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Feature : ` in `Detail` -> SQL/VSTS |

The submit guard rejects `IsBlank(TextInput.Text)`. Otherwise the value is
preserved exactly; there is no list delimiter or item grammar enforced by the
Canvas app or Product Management Flow.

### 8. เพิ่ม Package Add On(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `ProductName(Product)` / Role Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Account-filtered Role | **reuses** `ProductName(Product)` -> SQL `ProductName`; comma-separated and in `Detail` |
| `packageAddOn` | `AppName(Product)` / Package Add On | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | country Add-On source | **reuses** `AppName(Product)` -> SQL `AppName`; comma-separated and in `Detail` |

PMD-009 is `RESOLVED_BY_OWNER` with `LEGACY COMPATIBILITY FIRST`: Phase 1 preserves
Customer Role -> `ProductName(Product)` and Package Add-On -> `AppName(Product)`.
These are overloaded legacy fields, not Portal-native semantics.

### 9. Create New Role สำหรับ Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `newRole` | `RoleName(Product)` / Create Role Name | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `RoleName` and `Detail` |
| `featureList` | unbound List Feature control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Feature : ` in `Detail` -> SQL/VSTS |

`featureList` was missing from the earlier Portal registry and is now included.
The same raw-text passthrough rule as Topic 7 is confirmed.

### 10. เปลี่ยน Provider สำหรับ Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Provider | SQL `AccountName` and `Detail` |
| `providerType` | `RoleName(Product)` / Name Provider Type (New) | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | **reuses** `RoleName(Product)` -> SQL `RoleName`; also in `Detail` |
| `emailList` | unbound List Email control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Email : ` in `Detail` -> SQL/VSTS |

`emailList` was missing from the earlier Portal registry and is now included.
Email serialization is `CONFIRMED` raw-text passthrough. PMD-011 is
`RESOLVED_BY_OWNER` and approves Provider via `RoleName(Product)` for Phase 1.
PM-04 verifies all five country copies and the exported Flow: the dropdown value
is written to `USR_PowerApp.RoleName(Product)`, copied directly and unchanged to
SQL `RoleName`, and independently included under `Name Provider Type (New)` in
`Detail`. Approval text and the VSTS description consume that `Detail`; no typed
Provider VSTS field or overriding transformation exists.

### 11. Tranfer Owner Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Provider | SQL `AccountName` and `Detail` |
| `providerType` | `RoleName(Product)` / Name Provider Type (New) | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | **reuses** `RoleName(Product)` -> SQL `RoleName`; also in `Detail` |
| `customerEmail` | unbound Email ลูกค้า control, persisted through `Detail` | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `Detail`, VSTS description; no exported email-format validation |

PMD-012/PMD-013 are `RESOLVED_BY_OWNER`: Phase 1 preserves Provider via
`RoleName(Product)` and retains `Email ลูกค้า` / Customer Email semantics. The
Email never proves identity or Account ownership and is not renamed to
`newOwnerEmail`. PM-04 verifies Provider as
`RoleName(Product)` -> SQL `RoleName`, unchanged, with the same provider value also
present in `Detail`. The customer Email control is not bound to
`Emailลูกค้า(Product)` or another dedicated SharePoint field: its raw text is
embedded only after `Email : ` in `Detail`, then copied unchanged to SQL `Detail`,
approval text, and the VSTS description. It is not mapped to SQL
`Email_Customer`. No downstream reinterpretation or overriding field was found.

### 12. ลบ User ใน Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `emailList` | unbound List Email control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Email : ` in `Detail` -> SQL/VSTS |

The submit guard rejects blank input; otherwise whitespace, ordering, punctuation,
and any user-entered delimiter are preserved exactly.

### 13. ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets setting | SQL `AccountName` and `Detail` |
| `notificationSetting` | unbound Send Email BCC to Owner Account control | `DropDown.Selected.Value` through hidden `TextInput` | `CONFIRMED_REQUIRED` / `SINGLE` | selection sentinel; choices `เปิด`, `ปิด` | encoded in SQL `Detail` and VSTS description only |

PMD-015 is `RESOLVED_BY_OWNER` with `LEGACY COMPATIBILITY FIRST`: Phase 1 retains
the observed Detail-only representation and introduces no typed destination or
automatic execution. A Portal-native notification model is future work.

## Serialization and Detail grammar

| Value | Source/input | Exact runtime rule | Delimiter/order | Empty/whitespace/escaping | Destination and consumer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Create Account customer email | one `TextInput` | raw `.Text`; `Split(text,"@")` is used only to reject more than one `@` | none; as entered | required; otherwise preserved; no escaping | `Emailลูกค้า(Product)` -> SQL `Email_Customer`; also `Detail` -> approval/VSTS | **CONFIRMED** |
| Add Email customer email | Portal Email array; legacy one `TextInput` | Portal trims and validates each item; legacy raw `.Text` is compatibility-only | canonical array; adapter grammar separately verified | at least one valid non-duplicate normalized address | legacy typed SQL field and `Detail` consumer through adapter | **CONFIRMED** owner-approved Portal contract |
| Customer/internal Roles | multi-select `SelectedItems` | `Concat(..., AccountRoleName/RoleName, ", ")` | exact `", "`; selected-items order | empty yields `""`; no trim/dedup/escape | typed SharePoint/SQL column plus `Detail` -> approval/VSTS | **CONFIRMED** |
| App | multi-select `SelectedItems` | `Concat(..., "[ " & AppID & " ] " & display, " , ")` | exact `" , "`; selected-items order | empty yields `""`; no trim/dedup/escape | `AppName(Product)` -> SQL `AppName`; `Detail` -> approval/VSTS | **CONFIRMED** |
| Package Add On | multi-select `SelectedItems` | `Concat(..., DisplayName, " , ")` | exact `" , "`; selected-items order | empty yields `""`; no trim/dedup/escape | Topic 1: `PackageHid(Product)` in SharePoint only, intentionally omitted downstream; Topic 8: reused `AppName(Product)` -> SQL `AppName` and `Detail` | **CONFIRMED** serialization and Topic-specific destination |
| all-Roles fragment | derived `Filter` result | `Concat(role & ", ")`, then `Left(..., Len(...)-2)` | exact `", "`; filter-result order | no rows -> `""`; no sort/dedup/escape | `Detail` -> SQL `Detail` -> approval/VSTS | **CONFIRMED** |
| `featureList` / `emailList` | one `TextInput` | raw `.Text` appended after its label; no parser | none enforced; as entered | blank rejected; all other whitespace/punctuation preserved; no escaping | `Detail` -> SQL `Detail` -> approval/VSTS | **CONFIRMED** raw-text contract |
| Transfer Owner email | one `TextInput` | raw `.Text` appended after `Email : ` | none; as entered | blank rejected; no email validation/normalization | `Detail` -> SQL `Detail` -> approval/VSTS; not SQL `Email_Customer` | **CONFIRMED** Customer Email compatibility semantics and downstream destination |
| Notification choice | one dropdown | selected `เปิด`/`ปิด` copied through hidden text into `Detail` | single value | sentinel rejected | `Detail` -> SQL/VSTS only | **CONFIRMED** owner-approved Detail-only Phase 1 transport |

Every topic `Detail` formula concatenates fixed labels and control values. The
Canvas formulas provide no escaping for embedded line breaks or label-like text,
and the Flow performs no `split`, `join`, `replace`, `trim`, or case normalization
on Product Management business values. SQL receives `Detail` unchanged and VSTS
embeds it unchanged inside the work-item description HTML.

## Reused legacy fields

| Topic/business meaning | Legacy field | Flow and SQL | VSTS usage | Evidence classification | Owner gate |
| --- | --- | --- | --- | --- | --- |
| Topic 8 Customer Role | `ProductName(Product)` | direct `Get_item` -> SQL `ProductName` | human-readable `Role Name` in `Detail`; no typed role custom field | `LEGACY_STORAGE_CONFIRMED`; `BUSINESS_MEANING_CONFIRMED`; `DOWNSTREAM_USAGE_CONFIRMED` | PMD-009 `RESOLVED_BY_OWNER`; preserve mapping |
| Topic 8 Package Add On | `AppName(Product)` | direct `Get_item` -> SQL `AppName` | human-readable `Package Add On` in `Detail`; no typed Add-On custom field | same three statuses confirmed | PMD-009 `RESOLVED_BY_OWNER`; preserve mapping |
| Topic 10 New Provider | `RoleName(Product)` | direct unchanged `Get_item` -> SQL `RoleName` | same Provider value under `Name Provider Type (New)` in `Detail`; no typed Provider custom field | same three statuses confirmed by PM-04; no override found | PMD-011 `RESOLVED_BY_OWNER`; preserve mapping |
| Topic 11 New Provider | `RoleName(Product)` | direct unchanged `Get_item` -> SQL `RoleName` | same Provider value under `Name Provider Type (New)` in `Detail`; no typed Provider custom field | same three statuses confirmed by PM-04; no override found | PMD-012 `RESOLVED_BY_OWNER`; preserve mapping |

The visible labels, lookup/choice sources, DataCard updates, `Detail` labels, Flow
parameters, SQL destinations, and VSTS description jointly establish storage,
business meaning, and downstream usage. The owner now approves preserving these
overloaded Phase 1 compatibility mappings. They remain adapter-bound legacy
semantics and do not rename the Portal domain.

## Internal Role Matrix behavior

The routed TH forms use `DB - MatrixProductManagement_TH`, PH uses
`DB - MatrixProductManagement_PH`, and VN/MY/ID use
`DB - MatrixProductManagement_VN_MY_ID`. All ten effective forms for Topics 5
and 6 use this shape:

```powerfx
If(
  CountRows(Filter(<matrix>, User().Email = Manager)) > 0,
  Filter(<matrix>, User().Email = Manager),
  Filter(<matrix>, Manager = Lower(Office365Users.ManagerV2(User().Email).mail))
)
```

- `Active` is never referenced by an effective `Items` formula.
- `Department` is never referenced by an effective `Items` formula. Older
  non-routed screen copies use `Department = Office365Users.MyProfile().Department`.
- Manager and Department are not ORed or ANDed. The effective code first returns
  rows where the requester is the Matrix `Manager`; only when that count is zero
  does it return rows for the requester's directory manager.
- There is no explicit guard for a blank/error directory Manager result. The
  exported formula does not establish whether blank Matrix Manager rows can be
  surfaced or how connector failure is handled.
- No `Sort` or `Distinct` is applied. Duplicate `RoleName` rows and source filter
  order are preserved; selected values are stored with `Concat(..., ", ")`.
- The Matrix controls dropdown candidate visibility. The selected labels then
  flow to `RoleInternal(Product)` and SQL `RoleInternal`; the code does not prove
  that Matrix membership is entitlement authority or approval authority.

Technical legacy behavior is **CONFIRMED**. The implemented owner-approved Portal
contract treats Matrix as candidate metadata only, requires `Active=true`, fails
closed for unknown Active, marks unusable Manager `UNRESOLVED`, requires a stable
key to distinguish duplicate `RoleName`, and uses deterministic display ordering
without approval-priority meaning. Browser-supplied authority metadata is never
trusted.

## Country differences

The user-visible shape, effective required guards, and destination fields are the
same across the five country copies except for the explicit anomalies below.

| Area | Confirmed difference |
| --- | --- |
| Lookup partitions | Package, Add-On, App, Account, customer Role, and internal Role use Country-specific aliases. VN/MY/ID share the internal Role Matrix. |
| Account display column | Most copies use `AccountName`; Malaysia uses exported `AcountName`; some Account-and-Role filters use `Title`/localized exported aliases. These are source bindings, not different Portal fields. |
| App display column | Thailand uses `AppNames`, PH/MY/ID use `AppName`, and Vietnam uses exported `Title`; the stored transform remains `[AppID] display`. |
| Internal Role display column | Thailand uses `RoleName`; copied screens expose `Rolename` variants. |
| Vietnam Create Account Add-On search | The exported Add-On formula references the App control's `SearchText` instead of its own control; intent is not inferred. |
| Thailand employee-email route | Two branches exist; the earlier `Form1_103` branch is effective and `Form1_6` is unreachable. |
| Screen names | Thailand often omits a trailing `_TH`; notification screen Navigate names contain `/` while exported filenames use `_`. |

## Submission trace and mapping matrix

| Stage | Observed mapping | Status |
| --- | --- | --- |
| Canvas | Submit guards -> `SubmitForm(Form*)` -> `USR_PowerApp` DataCards | **CONFIRMED** for all 65 effective supported forms |
| Flow trigger | new SharePoint item -> `Get_item` -> `System` switch case `Product Management` | **CONFIRMED** |
| SQL insert | `ID`, author/requester, Company, Department, System, Topic, Country, Type/SubType/Impact, routing, App/Product/Account/customer Role/internal Role/customer Email/Provider and `Detail` -> `dbo.UserRequest_ProductManagement` | **CONFIRMED** for the explicitly mapped columns |
| Manager approval | approval result/date -> SharePoint and SQL manager status/date | **CONFIRMED** |
| Work item | `Create_a_work_item_3` creates `IT Support Case`; SharePoint ID correlates it; description contains requester context and `Detail` | **CONFIRMED** |
| Work ID/open status | work item ID -> SharePoint `Work_ID` and SQL `WorkID`; open/status fields updated | **CONFIRMED** |
| IT Manager acknowledgement | result/date -> SharePoint and SQL IT Manager status/date | **CONFIRMED** |
| VSTS status sync | `Custom_IDSharepoint` selects SharePoint item; `System_State` -> `StatusVSTS` | **CONFIRMED** |
| `PackageHid(Product)` | exact multi-value text is stored in SharePoint; it is absent from Create Account `Detail`, the SQL insert parameter set, approval payloads, and VSTS fields; no inspected downstream action consumes it | **CONFIRMED SharePoint-only / downstream omission** |
| Reused field semantics | observed storage/transport and owner-approved Phase 1 compatibility mappings are explicit; PM-04 verifies Topic 10/11 direct SQL and `Detail` paths | **CONFIRMED policy and technical mapping** |

Phase 1 Product Management approval remains exclusively in the existing Legacy
Power Automate / Microsoft Teams workflow. Portal Product Management approval is
disabled; double approval is prohibited. This records contract architecture only
and does not register or invoke the legacy workflow. Migration to Portal approval
is a separately authorized future milestone.

`CompanyName(Product)`, `Package(Product)`, free-text feature/email values, and
notification selection have no dedicated Product Management SQL columns in the
inspected insert action; their downstream representation depends on the derived
`Detail`. `AppName(Product)`, `ProductName(Product)`, `AccountName(Product)`,
`RoleName(Product)`, `RoleInternal(Product)`, `Emailลูกค้า(Product)`, and
`ProviderType(Product)` have direct SQL mappings. VSTS receives topic-specific
business content through `Detail`, not through corresponding typed custom fields.

## PM-04 downstream compatibility verification

PM-04 used only the committed offline packages. It checked the effective TH, PH,
VN, MY, and ID forms for each Topic, the Product Management branch of the exported
User Request flow, and the exported VSTS status-update flow. No Production system
was accessed.

| Topic/value | Verified source and exact shape | Verified destination | Transform or omission | Contradiction / blocker |
| --- | --- | --- | --- | --- |
| Create Account Package Add-On | `ComboBox.SelectedItems`; `Concat(DisplayName, " , ")` writes optional text to `USR_PowerApp.PackageHid(Product)` | SharePoint field only | selected-item order; exact `" , "` separator; empty becomes `""`; omitted from Create Account `Detail`, SQL insert, approvals, and VSTS | none; absence is the verified compatibility behavior, not an invented destination |
| Change Provider New Provider | `DropDown.Selected.Value` -> hidden text -> `USR_PowerApp.RoleName(Product)` | direct unchanged SQL `RoleName`; same value also appears under `Name Provider Type (New)` in `Detail` -> approval/VSTS description | no trim, replacement, reinterpretation, or overriding typed Provider field | none |
| Transfer Owner Provider | `DropDown.Selected.Value` -> hidden text -> `USR_PowerApp.RoleName(Product)` | direct unchanged SQL `RoleName`; same value also appears in `Detail` -> approval/VSTS description | no transform or override | none |
| Transfer Owner Customer Email | one required `TextInput.Text`, unbound to a dedicated SharePoint Email DataCard, appended after `Email : ` | `USR_PowerApp.Detail` -> SQL `Detail` -> approval/VSTS description | raw as entered; blank rejected; no email normalization; not SQL `Email_Customer` | none; the value establishes no identity or ownership authority |

The Flow's later SQL actions update status/correlation fields and do not reference
`PackageHid`, `RoleName`, `Email_Customer`, or `Detail`; the VSTS update flow maps
only work-item status back to SharePoint. No contradictory downstream
transformation was found in the available source evidence.

## Registry result and safety gate

PM-05 implements the confirmed mapping as a typed internal compatibility
serializer and fail-closed payload validator. Synthetic fixtures cover every
Topic and assert the exact typed destination, `Detail` text, delimiter, raw-text
passthrough, and omission behavior described above. The sanitized preview remains
service/test-only and reports `submissionAllowed=false` and
`adapterEnabled=false`; no API, UI, real adapter, or Production connection is
registered. See
[Product Management runtime readiness](product-management-runtime-readiness.md).

The API schema registry now records observed requiredness, multiplicity, legacy
field/label/control/binding/default/visibility, lookup source, Portal handling,
submit destination, transformation, serialization, reused-field evidence, Matrix
behavior, and per-Topic `partialReasons`.

- `13 CONFIRMED / 0 PARTIAL` after PM-04 technical downstream verification; the
  ten `RESOLVED_BY_OWNER` decisions are unchanged.
- All Product Management submission also remains explicitly disabled, including
  all 13 `CONFIRMED` schemas; contract status does not activate submission.
- `PRODUCT_MANAGEMENT_DATA_SOURCE=real` remains fail-closed.
- No production adapter, production write, Power Automate change, USR_PowerApp
  write, SQL write, VSTS write, approval execution, provisioning, or revocation
  was added.

### Final contract status by Topic

| Topic | Status | Machine-readable reason | Closure or exact remaining decision |
| --- | --- | --- | --- |
| Create New Account | CONFIRMED | none | PMD-001 unchanged; PM-04 verifies exact `PackageHid(Product)` serialization and intentional SharePoint-only destination |
| เพิ่ม Email เข้า Account | CONFIRMED | none | PMD-002 approved validated Email array and adapter-only legacy serialization |
| เพิ่ม Email(พนักงาน) เข้า Account | CONFIRMED | none | effective `Form1_103` route resolved from ordered `If`; stale `Form1_6` is unreachable |
| เพิ่ม App เข้า Account | CONFIRMED | none | exact all-Roles formula, delimiter, empty behavior, and downstream `Detail` use resolved |
| ขอสิทธิ์เข้า Role(พนักงาน) | CONFIRMED | none | PMD-005/006 approve candidate-only Matrix and fail-closed Portal policy |
| เพิ่ม App เข้า Role(พนักงาน) | CONFIRMED | none | PMD-005/006 plus PMD-007 require at least one valid App |
| เพิ่ม Permission เข้า Role(ลูกค้า) | CONFIRMED | none | raw `featureList` passthrough is the exact legacy contract |
| เพิ่ม Package Add On(ลูกค้า) | CONFIRMED | none | PMD-009 approves Role-via-Product and Add-On-via-App Phase 1 compatibility |
| Create New Role สำหรับ Account(ลูกค้า) | CONFIRMED | none | raw `featureList` passthrough is the exact legacy contract |
| เปลี่ยน Provider สำหรับ Account(ลูกค้า) | CONFIRMED | none | PMD-011 unchanged; PM-04 verifies Provider -> `RoleName(Product)` -> SQL `RoleName` plus `Detail`/VSTS with no override |
| Tranfer Owner Account(ลูกค้า) | CONFIRMED | none | PMD-012/013 unchanged; PM-04 verifies Provider through `RoleName(Product)`/SQL `RoleName` and Customer Email through `Detail` only |
| ลบ User ใน Account(ลูกค้า) | CONFIRMED | none | raw `emailList` passthrough is the exact legacy contract |
| ขอเปิด/ปิดแจ้งเตือน... | CONFIRMED | none | PMD-015 approves Phase 1 Detail-only compatibility; no runtime activation |

All ten owner decisions remain `RESOLVED_BY_OWNER`; PM-04 changes no policy. All
13 contracts are technically `CONFIRMED`, but this is contract evidence only.
Real read/write integration and submission activation require separate
authorization and remain disabled/not implemented.
