# Legacy Matrix to Approval Rule candidates

Task 07O is an internal analysis foundation. Catalog describes what access may
be requested; approval describes who may need to approve. The Task 07N catalog
identity implementation and Prisma schema are unchanged. No candidate can be
activated, persisted, or executed by this service.

## Evidence and semantic decisions

| Question / statement | Classification | Decision |
| --- | --- | --- |
| Manager is an observed column in the four approved matrix partitions | CONFIRMED | Preserve observation availability; use no authority assumptions |
| Manager may contribute to legacy approval routing | LIKELY | Task 07C relationships and model documentation suggest a candidate association only |
| Manager is an authoritative approver, line manager, owner, user, group, email, or display name | UNKNOWN | No metadata establishes type or authority; treat as opaque text |
| One RoleName + Department always has one Manager | CONTRADICTED | Task 07C observed multiple values within source partitions |
| Multiple Managers mean ANY | UNKNOWN | No decision-mode field or reviewed rule exists |
| Multiple Managers mean ALL | UNKNOWN | No decision-mode field or reviewed rule exists |
| Multiple Managers imply SEQUENTIAL, fallback, delegation, rotation, or escalation | UNKNOWN | No explicit sequence or routing evidence exists |
| Department is part of canonical approval scope | UNKNOWN | Associations are observable; scope semantics require owner confirmation |
| Source is part of canonical approval scope | UNKNOWN | Partition provenance is CONFIRMED, business meaning is not |
| Manager can be automatically resolved to Entra identity | UNKNOWN | No verified identity metadata and no Graph/Entra query performed |
| These candidates can safely become active ApprovalRules now | CONTRADICTED | Required identity, scope, decision mode, level and lifecycle evidence remain unresolved |

The existing ApprovalRule schema needs a reviewed system, department, rule code,
version, and approval level. ApprovalRuleApprover needs an authoritative reference
and any explicitly proven sequence. This task deliberately supplies no fabricated
values to satisfy those persistence requirements. No schema incompatibility was
found; analysis candidates are separate types, not partially populated DB records.

## Candidate models and grouping

`ApprovalRuleCandidate` contains source, deterministic candidate fingerprint,
normalized role/department, an array retaining every original non-person
observation (including Active), catalog observation provenance, optional unique
catalog candidate fingerprint, catalog-link state, unresolved scope, UNKNOWN
approval mode, unresolved sequence, approvers, distinct Manager count, UNKNOWN
confidence, and warning codes.

The analysis uses normalized Source + RoleName + Department as a **hypothetical
grouping**, not a canonical approval key. Different sources/departments remain
separate candidates. Every input row remains in the group's observation array
and has a corresponding approver entry, even for exact duplicates, normalization
variants, missing Managers, or conflicting Active. Grouping is not deduplication,
reconciliation, or automatic resolution of ambiguous rules. No original Manager
strings are placed in candidate output.

`ApprovalRuleApproverCandidate` contains a correlation fingerprint,
OBSERVED/UNAVAILABLE Manager availability, UNRESOLVED identity, UNKNOWN identity
type, UNRESOLVED sequence with null sequence value, UNKNOWN decision semantics,
UNKNOWN confidence, and warnings. Identity-type vocabulary reserves PORTAL_USER,
ENTRA_USER, ENTRA_GROUP, and SERVICE_PRINCIPAL for future reviewed resolution,
but Task 07O never emits them. A nonblank Manager is one opaque observation; it
is not split into assumed people or groups based on punctuation or format.

Missing Managers retain UNAVAILABLE placeholders, rather than inventing an
approver or dropping incomplete evidence. Multiple observations remain separate
even when normalized Manager text matches. Arrays preserve input order for
correlation only; neither row order, source order, nor alphabetical order supplies
sequence numbers, priority, ANY, ALL, or SEQUENTIAL semantics.

## Normalization and fingerprints

RoleName, Department, Manager and Active use trim, blank-to-null and JavaScript
locale-independent lowercase comparison. Source uses trim, uppercase, and the
existing four-value allowlist. No business words, internal spaces, punctuation,
or accents are rewritten. This comparison policy is not a complete Unicode case
folding or a guarantee of equivalence with SQL collation. Raw Manager values
remain only in the input during analysis for normalization-variant detection.

