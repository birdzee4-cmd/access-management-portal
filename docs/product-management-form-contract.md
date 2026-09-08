# Product Management legacy form contract

## Scope, evidence, and status language

PM-03 is an offline contract-discovery result. It inspected the exported Power
Apps and Power Automate packages under the ignored
`reference/legacy-product-management/` boundary. It did not connect to a live
environment, submit a form, trigger or edit a flow, query production, or perform
any write.

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
- `DELIMITED_TEXT` means the legacy control accepts one text value intended to
  contain a list. The export does not establish a canonical delimiter or item
  grammar.

No export identifiers, connection identifiers, credentials, raw rows, real user
identifiers, Manager values, or routing addresses are recorded here.

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
ordered `If` formula. The owner-approved canonical intent remains unknown. A
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

### 3. เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า) — PARTIAL

The employee is the authenticated requester from the common fields; no separate
employee-email input exists on the effective forms.

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; change resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `RoleName(Product)` / Role Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Account-filtered Role | SQL `RoleName` and `Detail`; comma-separated |

Remaining reason: `DUPLICATE_LEGACY_ROUTE` for the two Thailand branches.

### 4. เพิ่ม App เข้า Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency/default | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `appName` | `AppName(Product)` / App Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | country App; not filtered by Account | SQL `AppName` and `Detail`; `[AppID] display`, comma-separated |
| derived only | `Detail` Role Name fragment | hidden `TextInput` | `CONFIRMED_OPTIONAL` / `DELIMITED_TEXT` | automatically lists every observed Role for the selected Account | `Detail` only; future Portal behavior requires owner confirmation |

Remaining reason: `UNKNOWN_SUBMISSION_MAPPING` for the automatically derived
all-Roles fragment.

### 5. ขอสิทธิ์เข้า Role(พนักงาน) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `internalRole` | `RoleInternal(Product)` / Role Internal | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | TH, PH, or shared VN/MY/ID Matrix filtered by current user/Manager logic | SQL `RoleInternal` and `Detail`; comma-separated |

Expected Portal handling is `ALLOW EDIT`, but lookup resolution must be
server-authoritative. Remaining reason: `UNKNOWN_LOOKUP_AUTHORITY`; owner-approved
Matrix authority, `Active` filtering, and fallback semantics are not established.

### 6. เพิ่ม App เข้า Role(พนักงาน) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `internalRole` | `RoleInternal(Product)` / Role Internal | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Department/Manager Matrix | SQL `RoleInternal` and `Detail`; comma-separated |
| `appName` | `AppName(Product)` / App Name | `ComboBox.SelectedItems` | `CONFIRMED_OPTIONAL` / `MULTIPLE` in observed guard | country App | SQL `AppName` and `Detail`; `[AppID] display`, comma-separated |

The Topic is semantically “add App”, but every observed submit guard requires
only Internal Role and permits no App. Remaining reasons:
`UNKNOWN_LOOKUP_AUTHORITY` and `LEGACY_REQUIREDNESS_ANOMALY`.

### 7. เพิ่ม Permission เข้า Role(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `RoleName(Product)` / Role Name | `ComboBox.Selected.AccountRoleName` | `CONFIRMED_REQUIRED` / `SINGLE` | Account-filtered Role | SQL `RoleName` and `Detail` |
| `featureList` | unbound List Feature control, persisted through `Detail` | `TextInput.Text` | `CONFIRMED_REQUIRED` / `DELIMITED_TEXT` | blank | prefixed with Topic, Account, and Role into SQL `Detail` and VSTS description |

Remaining reason: `UNKNOWN_TEXT_LIST_FORMAT`.

### 8. เพิ่ม Package Add On(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Role | SQL `AccountName` and `Detail` |
| `customerRole` | `ProductName(Product)` / Role Name | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | Account-filtered Role | **reuses** `ProductName(Product)` -> SQL `ProductName`; comma-separated and in `Detail` |
| `packageAddOn` | `AppName(Product)` / Package Add On | `ComboBox.SelectedItems` | `CONFIRMED_REQUIRED` / `MULTIPLE` | country Add-On source | **reuses** `AppName(Product)` -> SQL `AppName`; comma-separated and in `Detail` |

Remaining reason: `UNAPPROVED_LEGACY_FIELD_REUSE`.

### 9. Create New Role สำหรับ Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `newRole` | `RoleName(Product)` / Create Role Name | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `RoleName` and `Detail` |
| `featureList` | unbound List Feature control, persisted through `Detail` | `TextInput.Text` | `CONFIRMED_REQUIRED` / `DELIMITED_TEXT` | blank | SQL `Detail`, VSTS description |

`featureList` was missing from the earlier Portal registry and is now included.
Remaining reason: `UNKNOWN_TEXT_LIST_FORMAT`.

### 10. เปลี่ยน Provider สำหรับ Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Provider | SQL `AccountName` and `Detail` |
| `providerType` | `RoleName(Product)` / Name Provider Type (New) | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | **reuses** `RoleName(Product)` -> SQL `RoleName`; also in `Detail` |
| `emailList` | unbound List Email control, persisted through `Detail` | `TextInput.Text` | `CONFIRMED_REQUIRED` / `DELIMITED_TEXT` | blank | SQL `Detail`, VSTS description |

