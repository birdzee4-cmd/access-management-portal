# Product Management owner decisions

PM-03A separates source-resolved behavior from decisions that only a Product
Management owner can authorize. This document is based only on the offline
Power Apps and Power Automate exports; no production read or write was performed.

| Decision ID | Topic | Question | Technical evidence | Current safe behavior | Required owner decision | Impact if unresolved | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PMD-001 | Create New Account | Should `PackageHid(Product)` remain SharePoint-only, be omitted, or gain an approved downstream destination? | Canvas writes selected Add-Ons to `PackageHid(Product)` with `" , "`; Product Management SQL insert, `Detail`, and VSTS mapping omit it. | Keep schema PARTIAL; do not submit. | Select the compatible destination/omission rule. | Add-On intent could be silently lost or sent to the wrong field. | OPEN |
| PMD-002 | เพิ่ม Email เข้า Account | Does the field accept exactly one email or multiple emails; if multiple, what exact grammar is valid? | One `TextInput.Text` is copied raw to `Emailลูกค้า(Product)`, SQL `Email_Customer`, and `Detail`; no split, delimiter check, trim, or email validation exists. | Preserve raw evidence metadata; keep multiplicity UNKNOWN and schema PARTIAL. | Decide single versus list and the exact allowed delimiter/validation. | Portal validation could reject valid legacy input or combine recipients ambiguously. | OPEN |
| PMD-003 | เพิ่ม Email(พนักงาน) เข้า Account | Which Thailand route is effective? | The ordered Home `If` reaches `Form1_103` first; the later identical condition targeting `Form1_6` is unreachable. | Preserve `Form1_103` contract. | None. | None for contract mapping; stale source should not be treated as a second behavior. | RESOLVED_FROM_SOURCE |
| PMD-004 | เพิ่ม App เข้า Account | What is the exact all-Roles `Detail` fragment? | `Filter` gets all Account roles; `Concat(..., role & ", ")` plus `Left(...,-2)` removes the final delimiter; empty source returns `""`; no sort/dedup/escape. | Preserve this derived fragment in the contract; submission remains disabled. | None. | None for contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-005 | ขอสิทธิ์เข้า Role / เพิ่ม App เข้า Role | Is the Matrix an authoritative candidate source, and must Portal preserve the effective requester-as-Manager, otherwise requester-manager fallback rule? | Effective forms use TH, PH, or VN/MY/ID Matrix and the two-branch Manager formula; Matrix use proves dropdown visibility only, not entitlement authority. | Keep lookup server-authoritative and both schemas PARTIAL. | Confirm authority and the exact matching rule. | Portal could expose unauthorized or incomplete Role candidates. | OPEN |
| PMD-006 | ขอสิทธิ์เข้า Role / เพิ่ม App เข้า Role | Must `Active` filter rows, and what should happen for blank/error Manager lookup and duplicate `RoleName` rows? | Effective formulas do not reference `Active`, have no blank/error guard, and apply neither `Sort` nor `Distinct`. | Do not infer filtering, fallback, or deduplication policy. | Specify Active, failure/blank, duplicate, and ordering rules. | Candidate visibility could be unsafe or nondeterministic. | OPEN |
| PMD-007 | เพิ่ม App เข้า Role(พนักงาน) | Must at least one App be required? | All five effective submit guards require Internal Role but do not require App, despite the Topic name. | Keep App `CONFIRMED_OPTIONAL`; schema remains PARTIAL. | Decide whether Portal preserves optional App or requires one. | A request could carry no App or Portal could reject a legacy-valid request. | OPEN |
| PMD-008 | เพิ่ม Permission เข้า Role | What delimiter does `featureList` use? | The runtime does not parse a list: one required text value is appended unchanged after `List Feature : ` and passed through `Detail`. | Model as raw text with no enforced delimiter. | None. | None for legacy-compatible contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-009 | เพิ่ม Package Add On | Must Portal preserve Customer Role -> `ProductName(Product)`/SQL `ProductName` and Add-On -> `AppName(Product)`/SQL `AppName`? | Visible labels, lookups, DataCard updates, `Detail` labels, Flow parameters, SQL columns, and VSTS description confirm both overloaded mappings. | Keep schema PARTIAL; record all three evidence statuses as confirmed. | Approve or replace both compatibility mappings. | Typed downstream columns could be semantically misleading or incompatible. | OPEN |
| PMD-010 | Create New Role | What delimiter does `featureList` use? | One required text value is appended unchanged after `List Feature : `; no parsing or normalization occurs. | Model as raw text with no enforced delimiter. | None. | None for legacy-compatible contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-011 | เปลี่ยน Provider | Must Portal preserve New Provider -> `RoleName(Product)`/SQL `RoleName`? | The dropdown value writes to the reused Role field and typed SQL Role column; `Detail` and VSTS describe it as New Provider. `emailList` is confirmed raw text. | Keep schema PARTIAL and submission disabled. | Approve or replace Provider-via-Role compatibility. | Provider intent could be stored under an incompatible semantic column. | OPEN |
| PMD-012 | Tranfer Owner | Must Portal preserve New Provider -> `RoleName(Product)`/SQL `RoleName` for this Topic? | The same reused mapping is present in all five forms and reaches VSTS only through the Provider-labelled `Detail` fragment. | Keep schema PARTIAL and submission disabled. | Approve or replace Provider-via-Role compatibility. | Provider intent could be misrouted or misreported. | OPEN |
| PMD-013 | Tranfer Owner | Whose address must the required free-text Email value represent? | The Topic and label disagree in specificity; code only appends raw text after `Email : ` to `Detail`, with no typed field or validation. | Do not rename or infer the target person. | Choose the exact target meaning and validation rule. | Ownership could be transferred or notified to the wrong person. | OPEN |
| PMD-014 | ลบ User | What delimiter does `emailList` use? | One required text value is appended unchanged after `List Email : `; no split, trim, validation, or normalization occurs. | Model as raw text with no enforced delimiter. | None. | None for legacy-compatible contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-015 | เปิด/ปิดแจ้งเตือน | Is `Detail`-only transport acceptable, or is an approved typed destination required? | `เปิด`/`ปิด` is copied through hidden text only into `Detail`; SQL and VSTS consume `Detail`; no dedicated field was found. | Keep schema PARTIAL; do not invent a typed field. | Accept Detail-only compatibility or name the authoritative typed destination/consumer. | The setting could remain human-readable but not machine-actionable. | OPEN |

