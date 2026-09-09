# Product Management owner decisions

PM-03A separated source-resolved behavior from decisions that only a Product
Management owner could authorize. PM-03B now records the ten explicit final owner
decisions. Source evidence, PM-03C observations, owner approval, implemented
contract metadata, and runtime enablement remain distinct.

| Decision ID | Topic | Question | Technical evidence | Current safe behavior | Required owner decision | Impact if unresolved | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PMD-001 | Create New Account | How should `PackageHid(Product)` be represented without inventing an unverified destination? | Canvas writes selected Add-Ons to `PackageHid(Product)`; SQL insert, `Detail`, and VSTS mapping omit it. | Typed multi-value Portal concept; fail closed until downstream verification. | `APPROVE RECOMMENDATION`: no invented destination. | Technical downstream blocker remains visible. | RESOLVED_BY_OWNER |
| PMD-002 | เพิ่ม Email เข้า Account | What is the canonical email multiplicity and validation? | Legacy raw text has inconsistent multi-email grammar; history confirms multiple values. | Validated email array; trim and validate each item; adapter-only compatibility serialization. | `APPROVE RECOMMENDATION`. | Removes ambiguity from the Portal contract. | RESOLVED_BY_OWNER |
| PMD-003 | เพิ่ม Email(พนักงาน) เข้า Account | Which Thailand route is effective? | The ordered Home `If` reaches `Form1_103` first; the later identical condition targeting `Form1_6` is unreachable. | Preserve `Form1_103` contract. | None. | None for contract mapping; stale source should not be treated as a second behavior. | RESOLVED_FROM_SOURCE |
| PMD-004 | เพิ่ม App เข้า Account | What is the exact all-Roles `Detail` fragment? | `Filter` gets all Account roles; `Concat(..., role & ", ")` plus `Left(...,-2)` removes the final delimiter; empty source returns `""`; no sort/dedup/escape. | Preserve this derived fragment in the contract; submission remains disabled. | None. | None for contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-005 | ขอสิทธิ์เข้า Role / เพิ่ม App เข้า Role | What authority does Matrix have? | Matrix proves candidate visibility only. | Candidate/lookup source only; never entitlement, approval, access, or Manager-authority proof. | `APPROVE RECOMMENDATION`; Phase 1 retains Legacy Teams approval only. | Prevents Matrix observations becoming authority. | RESOLVED_BY_OWNER |
| PMD-006 | ขอสิทธิ์เข้า Role / เพิ่ม App เข้า Role | How must Active, Manager failure, duplicates, and ordering behave? | Legacy applies no Active filter/guard/sort/distinct. | Active=true only; unknown Active fails closed; unusable Manager is UNRESOLVED; stable key required for duplicates; ordering has no approval meaning. | `APPROVE RECOMMENDATION`. | Establishes deterministic fail-closed candidate policy. | RESOLVED_BY_OWNER |
| PMD-007 | เพิ่ม App เข้า Role(พนักงาน) | Must at least one App be selected? | Legacy guards do not require App; historical App ID/App Name drift exists. | App is REQUIRED and must resolve to a valid App candidate for new Portal requests. | `APPROVE RECOMMENDATION`. | Removes empty Add App intent. | RESOLVED_BY_OWNER |
| PMD-008 | เพิ่ม Permission เข้า Role | What delimiter does `featureList` use? | The runtime does not parse a list: one required text value is appended unchanged after `List Feature : ` and passed through `Detail`. | Model as raw text with no enforced delimiter. | None. | None for legacy-compatible contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-009 | เพิ่ม Package Add On | Must Phase 1 preserve the overloaded fields? | End-to-end source evidence confirms both mappings. | Preserve Customer Role -> `ProductName(Product)` and Add-On -> `AppName(Product)` at the compatibility boundary. | `APPROVE WITH CHANGE — LEGACY COMPATIBILITY FIRST`. | Keeps Phase 1 behavior while documenting overload. | RESOLVED_BY_OWNER |
| PMD-010 | Create New Role | What delimiter does `featureList` use? | One required text value is appended unchanged after `List Feature : `; no parsing or normalization occurs. | Model as raw text with no enforced delimiter. | None. | None for legacy-compatible contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-011 | เปลี่ยน Provider | Should Phase 1 preserve Provider -> `RoleName(Product)`? | Source mapping is confirmed; historical downstream samples are absent. | Preserve mapping as owner-approved compatibility; retain technical verification blocker. | `APPROVE WITH CHANGE — LEGACY COMPATIBILITY FIRST`. | Avoids claiming unverified downstream behavior. | RESOLVED_BY_OWNER |
| PMD-012 | Tranfer Owner | Should Transfer Owner preserve Provider -> `RoleName(Product)`? | Source mapping and Provider label are observed; downstream verification remains incomplete. | Preserve mapping for Phase 1; retain technical verification blocker. | `APPROVE WITH CHANGE — LEGACY COMPATIBILITY FIRST`. | Keeps legacy shape without overstating evidence. | RESOLVED_BY_OWNER |
| PMD-013 | Tranfer Owner | What does the Email field mean? | Existing field/label is `Email ลูกค้า`; no identity authority is proven. | Retain Customer Email semantics; do not rename to `newOwnerEmail` or derive ownership/identity authority. | `APPROVE WITH CHANGE — LEGACY COMPATIBILITY FIRST`. | Prevents false identity inference. | RESOLVED_BY_OWNER |
| PMD-014 | ลบ User | What delimiter does `emailList` use? | One required text value is appended unchanged after `List Email : `; no split, trim, validation, or normalization occurs. | Model as raw text with no enforced delimiter. | None. | None for legacy-compatible contract mapping. | RESOLVED_FROM_SOURCE |
| PMD-015 | เปิด/ปิดแจ้งเตือน | Is Detail-only transport acceptable for Phase 1? | `เปิด`/`ปิด` is carried through `Detail`; no dedicated typed destination was found. | Retain Detail-only Legacy representation; modernization is separate. | `APPROVE WITH CHANGE — LEGACY COMPATIBILITY FIRST`. | Preserves behavior without inventing activation. | RESOLVED_BY_OWNER |

## PM-03B historical-evidence effect

The offline 77-record historical extract corroborates PMD-008, PMD-010, and
PMD-014: sampled `List Feature`/`List Email` content behaves as raw text, including
embedded newline evidence for `List Feature`. This is corroboration, not a new
list grammar. Historical label drift (`Role` / `Role Name` / `Role Internal`,
`Role Name` / `Product Name`, and older `App Name` / `App ID`) does not select an
authoritative compatibility mapping. The bounded latest-five samples also do not
justify changing any source-confirmed `MULTIPLE` field to `SINGLE`.

Historical observation alone closed no owner decision. PMD-003, PMD-004, PMD-008,
PMD-010, and PMD-014 remain `RESOLVED_FROM_SOURCE`; PM-03B subsequently applies
the separately supplied owner approval to the other ten decisions.

Open owner questions: **0**. Owner-resolved decisions: **10**. Source-resolved
decisions: **5**.

PM-03C adds authorized privacy-minimized legacy SQL aggregate evidence and safe
recommended decisions without changing any status. See
[Product Management policy closure evidence](product-management-policy-closure.md).

PM-03D packages the ten OPEN questions, evidence, recommendation, alternatives,
compatibility boundary, owner response, and possible post-approval effect in the
[Product Management Owner Decision Pack](product-management-owner-decision-pack.md).
The controlled workflow is PM-03A -> PM-03C Evidence -> PM-03D Owner Decision
Pack -> Owner Approval -> PM-03B Apply Decisions. This PM-03B application records
the supplied approvals but does not activate submission or integration.
