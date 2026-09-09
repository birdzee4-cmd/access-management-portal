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

PM-03A closes five contracts from source and leaves eight policy-dependent
contracts open. Owner decisions are isolated in
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
| `Create New Account (ลูกค้าใหม่)` | 5 | consistent: Company Name, Email (ลูกค้า), Providers Type, Package, App Name | App Name comma evidence 0/5 | current PARTIAL; App remains `MULTIPLE` |
| `เพิ่ม Email เข้า Account(ลูกค้า)` | 5 | variant: Role Name 4/5; Role 1/5 | Role Name comma evidence 1/4; Email comma evidence 0/5 | current PARTIAL; email multiplicity remains UNKNOWN |
| `เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)` | 5 | variant: Role Name 4/5 and absent 1/5 | Account comma evidence 1/5; Role Name 0/4; neither establishes field grammar | current CONFIRMED; Role remains `MULTIPLE` |
| `เพิ่ม App เข้า Account(ลูกค้า)` | 5 | variant: Product Name 3/5; Role Name 2/5 | App Name comma evidence 3/5; derived Role/Product label comma evidence in all five rows | current CONFIRMED; corroborates Role-label drift |
| `ขอสิทธิ์เข้า Role(พนักงาน)` | 5 | consistent: Role Internal | Role Internal comma evidence 2/5 | current PARTIAL; remains `MULTIPLE` |
| `เพิ่ม App เข้า Role(พนักงาน)` | 5 | variant: Role 3/5; Role Internal 2/5 | Role/Role Internal comma evidence 1/5; App Name 2/5 | current PARTIAL; both fields remain `MULTIPLE` |
| `เพิ่ม Permission เข้า Role(ลูกค้า)` | 5 | consistent: Account Name, Role Name, List Feature | List Feature has embedded newline evidence 1/5 and comma evidence 0/5 | current CONFIRMED; corroborates PMD-008 raw text |
| `เพิ่ม Package Add On(ลูกค้า)` | 5 | consistent: Account Name, Role Name, Package Add On | Role Name comma evidence 3/5; Add-On 0/5 | current PARTIAL; both remain `MULTIPLE` |
| `Create New Role สำหรับ Account(ลูกค้า)` | 5 | consistent: Account Name, Create Role Name, List Feature | List Feature has embedded newline evidence 1/5 and comma evidence 0/5 | current CONFIRMED; corroborates PMD-010 raw text |
| `เปลี่ยน Provider สำหรับ Account(ลูกค้า)` | 0 | no historical sample | no historical multiplicity evidence | current PARTIAL; PMD-011 remains OPEN |
| `Tranfer Owner Account(ลูกค้า)` | 5 | consistent: Account Name, Name Provider Type (New), Email | no comma/newline evidence in sampled fields | current PARTIAL; does not resolve email semantics |
| `ลบ User ใน Account(ลูกค้า)` | 3 | consistent: Account Name, List Email | List Email comma/newline evidence 0/3 | current CONFIRMED; corroborates PMD-014 raw text; not `SINGLE` evidence |
| `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account` | 0 | no historical sample | no historical multiplicity evidence | current PARTIAL; PMD-015 remains OPEN |
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

### 1. Create New Account (ลูกค้าใหม่) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default / dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `companyName` | `CompanyName(Product)` / Company Name | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | encoded in `Detail`; submit guard permits English letters, digits, and spaces only |
| `customerEmail` | `Emailลูกค้า(Product)` / Email ลูกค้า | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `Email_Customer` and `Detail`; guard rejects more than one `@`, but performs no full email validation |
| `providerType` | `ProviderType(Product)` / Name Provider Type | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | sentinel `Select Providers Type`; hard-coded choices | SQL `EmailProviderType` and `Detail` |
| `package` | `Package(Product)` / Package | `ComboBox.Selected.DisplayName` | `CONFIRMED_REQUIRED` / `SINGLE` | country Package source | encoded in `Detail` only |
| `appName` | `AppName(Product)` / App Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | country App source | SQL `AppName` and `Detail`; each item becomes `[AppID] display`, comma-separated |
| `packageAddOn` | `PackageHid(Product)` / Package Add On | `ComboBox.SelectedItems` | `CONFIRMED_OPTIONAL` / `MULTIPLE` | country hidden-package/Add-On source | comma-separated in SharePoint; no SQL or VSTS mapping was found |

