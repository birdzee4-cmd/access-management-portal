# Product Management policy closure evidence

## Scope and safety

PM-03C is an evidence-led decision pack for the ten Product Management owner
decisions that remain OPEN after PM-03A/PM-03B. On 2026-09-09 the current owner
explicitly authorized legacy SQL `SELECT` access for this work. The read was
limited to parameterized aggregate queries over Product Management request
history and metadata-only inspection. It performed no insert, update, delete,
merge, DDL, procedure execution, SharePoint/VSTS/Flow operation, or Portal write.

The output contained Topic-level counts and structural pattern counts only. No
raw row, `Detail`, person, email address, Account name, Manager, Work ID,
SharePoint ID, credential, connection string, or other source identifier is
retained here. These results are `OBSERVED`; they do not make a business rule
`APPROVED`, `ACTIVE`, or `PROVISIONED`.

The request-history query used the exact `Product Management` system filter,
an allowlist of the Topics relevant to the OPEN decisions, fixed projections,
named parameters, grouping by Topic, and a 20-group output cap. The accessible
history contained 1,497 Product Management rows across 19 Topics. The separately
attempted metadata-only connection to the Product Management database returned
sanitized `ELOGIN`; no credential change, retry workaround, or access bypass was
attempted. Consequently, downstream SQL-module consumption remains unverified by
PM-03C.

## Aggregate evidence for OPEN decisions

| PMD | Aggregate observation | What the evidence resolves | What it cannot decide |
| --- | --- | --- | --- |
| PMD-001 | 16 current Create Account rows; 0/16 had a Package Add-On or `PackageHid` marker in `Detail` | Corroborates that the optional Add-On is absent from the observed `Detail` transport | Whether to omit it intentionally or create a typed destination |
| PMD-002 | 363 Add Email rows; an email segment was structurally extractable in 328; 74 contained at least two `@` characters, 48 contained a comma, and 5 contained a semicolon | Multiple-address-looking input exists; a `SINGLE` contract would be incompatible with observed history | Canonical delimiter, validation, whitespace, escaping, deduplication, or recipient semantics |
| PMD-005 | 209 Request Role rows used `Role` 124 times and `Role Internal` 85 times; 409 Add App to Role rows used `Role` 235 times and `Role Internal` 174 times | Matrix-era and older Role label shapes both materially exist | Whether Matrix is authoritative or whether Manager fallback grants visibility/authority |
| PMD-006 | The same 618 Role-topic rows demonstrate label-era drift, but the minimized request history contains no authoritative Matrix lifecycle or duplicate-resolution decision | Drift must be handled explicitly and not normalized silently | Meaning of `Active`; blank/error Manager behavior; duplicate and ordering policy |
| PMD-007 | 409 Add App to Role rows: App Name label 386, App ID label 23; 28 were missing/blank under the App Name-shaped parser, including alternate legacy shapes | The historical contract is not uniformly “required App Name”; the source anomaly is operationally material | Whether the new Portal should accept an empty App selection |
| PMD-009 | 16 Add-On rows: 15 used the current Role Name/Package Add On label shape; one used the legacy Product Name/App Name shape | Confirms both semantic shapes occurred and migration must recognize the drift | Whether overloaded SQL/SharePoint columns should remain the compatibility destination |
| PMD-011 | 0 Change Provider rows in accessible history | No historical behavior can corroborate the reused Provider-via-Role mapping | The approved typed destination or compatibility mapping |
| PMD-012 | 6 Transfer Owner rows; all six carried the New Provider label | New Provider is consistently part of the observed human-readable request shape | Whether Provider-via-Role storage remains acceptable downstream |
| PMD-013 | The same six Transfer Owner rows cannot establish whose address the Email value represents without inspecting personal values and inferring intent | Historical values are intentionally not used to infer a person's business role | Exact target-person semantics and validation rule |
| PMD-015 | 0 notification-toggle rows in accessible history | No historical submission evidence exists | Whether Detail-only transport is acceptable or a typed destination is required |

