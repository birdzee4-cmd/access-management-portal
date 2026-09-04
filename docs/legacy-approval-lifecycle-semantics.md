# Legacy Approval and Lifecycle Semantics

## Scope and safety

Task 07J is a read-only business-semantics investigation over the legacy SQL
backup snapshot observed on 2026-09-04. It adds aggregate-only query builders
and a pure analysis utility for synthetic or explicitly bounded observations.
It adds no endpoint, UI, persistence, workflow rule, source API call, migration,
deployment, or write path.

All production investigation passed through the existing guarded
`LegacySqlConnector`. Queries used fixed, allowlisted tables, explicit
status/reference/time columns, and aggregate results. No production row,
request ID, Work ID, person field, free text, timestamp value, SQL parameter,
or configuration value was logged, saved, or committed.

The safety configuration remains:

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
```

## Classification rules

- **CONFIRMED** means the snapshot directly demonstrates the structural or
  observational statement. It does not automatically prove a business rule.
- **LIKELY** means the association is strong but causality, authority, timing,
  or business intent is not proven.
- **UNKNOWN** means the available fields cannot answer the question.
- **CONTRADICTED** means observed counterexamples disprove the proposed
  universal interpretation for this snapshot.

## Business-question summary

| Business question | Observed evidence | Classification | Portal interpretation | Remaining risk |
| --- | --- | --- | --- | --- |
| Do the three approval fields contain observable stage values? | Each field has a small, countable vocabulary plus NULL/blank values. | **CONFIRMED** | Display the recorded source label per stage. | Labels do not prove approval result semantics. |
| Is Line Manager always populated before VSTS work? | 833 requests have no recorded value; 480 of those have related VSTS rows. | **CONTRADICTED** as a universal recorded-value precondition | Show unavailable when absent; do not call it skipped. | Missing backup data may differ from a stage not being required. |
| Is CEO always populated before VSTS work? | 11,617 requests have no recorded value; 11,078 have related VSTS rows. | **CONTRADICTED** as a universal recorded-value precondition; conditional use is **LIKELY** | Do not require a CEO value to display downstream evidence. | The condition that invokes CEO review is **UNKNOWN**. |
| Is IT Manager always populated before VSTS work? | 981 requests have no recorded value; 483 have related VSTS rows. | **CONTRADICTED** as a universal recorded-value precondition | Preserve the value independently from VSTS data. | Missing does not prove optional or skipped. |
| Is the approval order Line Manager → CEO → IT Manager? | Presence combinations exist, but there is no per-stage timestamp. | **UNKNOWN** | Keep the descriptive stage order only. | Snapshot co-occurrence cannot establish sequence. |
| Does `OpenCase` mean request open/closed? | `COMPLETE` occurs with multiple SharePoint/VSTS statuses, including `NEW`, `ACTIVE`, `PENDING`, and `PROCESSING`. | **CONTRADICTED** as a one-to-one request-state proxy | Display only as recorded `OpenCase`. | Meanings of the correlated statuses are themselves not authoritative. |
| Is `OpenCase` a VSTS-creation or processing marker? | Every `COMPLETE` request has a usable SharePoint Work ID; 13,414 of 13,471 have related VSTS rows. | **LIKELY** | A help label may call it a legacy processing indicator, not completion. | Direction, trigger, and exact operation are unproven. |
| Does SharePoint `StatusVSTS` represent VSTS `State`? | 10,959 of 12,024 comparable Work-ID pairs match; 1,065 differ. | **LIKELY** | Display both and show comparison. | Neither source is proven current or authoritative. |
| Does one request have several VSTS items? | 3,358 request references have multiple VSTS rows; all 3,358 have more than one distinct Work ID. | **CONFIRMED** | Represent every related item. | No primary-item rule is proven. |
| Are multi-row cases backup duplicates? | Zero exact duplicate groups were found across Work ID, Type, State, CreateDate, and UpdateDate. | **CONTRADICTED** for the exact-duplicate explanation used in this test | Do not collapse the rows as duplicates. | Other omitted fields and future snapshots could differ. |
| Is `CLOSED` proven to mean the request completed successfully? | `CLOSED` dominates both status sources and strongly co-occurs with `OpenCase=COMPLETE`, but no success/finality definition exists. | **LIKELY** as a terminal-looking VSTS state; **UNKNOWN** as successful request completion | Display `CLOSED` verbatim, without a success badge. | Closed, completed, rejected, and cancelled semantics are not defined. |
| Do timestamps prove the proposed lifecycle order? | Most comparable VSTS creates follow request creates, but 2,437 of 17,457 comparable pairs do not; 7,477 VSTS rows have UpdateDate earlier than CreateDate. | **CONTRADICTED** as a strict universal sequence | Preserve source timestamps without deriving duration or SLA. | Timezones and legacy date meanings are incomplete. |

## Approval status values

Counts are normalized by trimming and case-folding. NULL and blank remain
separate because they are observably different storage states.

| Stage | Stored category | Count |
| --- | --- | ---: |
| Line Manager | `APPROVE` | 13,494 |
| Line Manager | `REJECT` | 136 |
| Line Manager | blank | 748 |
| Line Manager | NULL | 85 |
| CEO | `ACKNOWLEDGE` | 174 |
| CEO | `APPROVE` | 2,671 |
| CEO | `REJECT` | 1 |
| CEO | blank | 11,500 |
| CEO | NULL | 117 |
| IT Manager | `ACKNOWLEDGE` | 1,569 |
| IT Manager | `APPROVE` | 11,912 |
| IT Manager | `REJECT` | 1 |
| IT Manager | blank | 883 |
| IT Manager | NULL | 98 |

`APPROVE`, `REJECT`, and `ACKNOWLEDGE` are source vocabulary, not Portal
decisions. In particular, `ACKNOWLEDGE` must not be translated to approved or
rejected without business confirmation.

### Approval-presence patterns

These patterns record only whether each field is nonblank; they do not assert
order or dependency.

| Line Manager | CEO | IT Manager | Requests |
| --- | --- | --- | ---: |
| absent | absent | absent | 753 |
| absent | absent | present | 80 |
| present | absent | absent | 226 |
| present | absent | present | 10,558 |
| present | present | absent | 2 |
| present | present | present | 2,844 |

There are no observed patterns with CEO present while Line Manager is absent.
This is consistent with, but does not prove, a prerequisite. There are two
requests with Line Manager and CEO present while IT Manager is absent, so the
three fields do not form a universally complete chain in the snapshot.

## Lifecycle evidence

| Proposed relationship | Evidence | Classification |
| --- | --- | --- |
| Request row has a creation observation | SharePoint `CreateDate` is populated on all 14,463 rows. | **CONFIRMED** as recorded data |
| Request creation precedes approvals | No approval timestamps exist. | **UNKNOWN** |
| All approvals precede VSTS creation | VSTS rows exist when one or more approval fields are absent. | **CONTRADICTED** as a universal recorded-value rule; actual timing **UNKNOWN** |
| Request creation precedes VSTS creation | 15,020 of 17,457 comparable request/VSTS pairs follow this order; 2,437 do not. | **LIKELY**, not invariant |
| VSTS `CreateDate` precedes VSTS `UpdateDate` | 34,945 of 42,422 comparable rows follow this order; 7,477 do not. | **CONTRADICTED** as an invariant |
| SharePoint `CreateDate` precedes SharePoint `UpdateDate` | All 14,463 parseable pairs follow this wall-clock order using the observed formats. | **CONFIRMED** observationally; causal/timezone meaning **UNKNOWN** |
| VSTS state precedes request closure | No authoritative closure field or state transition history exists. | **UNKNOWN** |

The proposed `Created → Approval(s) → VSTS → State → Closed` lifecycle is useful
only as a display grouping. It is not supported as an executable workflow or a
complete historical sequence.

## OpenCase findings

| Normalized storage/value | Requests |
| --- | ---: |
| `COMPLETE` | 13,471 |
| blank | 893 |
| NULL | 98 |
| `REJECT` | 1 |

All 13,471 `COMPLETE` requests have a usable SharePoint Work ID, 13,414 have at
least one VSTS row by request reference, and 12,914 have a nonblank
`StatusVSTS`. However, 494 requests with blank/NULL `OpenCase` also have VSTS
rows. Therefore `OpenCase` is neither required for a VSTS relationship nor an
authoritative VSTS state.

For request-linked VSTS row pairs, `OpenCase=COMPLETE` appears with `CLOSED`
(17,020), `REJECT` (800), `NEW` (114), `DONE` (38), `VERIFIED RESULTS` (26),
`PENDING` (20), `ACTIVE` (8), `PROCESSING` (6), and `TEMPLETE` (1). This broad
co-occurrence contradicts treating `COMPLETE` as a one-to-one synonym for any
VSTS state. The overall meaning remains **UNKNOWN**; a VSTS creation/processing
marker is the strongest **LIKELY** hypothesis.

## StatusVSTS and VSTS State

### SharePoint `StatusVSTS`

| Value | Count |
| --- | ---: |
| `CLOSED` | 11,359 |
| `NEW` | 1,143 |
| `REJECT` | 657 |
| blank | 1,087 |
| NULL | 139 |
| `VERIFIED RESULTS` | 34 |
| `PENDING` | 22 |
| `DONE` | 14 |
| `ACTIVE` | 6 |
| `PROCESSING` | 2 |

### VSTS `State`

| Value | Count |
| --- | ---: |
| `CLOSED` | 40,826 |
| `REJECT` | 1,849 |
| `NEW` | 971 |
| `PENDING` | 436 |
| `DONE` | 253 |
| `ACTIVE` | 34 |
| `VERIFIED RESULTS` | 29 |
| `PROCESSING` | 21 |
| `TEMPLETE` | 19 |
| `WAITING PLAN DEPLOY` | 18 |
| `WAIT CF BY OWNER` | 2 |
| `WAITING CONFIRMATION` | 2 |
| `CONFIRMED` | 1 |

All VSTS rows have a nonblank `State`. Names suggest operational phases, but
the snapshot does not define terminality, success, failure, transition rules,
or authoritative completion. `CLOSED` is **LIKELY** terminal-looking, while
successful request completion remains **UNKNOWN**.

## Multiple VSTS rows

- 3,358 request references map to more than one VSTS row, comprising 13,393
  related rows.
- All 3,358 have multiple distinct Work IDs, strongly confirming separate work
  items rather than repeated copies of one item.
- 198 requests have multiple normalized VSTS Types; 296 have multiple States.
- 3,215 have different creation timestamps and 3,263 have different update
  timestamps, supporting observable ordering but not business priority.
- No related request has a NULL Work ID in this multi-row population.
- Exact grouping on request reference, Work ID, Type, State, CreateDate, and
  UpdateDate found zero duplicate groups and zero extra duplicate rows.
- Multi-row Types are `IT SUPPORT CASE` and `IT DATABASE CASE`; neither name,
  frequency, State, nor timestamp proves a parent/main item.

There is no deterministic primary Work Item rule. The Portal should represent
all related items and retain the existing count/truncation warnings.

## Status mismatch findings

Using the confirmed Work-ID relationship, 12,024 pairs are comparable:
10,959 match and 1,065 mismatch. Using the request-reference relationship,
17,348 pairs are comparable: 15,618 match and 1,730 mismatch.

For the 1,730 request-reference mismatches:

- 842 occur on requests with multiple VSTS rows;
- 1,729 have a nonblank `OpenCase`;
- 1,721 have a Line Manager value, 715 a CEO value, and 1,726 an IT Manager
  value;
- neither SharePoint nor VSTS Work ID is missing on these comparable pairs;
- VSTS `UpdateDate` is later in 901 pairs and SharePoint `UpdateDate` is later
  in 829 pairs, so a single lag direction does not explain the mismatch.

| SharePoint → VSTS mismatch | Pairs |
| --- | ---: |
| `NEW` → `CLOSED` | 1,278 |
| `REJECT` → `CLOSED` | 215 |
| `CLOSED` → `REJECT` | 146 |
| `NEW` → `REJECT` | 27 |
| `CLOSED` → `DONE` | 25 |
| `DONE` → `CLOSED` | 13 |
| Other normalized pairs | 26 |

The mismatch directions, multi-item cases, and two-way timestamp differences
support stale/copy-timing and multiple-item hypotheses, but do not identify one
cause. No reconciliation or modification is authorized.

## Date and timezone findings

| Source field | SQL type | Observed safe pattern | Missing | Timezone conclusion |
| --- | --- | --- | ---: | --- |
| SharePoint `CreateDate` | `varchar(200)` | All 14,463 are 20-character ISO-like `T` + trailing `Z` and parse with style 127. | 0 | A UTC `Z` offset is encoded; original business timezone is **UNKNOWN**. |
| SharePoint `UpdateDate` | `varchar(100)` | All 14,463 use slash-date shapes of length 9 or 16–19; all parse with style 101, while only 4,377 parse with style 103. | 0 | No offset is encoded; timezone is **UNKNOWN**. Month/day/year compatibility is **LIKELY**. |
| VSTS `CreateDate` | `datetime` | Native SQL `datetime`; 42,422 populated. | 2,039 | SQL `datetime` stores no offset; timezone is **UNKNOWN**. |
| VSTS `UpdateDate` | `datetime` | Native SQL `datetime`; 44,456 populated. | 5 | SQL `datetime` stores no offset; timezone is **UNKNOWN**. |

No Task 07J code converts or assigns a timezone. Cross-source timestamp
comparisons are evidence counts only and must not be exposed as SLA durations.

## Confirmed, likely, unknown, and contradicted semantics

### Confirmed

- The three approval columns store observable labels and missing values.
- `IDSharepoint` groups zero-to-many related VSTS rows, and multi-row groups
  represent distinct Work IDs in this snapshot.
- `StatusVSTS` and VSTS `State` can be compared but can disagree.
- SharePoint and VSTS date columns have the SQL types and safe patterns listed
  above.

### Likely

- CEO review is conditional or at least not universally recorded.
- `OpenCase=COMPLETE` is associated with VSTS creation/processing evidence.
- SharePoint `StatusVSTS` is a copied or synchronized view of VSTS `State`.
- `CLOSED` is a terminal-looking VSTS state, without proof of successful
  request completion.
- Most request creation observations precede related VSTS creation.

### Unknown

- Approval order, prerequisites, mandatory/optional rules, and the meaning of
  `ACKNOWLEDGE`.
- Whether missing approvals mean optional, skipped, failed, or incomplete data.
- The authoritative source and refresh timing for status mismatches.
- Exact `OpenCase` business meaning and trigger.
- A primary/main VSTS item, successful completion state, or closure rule.
- UpdateDate timezone, VSTS datetime timezone, and original business timezone.

### Contradicted assumptions

- Every request must contain all three approval values before VSTS work exists.
- `OpenCase` is a one-to-one request open/closed or VSTS-state value.
- Multiple VSTS rows are exact backup duplicates.
- The named date columns provide a universally ordered lifecycle.
- One related VSTS item can safely be selected as primary from current data.

## Portal display boundary

The Portal may safely display the three source approval labels, `OpenCase`,
SharePoint `StatusVSTS`, every bounded VSTS `State`, source date text, all
related Work Items, match/mismatch/unknown comparison, counts, duplicates/null
metadata, and truncation. Labels should say recorded, unavailable, or differs.

The Portal must not claim required, approved, rejected, skipped, complete,
successful, closed request, current/authoritative, primary Work Item, SLA,
duration, or chronological approval order from these fields. It must not merge
statuses, choose a winner, infer permissions, or trigger workflow behavior.

## Decision for the Task 07I lifecycle DTO

**NO change is recommended in Task 07J.** The existing `OBSERVED` and
`UNAVAILABLE` vocabulary is appropriately noncommittal and preserves source
values. A future version may rename the presentation concept from lifecycle to
observations, but that is not necessary for safety and could be a public API
change. Do not add required/approved/completed/skipped/rejected flags.

## Recommendation for Task 07K

If separately approved, Task 07K may add an Admin-only, read-only detail UI
that consumes the existing 07I endpoint. It should present a source-observation
timeline rather than a workflow, list all related VSTS items, show discrepancies
and truncation, leave timestamps unconverted, and link to this confidence
model. Backend Admin authorization remains the security boundary. Task 07K
must not add persistence, reconciliation, write APIs, provisioning, revocation,
or automation.

## Production safety verification

| Check | Result |
| --- | --- |
| Controlled production aggregate analysis | **PERFORMED** |
| Raw production rows logged / persisted / committed | **NO / NO / NO** |
| Production data modified | **NO** |
| Portal database modified | **NO** |
| SharePoint API queried / modified | **NO / NO** |
| Azure DevOps/VSTS API queried / modified | **NO / NO** |
| Power Automate or Power Apps modified | **NO** |
| Legacy SQL writes | **NO** |
| Safety flags changed | **NO** |
