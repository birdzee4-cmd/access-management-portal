# Legacy Matrix to Access Catalog candidates

Task 07N adds an internal, read-only analysis foundation. A candidate is an
observation for review, not a Portal Role, entitlement, approval decision, or
import instruction. The existing Prisma schema is compatible and unchanged.

## Catalog and approval boundary

Catalog asks what access may be requested. Approval asks who approves it.
The new SQL projection contains only RoleName, Department, and Active. It never
selects Manager. Candidate objects are constructed field by field; extra
person fields and source row identifiers are excluded, including from hashes.
There is no connection to ApprovalRule, ApprovalRuleApprover, or an owner field.
LegacyApprovalMapping remains a future provenance/review model, not a persistence
target in this task.

## Evidence and source semantics

| Conclusion | Classification | Evidence and limit |
| --- | --- | --- |
| NEW, TH, PH, VN_MY_ID identify four approved legacy source partitions | CONFIRMED | Fixed connector allowlist and Task 07C discovery |
| These matrices belong to the documented Product Management legacy area | CONFIRMED | Task 07C scope; this is domain context, not an authoritative Portal System identifier |
| Each source identifies a System, Application, country, region, organizational context, or migration generation | UNKNOWN | Names alone do not establish business meaning; NEW is not assumed to mean a new generation |
| Each RoleName is globally unique | CONTRADICTED | Task 07C observed 17 role labels in multiple sources |
| Department is a useful context candidate | LIKELY | Task 07C observed roles with multiple departments, but did not establish entitlement boundaries |
| Department defines a distinct Role or an AccessContext | UNKNOWN | Many-department observations cannot distinguish one shared role from department-specific access |
| RoleName names provisionable access rather than approval-routing categories | UNKNOWN | No authoritative entitlement dictionary is available |
| Active implies a lifecycle action | UNKNOWN | Value observations do not establish deletion, disablement, or revocation semantics |

All four source codes remain LegacySource provenance only. System, Application,
Permission, and AccessContext resolutions are UNRESOLVED. There is no reviewed
System code/identity in this projection. There is no distinct Application or
Permission evidence and no authoritative Role code. Optional context is not
materialized. UNKNOWN evidence is never promoted to a resolved target.

## Normalization and identity

RoleName, Department, and Active use surrounding trim, blank-to-null, and
JavaScript locale-independent `toLowerCase()` for comparison. Internal whitespace,
punctuation, accents, and business wording are preserved. This is a versioned
application comparison policy, not a claim of equivalence with SQL collation or
complete Unicode case folding. Source uses trim and uppercase followed by the
four-value allowlist. Original source and field strings remain separate in memory.

One candidate is returned per observation, including exact duplicates. No
automatic merging occurs. `sourceFingerprint` is SHA-256 of a versioned JSON
tuple of normalized source, role, department, and active. It is an observation
correlation aid, not a source primary key or anonymization guarantee. Identical
normalized observations share a fingerprint and still remain separate entries.

`candidateIdentity` hashes a separate versioned tuple of source, unresolved
system/application/context placeholders, and normalized role. Department and
Active do not define Role identity. The source prevents cross-source collapse.
This is an analysis grouping only; unresolved dimensions and duplicate labels
prevent it from becoming an authoritative identity. A later reviewed Role must
obey the existing System + optional Application + optional AccessContext + code
uniqueness constraint. No production database IDs participate.

## Candidate codes and classification

Nonblank role labels receive a preview code consisting of `CAND_`, the source,
and an uppercase ASCII slug, limited to the existing Role.code length of 100.
Non-ASCII-only labels use the placeholder slug `ROLE`. Punctuation, truncation,
and that fallback can collide. Every generated code is explicitly
GENERATED_CANDIDATE; missing role labels receive no code. Code groups containing
multiple distinct candidate identities produce ROLE_CODE_COLLISION on every
affected observation. No suffix silently resolves the conflict and no candidate
is dropped. Matching codes for the same grouping are repeated observations,
not a distinct-identity code collision.

The internal CatalogCandidate has legacySource, observedSource,
sourceFingerprint, candidateIdentity, original and normalized role/department/
active, four explicit resolution fields, candidateRoleCode and its classification,
observed-role classification, UNKNOWN confidence, classification, and warnings.
Its overall classification is UNRESOLVED or COLLISION; all four dimensions
remain unresolved even when collision warnings are present. No owners, managers,
employees, emails, approval rules, or action flags are included.

## Collision and summary definitions

Collision reports carry warning kinds and candidate array indexes for internal
review, so identical observations are still addressable within one result.
Indexes are not stable source row IDs. Summary counts are counts of groups,
not pair counts, and different collision categories can overlap:

- Multi-source: nonblank normalized role groups with more than one source.
- Multi-department: nonblank normalized role groups across the sample with more
  than one nonblank normalized department. This does not assert shared identity.
- Normalization: nonblank normalized role groups with multiple exact original
  strings, including case and surrounding whitespace variants.
- Code collision: generated codes assigned to multiple distinct candidate identities.
- Active conflict: source + nonblank normalized role groups with more than one
  nonblank normalized Active value, across departments within that source.
  Cross-source status differences are not asserted to be conflicts of one role.