Counts based on marker recognition are structural evidence, not a full parser.
Raw `Detail` permits newline and colon content that can resemble labels. The
email-pattern counts prove multiplicity ambiguity but do not assert that every
recognized separator is a delimiter. The 28 PMD-007 cases are parser-level
missing/blank observations and include legacy App ID shapes; they are not 28
proven empty requests.

## Recommended decisions for accountable-owner review

These are safe proposals, not approvals. Each remains `POLICY REQUIRED` until the
named accountable roles approve the exact contract version.

| PMD | Recommended future-Portal decision | Compatibility boundary | Required approver roles |
| --- | --- | --- | --- |
| PMD-001 | Preserve Add-On intent as a typed multi-value Portal field; do not send it to legacy until a destination or explicit omission rule is approved | Fail submission for this Topic while mapping is absent | Product process owner; integration owner |
| PMD-002 | Model customer email as a validated list of individual addresses; define one canonical API representation rather than accepting ambiguous raw delimiters | A future adapter may parse only an explicitly versioned legacy grammar; retain original text only under approved privacy policy | Product process owner; security/data owner |
| PMD-005 | Treat Matrix as a candidate-discovery source, never entitlement or approver authority by observation alone | Server derives identity and candidate scope; UI-provided identity is never trusted | IAM/security owner; application owner |
| PMD-006 | Fail closed on blank/error Manager and unresolved duplicates; require an explicit active-row rule and deterministic stable-key ordering | Do not silently deduplicate or interpret historical `Active` until approved | IAM/security owner; data owner |
| PMD-007 | Require at least one typed App in the future Portal because the requested action is Add App; handle verified legacy empty/ID-only cases as migration exceptions, not the new default | Do not change the observed legacy metadata until the new rule is approved and versioned | Product process owner; application owner |
| PMD-009 | Use correctly named typed Portal fields for Customer Role and Add-On; isolate `ProductName`/`AppName` overloads inside a versioned legacy adapter | No direct domain-model reuse of misleading legacy column names | Product process owner; integration owner |
| PMD-011 | Use a typed `newProvider` field; permit Provider-to-Role translation only in a reviewed legacy adapter | Topic remains blocked because no historical sample or downstream metadata confirms compatibility | Product process owner; integration owner |
| PMD-012 | Use separate typed `newProvider` and ownership fields; isolate any Provider-to-Role translation in the adapter | Historical label consistency does not approve the overloaded destination | Product process owner; integration owner |
| PMD-013 | Define the value explicitly as `newOwnerEmail` only if the approved process truly transfers ownership; otherwise choose a different typed semantic name | Never infer owner identity from historical address values | Product process owner; IAM/security owner |
| PMD-015 | Introduce a typed notification action/state and treat `Detail` as display/audit text, not the machine contract | Topic remains blocked until the authoritative consumer and allowed state transition are approved | Product process owner; application/integration owner |

## Approval and implementation sequence

1. Assign one named accountable person for each required role; unavailable old
   ownership does not prevent the organization from appointing a successor.
2. Review the evidence and select or amend each recommended decision. Record the
   decision, approvers, date, exact contract version, compatibility rule, and
   rollback/fail-closed behavior.
3. Change a PMD from OPEN only after that explicit record exists. SQL frequency,
   legacy Active, labels, and historical success never count as approval.
4. In a separately authorized implementation task, update schema metadata and
   synthetic contract tests. Keep translation confined to the legacy adapter.
5. Verify Web/API rejection, ambiguity, duplicate, blank, and legacy-drift cases.
6. Keep `submissionEnabled=false` and the real adapter disabled until every
   Topic-specific decision and acceptance gate is complete. Activation is a
   separate authorization after implementation review.

## Current outcome

PM-03C adds decision-quality evidence and recommendations but closes no PMD. The
registry remains `5 CONFIRMED / 8 PARTIAL`. OPEN remains exactly `PMD-001`,
`PMD-002`, `PMD-005`, `PMD-006`, `PMD-007`, `PMD-009`, `PMD-011`, `PMD-012`,
`PMD-013`, and `PMD-015`.