Rule fingerprints use SHA-256 over a versioned JSON tuple of normalized source,
role and department. Approver fingerprints use a different versioned tuple of
that scope plus the normalized opaque Manager value (or null). No DB row ID,
Portal user ID, Entra object ID, secret, or mutable database identifier is used.
Active and row order do not change the hypothetical scope fingerprint.

Grouping uses complete canonical tuples, never hashes. A separate check detects
different canonical tuples with the same digest for both rule and approver
candidates, reports FINGERPRINT_COLLISION, and keeps the entries separate. Repeated
identical canonical inputs sharing a fingerprint are expected and retained.
Fingerprints are deterministic correlation aids, not security identities or proof
of anonymization: low-entropy person strings can be guessed. Consequently no
production fingerprint, raw label, candidate, or ambiguity detail is logged or
exported. Production reporting uses counts only.

## Catalog linkage

The preview reads each matrix once. It passes an explicit person-free projection
of that same batch to the unchanged Task 07N mapper. Link matching requires the
catalog sourceFingerprint **and** matching normalized source, role, department,
and Active provenance. A matching digest alone is insufficient.

A RESOLVED link means a unique, non-collision **catalog observation candidate**
can be correlated, not that a Portal Role, System, or permission is resolved.
The approval scope and all identity/decision semantics remain unresolved.
Missing catalog input, missing role/department, or incomplete Active provenance
leaves the link UNRESOLVED. Multiple matching catalog observations, existing
catalog collision warnings, or an unexpected approval fingerprint collision
produce COLLISION. Unresolved/collision links carry no selected catalog fingerprint;
the first match is never silently chosen. No foreign keys are persisted.

## Ambiguity counts

All counts describe this input sample only. Categories overlap and are not summed
to infer distinct business rules:

- One/multiple Manager candidates count distinct nonblank normalized Manager
  strings within each hypothetical Source + RoleName + Department group.
- Role + Department multi-manager count ignores source for comparison only;
  source-specific candidates remain separate.
- Source-crossing collisions count normalized RoleName groups with at least two
  populated source Manager sets that differ. Missing-only sets are unknown
  evidence, not a conflicting Manager value.
- Department ambiguity counts Source + nonblank RoleName groups with multiple
  nonblank departments; it does not decide the canonical approval scope.
- Shared Manager counts nonblank normalized Manager groups observed in multiple
  hypothetical rule scopes, without asserting one verified person.
- Normalization collisions count (field, normalized value) groups with multiple
  exact originals across Source/RoleName/Department/Manager/Active. Whitespace
  and case variants count; null/blank groups do not. A group may span sources.
- Active conflicts count hypothetical rule scopes with multiple nonblank
  normalized Active values. Missing Active is unknown evidence. No value becomes
  an enabled/disabled rule, approver status, revocation or workflow action.
- Unresolved identity count includes every approver entry, including missing
  placeholders; approver observation count includes nonblank Managers only.
- Unresolved catalog-link count includes UNRESOLVED and COLLISION candidates.
- ApprovalMode UNKNOWN and sequence UNRESOLVED count rule candidates; approver
  sequence unresolved is separately counted per retained observation.

Grouping comparison summaries report group and multi-manager counts for role,
role+department, role+source, and role+department+source. The first three omit
missing required dimensions; the last includes missing-scope groups with warnings.
Per-source summaries contain observation/candidate/distinct-department counts,
never department or Manager values.

## Preview and safety

LegacyApprovalPreviewService uses only the existing guarded connector's
executeSelect port and the existing explicit four-column matrix query. Each of
NEW, TH, PH, and VN_MY_ID is read once with parameterized TOP, 1–50 rows per
source; at most 200 observations. Invalid limits fail before I/O. Oversized
responses and unsupported values fail closed. Reads have no stable ordering;
limitReached is not a total, completeness, or vocabulary guarantee.

`preview()` returns internal candidates and ambiguity indexes without raw Manager
values. `summarize()` returns only counts and fixed source labels and is used for
controlled production reporting. Neither is registered in any API, UI, container,
startup hook, scheduler, identity resolver, or workflow engine.

No logging, DB persistence, import, migration/db push, Graph/Entra lookup,
identity changes, role assignments, SharePoint/VSTS API calls, Power Automate,
approval action, provisioning, revocation, automation, deployment, or production
mutation occurs. Safety flags and existing read guards are unchanged. Tests use
synthetic data and injected read-only ports, never production SQL.