`emailList` was missing from the earlier Portal registry and is now included.
Remaining reasons: `UNKNOWN_TEXT_LIST_FORMAT` and
`UNAPPROVED_LEGACY_FIELD_REUSE`.

### 11. Tranfer Owner Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets Provider | SQL `AccountName` and `Detail` |
| `providerType` | `RoleName(Product)` / Name Provider Type (New) | `DropDown.Selected.Value` | `CONFIRMED_REQUIRED` / `SINGLE` | Provider sentinel | **reuses** `RoleName(Product)` -> SQL `RoleName`; also in `Detail` |
| `customerEmail` | unbound Email ลูกค้า control, persisted through `Detail` | `TextInput.Text` | `CONFIRMED_REQUIRED` / `SINGLE` | blank | SQL `Detail`, VSTS description; no exported email-format validation |

Remaining reason: `UNAPPROVED_LEGACY_FIELD_REUSE`.

### 12. ลบ User ใน Account(ลูกค้า) — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account | SQL `AccountName` and `Detail` |
| `emailList` | unbound List Email control, persisted through `Detail` | `TextInput.Text` | `CONFIRMED_REQUIRED` / `DELIMITED_TEXT` | blank | prefixed with Topic and Account into SQL `Detail` and VSTS description |

Remaining reason: `UNKNOWN_TEXT_LIST_FORMAT`.

### 13. ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account — PARTIAL

| Portal field | Legacy field / label | Control and binding | Requiredness / multiplicity | Default/dependency | Submit destination and transform |
| --- | --- | --- | --- | --- | --- |
| `account` | `AccountName(Product)` / Account Name | `ComboBox.Selected` | `CONFIRMED_REQUIRED` / `SINGLE` | country Account; resets setting | SQL `AccountName` and `Detail` |
| `notificationSetting` | unbound Send Email BCC to Owner Account control | `DropDown.Selected.Value` through hidden `TextInput` | `CONFIRMED_REQUIRED` / `SINGLE` | selection sentinel; choices `เปิด`, `ปิด` | encoded in SQL `Detail` and VSTS description only |

Remaining reason: `UNKNOWN_SUBMISSION_MAPPING`; the setting has no dedicated
SharePoint/SQL/VSTS status field in the inspected branch.

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
submit destination, transformation, and per-Topic `partialReasons`.

- `0 CONFIRMED / 13 PARTIAL`.
- A `PARTIAL` form is non-submittable in both Web and API mock boundaries.
- `PRODUCT_MANAGEMENT_DATA_SOURCE=real` remains fail-closed.
- No production adapter, production write, Power Automate change, USR_PowerApp
  write, SQL write, VSTS write, approval execution, provisioning, or revocation
  was added.

### Exact remaining evidence/policy by Topic

| Topic | Machine-readable reason | Exact missing evidence or decision |
| --- | --- | --- |
| Create New Account | `UNKNOWN_SUBMISSION_MAPPING` | approved downstream treatment for `PackageHid(Product)` |
| เพิ่ม Email เข้า Account | `UNKNOWN_MULTIPLICITY` | single-vs-list grammar for free-text customer email |
| เพิ่ม Email(พนักงาน) เข้า Account | `DUPLICATE_LEGACY_ROUTE` | owner-approved Thailand route/form intent |
| เพิ่ม App เข้า Account | `UNKNOWN_SUBMISSION_MAPPING` | whether Portal must recreate the hidden all-Roles `Detail` fragment |
| ขอสิทธิ์เข้า Role(พนักงาน) | `UNKNOWN_LOOKUP_AUTHORITY` | Matrix ownership, `Active` rule, and authenticated Department/Manager fallback policy |
| เพิ่ม App เข้า Role(พนักงาน) | `UNKNOWN_LOOKUP_AUTHORITY`, `LEGACY_REQUIREDNESS_ANOMALY` | same Matrix policy plus whether App must actually be required |
| เพิ่ม Permission เข้า Role(ลูกค้า) | `UNKNOWN_TEXT_LIST_FORMAT` | canonical feature-list grammar/delimiter |
| เพิ่ม Package Add On(ลูกค้า) | `UNAPPROVED_LEGACY_FIELD_REUSE` | approval to translate Role via Product column and Add-On via App column |
| Create New Role สำหรับ Account(ลูกค้า) | `UNKNOWN_TEXT_LIST_FORMAT` | canonical feature-list grammar/delimiter |
| เปลี่ยน Provider สำหรับ Account(ลูกค้า) | `UNKNOWN_TEXT_LIST_FORMAT`, `UNAPPROVED_LEGACY_FIELD_REUSE` | canonical email-list grammar and approval of Provider-via-Role mapping |
| Tranfer Owner Account(ลูกค้า) | `UNAPPROVED_LEGACY_FIELD_REUSE` | approval of Provider-via-Role mapping and target email semantics |
| ลบ User ใน Account(ลูกค้า) | `UNKNOWN_TEXT_LIST_FORMAT` | canonical email-list grammar/delimiter |
| ขอเปิด/ปิดแจ้งเตือน... | `UNKNOWN_SUBMISSION_MAPPING` | approved typed destination/consumer for a setting currently present only in `Detail` |

The next task should obtain Product Management owner decisions for this table,
then update only the resolved schema entries. Real read or write integration
requires separate authorization and remains outside PM-03.