Remaining reason: `UNKNOWN_SUBMISSION_MAPPING` for `PackageHid(Product)`.

### 2. เพิ่ม Email เข้า Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default / dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `customerEmail` | `Emailลูกค้า(Product)` / Email ลูกค้า | `TextInput.Text` | `CONFIRMED_REQUIRED` / `UNKNOWN` | blank | SQL `Email_Customer` and `Detail`; accepted list/single-value grammar is not established |
| `providerType` | `ProviderType(Product)` / Name Provider Type | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | SQL `EmailProviderType` and `Detail` |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account source; change resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `RoleName(Product)` / Role Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Account-filtered Role source | SQL `RoleName` and `Detail`; comma-separated role names |

Remaining reason: `UNKNOWN_MULTIPLICITY` for the free-text customer email value.

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

### 5. ขอสิทธิ์เข้า Role(พนักงาน) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `internalRole` | `RoleInternal(Product)` / Role Internal | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | TH, PH, or shared VN/MY/ID Matrix; effective routes use Manager fallback logic | SQL `RoleInternal` and `Detail`; exact delimiter `", "` |

Expected Portal handling is `ALLOW EDIT`, but lookup resolution must be
server-authoritative. Remaining reason: `UNKNOWN_LOOKUP_AUTHORITY`; owner-approved
Matrix authority, `Active`, blank/error fallback, and duplicate policy are not
established. The observed effective logic is detailed under Matrix policy below.

### 6. เพิ่ม App เข้า Role(พนักงาน) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `internalRole` | `RoleInternal(Product)` / Role Internal | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | effective Manager-fallback Matrix | SQL `RoleInternal` and `Detail`; exact delimiter `", "` |
| `appName` | `AppName(Product)` / App Name | `ComboBox.SelectedItems` | `CONFIRMED_OPTIONAL` / `MULTIPLE` in observed guard | country App | SQL `AppName` and `Detail`; `[AppID] display`, comma-separated |

The Topic is semantically “add App”, but every observed submit guard requires
only Internal Role and permits no App. Remaining reasons:
`UNKNOWN_LOOKUP_AUTHORITY` and `LEGACY_REQUIREDNESS_ANOMALY`.

### 7. เพิ่ม Permission เข้า Role(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `RoleName(Product)` / Role Name | `ComboBox.Selected.AccountRoleName` | `CONFIRMED_REQUIRED` / `SINGLE` | Account-filtered Role | SQL `RoleName` and `Detail` |
| `featureList` | unbound List Feature control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Feature : ` in `Detail` -> SQL/VSTS |

The submit guard rejects `IsBlank(TextInput.Text)`. Otherwise the value is
preserved exactly; there is no list delimiter or item grammar enforced by the
Canvas app or Product Management Flow.

### 8. เพิ่ม Package Add On(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `ProductName(Product)` / Role Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Account-filtered Role | **reuses** `ProductName(Product)` -> SQL `ProductName`; comma-separated and in `Detail` |
| `packageAddOn` | `AppName(Product)` / Package Add On | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | country Add-On source | **reuses** `AppName(Product)` -> SQL `AppName`; comma-separated and in `Detail` |

Remaining reason: `UNAPPROVED_LEGACY_FIELD_REUSE`.

### 9. Create New Role สำหรับ Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `newRole` | `RoleName(Product)` / Create Role Name | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `RoleName` and `Detail` |
| `featureList` | unbound List Feature control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Feature : ` in `Detail` -> SQL/VSTS |