- Unresolved identity and dimension counts: observations, including duplicates
  and missing labels, not an inferred count of unique Portal entities.

Null or blank Department and Active values are missing evidence rather than
additional business values. Missing counts and distinct normalized Active count
are reported. Source Active text remains unchanged in candidates; it never
sets a Portal Boolean or triggers any lifecycle action.

## Internal preview and safety

LegacyCatalogPreviewService is explicitly invoked with the existing guarded
connector's SELECT-only port. It performs one explicit-column, parameterized
TOP read per allowlisted source, bounded to 1–50 rows each (default 50, at most
200 observations). Inputs are validated before I/O. Oversized results and
unsupported scalar values fail closed. No service is registered in an API,
function, application container, UI, scheduler, or startup hook.

The result includes candidates, collision reports, count-only summary, and
per-source counts/limitReached indicators. Samples have no stable ORDER BY;
limitReached means more rows may exist, not a total. Neither a short sample nor
a zero collision count establishes complete vocabulary or global correctness.
Only `summary` may be used for sanitized reporting. Do not log or export the
candidate payload, hashes, collision details, or raw rows from production.

The central SELECT guard, immutable table allowlist, and safety configuration
remain in effect. This task adds no Portal DB persistence, import, Prisma
migration/db push, schema changes, public endpoint, UI, SharePoint/VSTS API call,
Power Automate operation, provisioning, revocation, deployment, or Azure change.

## Controlled production findings — 2026-09-06

The existing guarded connector successfully ran four SELECT-only reads of the
three-column projection with limit 50. Only the following aggregate output was
retained; no production labels, rows, fingerprints, person data, or identifiers
were exported or committed. The connection was closed after analysis.

| Source | Observations | Limit reached |
| --- | ---: | --- |
| NEW | 3 | No |
| TH | 50 | Yes |
| PH | 50 | Yes |
| VN_MY_ID | 50 | Yes |

| Finding | Count |
| --- | ---: |
| Observations / retained candidates | 153 |
| Unique nonblank normalized RoleName values | 48 |
| RoleName groups in more than one source | 17 |
| RoleName groups in more than one department | 20 |
| Original RoleName normalization collision groups | 1 |
| Generated candidate-code collision groups | 2 |
| Conflicting Active groups (within source-role) | 0 |
| All collision/warning groups (categories overlap) | 40 |
| Candidates with collision warnings | 130 |
| Unresolved catalog identities | 153 |
| Unresolved System | 153 |
| Unresolved Application | 153 |
| Unresolved Permission | 153 |
| Unresolved AccessContext | 153 |
| Missing RoleName values | 0 |
| Missing Active values | 0 |
| Unique normalized Active values | 1 |

These are CONFIRMED observations within this bounded sample only. The 20
multi-department groups support observed RoleName-to-many-Department
cardinality; whether they represent shared or department-specific entitlements
remains UNKNOWN. The two code collisions confirm that generated preview codes
must not be accepted as authoritative; all affected candidates remain separate.
No Active conflicts were observed under the defined source-role grouping,
which does not establish complete lifecycle semantics.

The Task 07C normalization metric counted capitalization variants of trimmed
strings per source. Task 07N counts exact original variants including whitespace
across sources. Its normalization collision count is therefore not a direct
comparison with that older metric. Both reads are unordered, point-in-time
samples. Counts cannot be extrapolated to the complete matrices.

## Validation

Synthetic tests exercise trim/blank/case comparison, source allowlisting,
duplicate retention, cross-source and department cardinality, original-name
collisions, punctuation/truncation/non-ASCII generated-code collisions, unresolved
dimensions, Active consistency/conflicts/missing evidence, deterministic
fingerprints, person/row-ID exclusion, explicit-column bounded queries,
SELECT-only rejection, and an internal read-only preview port. No test requires
production SQL.

Validation on 2026-09-06:

| Check | Result |
| --- | --- |
| npm test | PASS: 172/172 (connectors 40, database 6, web 46, API 80); includes 21 new catalog tests |
| npm run typecheck | PASS |
| npm run build | PASS |
| npm run prisma:validate | PASS; local placeholder schema validation only |
| npm audit --audit-level=moderate | PASS: online registry, 0 vulnerabilities |

The initial sandbox attempt could not download the Prisma build engine due to
network restrictions. Network-enabled execution completed all required commands;
an intermediate missing connector export was corrected before the successful
checks. No migration or database push was run. Existing unrelated auth changes
were included in working-tree validation but are excluded from this task's commit.

## Business decisions and Task 07O recommendation

Before Task 07O, owners/Admins must confirm source semantics, authoritative
System/Application identifiers, whether labels represent requestable access,
code ownership, Department/context boundaries, duplicate resolution, complete
Active vocabulary, and whether distinct Permissions exist. Obtain an approved
strategy for stable source keys and complete sampling before any later import.

Task 07O should separately analyze approval provenance and authoritative
approver identity resolution, including multiple candidates and unknown ANY/
ALL/sequential rules. A legacy Manager must not become an authoritative approver
or catalog owner automatically. Task 07N does not begin that work.