## Controlled production findings — 2026-09-06

Four guarded, explicit-column SELECT reads used limit 50 per source to retain
the existing bounded discovery window for multi-manager comparisons. Only the
count-only summarize() output was retained. No raw rows, labels, person values,
hashes or configuration values were exported or committed; the connector was
closed after the read. This is an unordered sample, not a full matrix profile.

| Source | Observations | Candidate groups | Distinct departments | Limit reached |
| --- | ---: | ---: | ---: | --- |
| NEW | 3 | 3 | 1 | No |
| TH | 50 | 46 | 24 | Yes |
| PH | 50 | 43 | 18 | Yes |
| VN_MY_ID | 50 | 38 | 18 | Yes |

| Finding | Count |
| --- | ---: |
| Observations analyzed | 153 |
| Approval rule candidate groups | 130 |
| Nonblank approver observations | 153 |
| Retained approver entries | 153 |
| Blank/null Manager observations | 0 |
| One-manager candidates | 116 |
| Multi-manager candidates | 14 |
| No-manager candidates | 0 |
| Maximum distinct Manager values in a candidate | 5 |
| Unresolved identities | 153 |
| Unresolved catalog links, including collisions | 109 |
| Catalog link collisions | 109 |
| Unique catalog observation links | 21 |
| Source-crossing Manager-set collisions | 13 |
| Department ambiguity groups | 25 |
| Normalized Manager groups shared across candidate scopes | 29 |
| Role + Department groups with multiple Managers, across sources | 10 |
| Normalization collision groups, all five fields | 2 |
| Conflicting Active groups | 0 |
| Unexpected candidate fingerprint collisions | 0 |
| Ambiguity groups, overlapping categories | 192 |
| ApprovalMode UNKNOWN, rule candidates | 130 |
| Sequence UNRESOLVED, rule candidates | 130 |
| Sequence UNRESOLVED, approver entries | 153 |

| Hypothetical grouping | Groups | Multi-manager groups |
| --- | ---: | ---: |
| RoleName | 48 | 21 |
| RoleName + Department | 93 | 10 |
| RoleName + Source | 72 | 28 |
| RoleName + Department + Source | 130 | 14 |

These observations are CONFIRMED only within the bounded sample. The 14
multi-manager groups contradict any universal single-Manager interpretation,
including under the most specific grouping tested. Differences among grouping
counts do not establish a canonical key. Department/source approval-scope
semantics remain UNKNOWN. The 21 unique links correlate catalog observations
only; no catalog entity or approver identity is resolved. Zero missing/conflicting
values in this sample do not establish a complete Active or Manager vocabulary.

## Validation — 2026-09-06

| Required command | Result |
| --- | --- |
| npm test | PASS: 199/199 (connectors 40, database 6, web 46, API 107); 27 new approval tests |
| npm run typecheck | PASS |
| npm run build | PASS |
| npm run prisma:validate | PASS; existing local placeholder URL, no migration/db push |
| npm audit --audit-level=moderate | PASS: online registry, 0 vulnerabilities |

Synthetic tests cover normalization, one/multiple/missing Managers, duplicate
retention, alternative grouping scopes, shared Managers, default unknown mode
and sequence, unresolved identity, unique/missing/collision catalog links,
deterministic fingerprints and forced digest-collision detection, count-only
privacy, explicit bounded SELECT reads, mutation rejection and absence of
identity/persistence/logging dependencies. A first test run found an overbroad
safety assertion that treated the SHA-256 update method as a database write;
the assertion was corrected and the entire required suite passed.

Existing unrelated auth edits participate in working-tree validation but are
excluded from this task's commit. Their original file hashes remain unchanged.

## Business/Admin decisions before Task 07P

Confirm what Manager values represent and the authoritative identity reference
and verification process. Decide scope boundaries for source, department, catalog
target and approval level; resolve catalog/code collisions and missing evidence.
Specify decision mode (including whether ANY, ALL, sequence, or other routing is
intended), explicit sequence evidence, delegation/escalation if applicable, and
the full Active vocabulary. Establish source keys, sampling completeness, rule
ownership/versioning and change governance before any later activation/import.

Recommendation for Task 07P: define a reviewed business-resolution specification
and synthetic acceptance cases for these unresolved decisions. Do not build an
active approval engine or automatic identity mapping from these observations.
Task 07O does not start Task 07P.