## PM-03B historical-evidence effect

The offline 77-record historical extract corroborates PMD-008, PMD-010, and
PMD-014: sampled `List Feature`/`List Email` content behaves as raw text, including
embedded newline evidence for `List Feature`. This is corroboration, not a new
list grammar. Historical label drift (`Role` / `Role Name` / `Role Internal`,
`Role Name` / `Product Name`, and older `App Name` / `App ID`) does not select an
authoritative compatibility mapping. The bounded latest-five samples also do not
justify changing any source-confirmed `MULTIPLE` field to `SINGLE`.

No historical observation closes an owner decision. The OPEN set remains exactly:
`PMD-001`, `PMD-002`, `PMD-005`, `PMD-006`, `PMD-007`, `PMD-009`, `PMD-011`,
`PMD-012`, `PMD-013`, and `PMD-015`. PMD-003, PMD-004, PMD-008, PMD-010, and
PMD-014 remain `RESOLVED_FROM_SOURCE`; historical evidence is not owner approval.

Open owner questions: **10**. Source-resolved decisions: **5**.

PM-03C adds authorized privacy-minimized legacy SQL aggregate evidence and safe
recommended decisions without changing any status. See
[Product Management policy closure evidence](product-management-policy-closure.md).

PM-03D packages the ten OPEN questions, evidence, recommendation, alternatives,
compatibility boundary, owner response, and possible post-approval effect in the
[Product Management Owner Decision Pack](product-management-owner-decision-pack.md).
The controlled workflow is PM-03A -> PM-03C Evidence -> PM-03D Owner Decision
Pack -> Owner Approval -> PM-03B Apply Decisions. PM-03D resolves nothing; only a
recorded owner approval can authorize a later, separately scoped PM-03B change.