`featureList` was missing from the earlier Portal registry and is now included.
The same raw-text passthrough rule as Topic 7 is confirmed.

### 10. เปลี่ยน Provider สำหรับ Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Provider | SQL `AccountName` and `Detail` |
| `providerType` | `RoleName(Product)` / Name Provider Type (New) | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | **reuses** `RoleName(Product)` -> SQL `RoleName`; also in `Detail` |
| `emailList` | unbound List Email control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Email : ` in `Detail` -> SQL/VSTS |

`emailList` was missing from the earlier Portal registry and is now included.
Email serialization is `CONFIRMED` raw-text passthrough. Remaining reason:
`UNAPPROVED_LEGACY_FIELD_REUSE` for Provider via `RoleName(Product)`.

### 11. Tranfer Owner Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Provider | SQL `AccountName` and `Detail` |
| `providerType` | `RoleName(Product)` / Name Provider Type (New) | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | **reuses** `RoleName(Product)` -> SQL `RoleName`; also in `Detail` |
| `customerEmail` | unbound Email ลูกค้า control, persisted through `Detail` | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `Detail`, VSTS description; no exported email-format validation |

Remaining reasons: `UNAPPROVED_LEGACY_FIELD_REUSE` and
`UNKNOWN_TARGET_EMAIL_SEMANTICS`; the code does not establish whether the email
means the future owner, an existing owner, a notification recipient, or another
customer contact.

### 12. ลบ User ใน Account(ลูกค้า) — CONFIRMED

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `emailList` | unbound List Email control, persisted through `Detail` | one `TextInput.Text` | `CONFIRMED_REQUIRED` / raw text | blank | appended unchanged after `List Email : ` in `Detail` -> SQL/VSTS |

The submit guard rejects blank input; otherwise whitespace, ordering, punctuation,
and any user-entered delimiter are preserved exactly.

### 13. ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets setting | SQL `AccountName` and `Detail` |
| `notificationSetting` | unbound Send Email BCC to Owner Account control | `DropDown.Selected.Value` through hidden `TextInput` | `CONFIRMED_REQUIRED` / `SINGLE` | selection sentinel; choices `เปิด`, `ปิด` | encoded in SQL `Detail` and VSTS description only |

Remaining reason: `UNKNOWN_SUBMISSION_MAPPING`; the setting has no dedicated
SharePoint/SQL/VSTS status field in the inspected branch.

## Serialization and Detail grammar

| Value | Source/input | Exact runtime rule | Delimiter/order | Empty/whitespace/escaping | Destination and consumer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Create Account customer email | one `TextInput` | raw `.Text`; `Split(text,"@")` is used only to reject more than one `@` | none; as entered | required; otherwise preserved; no escaping | `Emailลูกค้า(Product)` -> SQL `Email_Customer`; also `Detail` -> approval/VSTS | **CONFIRMED** |
| Add Email customer email | one `TextInput` | raw `.Text`; no `Split`, `Concat`, validation, or normalization | no enforced delimiter; as entered | required; otherwise preserved | same typed SQL field and `Detail` consumer | **PARTIAL**: business multiplicity is not stated |
| Customer/internal Roles | multi-select `SelectedItems` | `Concat(..., AccountRoleName/RoleName, ", ")` | exact `", "`; selected-items order | empty yields `""`; no trim/dedup/escape | typed SharePoint/SQL column plus `Detail` -> approval/VSTS | **CONFIRMED** |
| App | multi-select `SelectedItems` | `Concat(..., "[ " & AppID & " ] " & display, " , ")` | exact `" , "`; selected-items order | empty yields `""`; no trim/dedup/escape | `AppName(Product)` -> SQL `AppName`; `Detail` -> approval/VSTS | **CONFIRMED** |
| Package Add On | multi-select `SelectedItems` | `Concat(..., DisplayName, " , ")` | exact `" , "`; selected-items order | empty yields `""`; no trim/dedup/escape | Topic 1: SharePoint only; Topic 8: reused `AppName(Product)` -> SQL `AppName` and `Detail` | **CONFIRMED** serialization; downstream policy remains partial |
| all-Roles fragment | derived `Filter` result | `Concat(role & ", ")`, then `Left(..., Len(...)-2)` | exact `", "`; filter-result order | no rows -> `""`; no sort/dedup/escape | `Detail` -> SQL `Detail` -> approval/VSTS | **CONFIRMED** |
| `featureList` / `emailList` | one `TextInput` | raw `.Text` appended after its label; no parser | none enforced; as entered | blank rejected; all other whitespace/punctuation preserved; no escaping | `Detail` -> SQL `Detail` -> approval/VSTS | **CONFIRMED** raw-text contract |
| Transfer Owner email | one `TextInput` | raw `.Text` appended after `Email : ` | none; as entered | blank rejected; no email validation/normalization | `Detail` -> SQL/VSTS | **CONFIRMED** serialization; meaning remains partial |
| Notification choice | one dropdown | selected `เปิด`/`ปิด` copied through hidden text into `Detail` | single value | sentinel rejected | `Detail` -> SQL/VSTS only | **CONFIRMED** transport; typed destination policy remains partial |

Every topic `Detail` formula concatenates fixed labels and control values. The
Canvas formulas provide no escaping for embedded line breaks or label-like text,
and the Flow performs no `split`, `join`, `replace`, `trim`, or case normalization
on Product Management business values. SQL receives `Detail` unchanged and VSTS
embeds it unchanged inside the work-item description HTML.

## Reused legacy fields

| Topic/business meaning | Legacy field | Flow and SQL | VSTS usage | Evidence classification | Owner gate |
| --- | --- | --- | --- | --- | --- |
| Topic 8 Customer Role | `ProductName(Product)` | direct `Get_item` -> SQL `ProductName` | human-readable `Role Name` in `Detail`; no typed role custom field | `LEGACY_STORAGE_CONFIRMED`; `BUSINESS_MEANING_CONFIRMED`; `DOWNSTREAM_USAGE_CONFIRMED` | confirm compatibility mapping |
| Topic 8 Package Add On | `AppName(Product)` | direct `Get_item` -> SQL `AppName` | human-readable `Package Add On` in `Detail`; no typed Add-On custom field | same three statuses confirmed | confirm compatibility mapping |
| Topic 10 New Provider | `RoleName(Product)` | direct `Get_item` -> SQL `RoleName` | human-readable `Name Provider Type (New)` in `Detail`; no typed Provider custom field | same three statuses confirmed | confirm compatibility mapping |
| Topic 11 New Provider | `RoleName(Product)` | direct `Get_item` -> SQL `RoleName` | human-readable `Name Provider Type (New)` in `Detail`; no typed Provider custom field | same three statuses confirmed | confirm compatibility mapping and Transfer Owner meaning |

The visible labels, lookup/choice sources, DataCard updates, `Detail` labels, Flow
parameters, SQL destinations, and VSTS description jointly establish storage,
business meaning, and downstream usage. They do not authorize the new Portal to
preserve these overloaded columns; those decisions remain OPEN.

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

Technical behavior is **CONFIRMED**; lookup authority and the owner-approved
`Active`/blank/duplicate policy remain **PARTIAL**.

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
| `PackageHid(Product)` | SharePoint field exists, but no Product Management SQL insert parameter or VSTS `Detail` fragment was found | **UNKNOWN downstream** |
| Reused field semantics | observed storage and flow transport are known, but owner-approved semantic translation is absent | **PARTIAL** |

`CompanyName(Product)`, `Package(Product)`, free-text feature/email values, and
notification selection have no dedicated Product Management SQL columns in the
inspected insert action; their downstream representation depends on the derived
`Detail`. `AppName(Product)`, `ProductName(Product)`, `AccountName(Product)`,
`RoleName(Product)`, `RoleInternal(Product)`, `Emailลูกค้า(Product)`, and
`ProviderType(Product)` have direct SQL mappings. VSTS receives topic-specific
business content through `Detail`, not through corresponding typed custom fields.

## Registry result and safety gate

The API schema registry now records observed requiredness, multiplicity, legacy
field/label/control/binding/default/visibility, lookup source, Portal handling,
submit destination, transformation, serialization, reused-field evidence, Matrix
behavior, and per-Topic `partialReasons`.

- `5 CONFIRMED / 8 PARTIAL`.
- A `PARTIAL` form is non-submittable in both Web and API mock boundaries.
- All Product Management submission also remains explicitly disabled, including
  source-closed `CONFIRMED` schemas; contract status does not activate submission.
- `PRODUCT_MANAGEMENT_DATA_SOURCE=real` remains fail-closed.
- No production adapter, production write, Power Automate change, USR_PowerApp
  write, SQL write, VSTS write, approval execution, provisioning, or revocation
  was added.

### Exact remaining evidence/policy by Topic

| Topic | Status | Machine-readable reason | Closure or exact remaining decision |
| --- | --- | --- | --- |
| Create New Account | PARTIAL | `UNKNOWN_SUBMISSION_MAPPING` | owner must decide treatment of SharePoint-only `PackageHid(Product)` |
| เพิ่ม Email เข้า Account | PARTIAL | `UNKNOWN_MULTIPLICITY` | owner must decide whether raw text means one email or a list and, if a list, its grammar |
| เพิ่ม Email(พนักงาน) เข้า Account | CONFIRMED | none | effective `Form1_103` route resolved from ordered `If`; stale `Form1_6` is unreachable |
| เพิ่ม App เข้า Account | CONFIRMED | none | exact all-Roles formula, delimiter, empty behavior, and downstream `Detail` use resolved |
| ขอสิทธิ์เข้า Role(พนักงาน) | PARTIAL | `UNKNOWN_LOOKUP_AUTHORITY` | Matrix authority and `Active`/blank/duplicate policy require owner decision |
| เพิ่ม App เข้า Role(พนักงาน) | PARTIAL | `UNKNOWN_LOOKUP_AUTHORITY`, `LEGACY_REQUIREDNESS_ANOMALY` | same Matrix gate plus whether App is required |
| เพิ่ม Permission เข้า Role(ลูกค้า) | CONFIRMED | none | raw `featureList` passthrough is the exact legacy contract |
| เพิ่ม Package Add On(ลูกค้า) | PARTIAL | `UNAPPROVED_LEGACY_FIELD_REUSE` | owner must approve Role-via-Product and Add-On-via-App compatibility |
| Create New Role สำหรับ Account(ลูกค้า) | CONFIRMED | none | raw `featureList` passthrough is the exact legacy contract |
| เปลี่ยน Provider สำหรับ Account(ลูกค้า) | PARTIAL | `UNAPPROVED_LEGACY_FIELD_REUSE` | raw `emailList` is resolved; Provider-via-Role needs approval |
| Tranfer Owner Account(ลูกค้า) | PARTIAL | `UNAPPROVED_LEGACY_FIELD_REUSE`, `UNKNOWN_TARGET_EMAIL_SEMANTICS` | Provider reuse and target email meaning need decisions |
| ลบ User ใน Account(ลูกค้า) | CONFIRMED | none | raw `emailList` passthrough is the exact legacy contract |
| ขอเปิด/ปิดแจ้งเตือน... | PARTIAL | `UNKNOWN_SUBMISSION_MAPPING` | owner must accept `Detail`-only transport or define a typed destination |

The next task should obtain the ten concise OPEN decisions in the owner-decision
document, then update only the affected eight schemas. Real read or write
integration requires separate authorization and remains outside PM-03A.
