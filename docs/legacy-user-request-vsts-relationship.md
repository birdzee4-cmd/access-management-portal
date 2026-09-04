# Legacy User Request ↔ VSTS Relationship Discovery

## Scope and safety boundary

Task 07H is discovery only. On 2026-09-04, the existing `LegacySqlConnector`
and central SELECT-only guard were used for metadata queries, aggregate queries,
and one bounded `TOP (@limit)` validation with a maximum of 10 rows per source.
No raw production row or identifier was printed, logged, persisted, or committed.
SharePoint and Azure DevOps/VSTS APIs were not called.

The required configuration remains unchanged:

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
```

The code added here exposes no HTTP endpoint. It provides only fixed-table
metadata queries, minimal bounded projections, normalization, and a count-only
relationship summary. The central read guard still rejects mutations,
multi-statement SQL, comments, `SELECT INTO`, stored procedure execution, and
DDL.

## Schema summary

### `dbo.All_SharepointUserRequest`

The 32-column schema discovered in Task 07G was reconfirmed. Every column is
nullable and there is no primary key or unique index.

| Group | Columns and SQL types |
| --- | --- |
| Candidate identifiers | `IDSharepoint varchar(50)`, `Work_ID varchar(50)`, `IDSHARE_INT int`, `SQLReference varchar(50)` |
| Request classification | `Type varchar(50)`, `SystemProgram varchar(200)`, `Permission varchar(150)`, `TypeALL varchar(200)`, `SubType varchar(200)` |
| Organization/context | `Company varchar(50)`, `Department varchar(200)`, `Country varchar(100)`, `Zone varchar(50)` |
| Workflow | `Special_Case varchar(50)`, `StatusLineManager varchar(100)`, `StatusCEOApprove varchar(100)`, `StatusITManager varchar(100)`, `SQLSpecial_Case varchar(50)`, `OpenCase varchar(50)`, `StatusVSTS varchar(200)` |
| Time text | `CreateDate varchar(200)`, `UpdateDate varchar(100)` |
| Sensitive/omitted | `CreateBy varchar(200)`, `RequestEmail varchar(200)`, `TopicRequest nvarchar(1000)`, `Servername varchar(max)`, `DBName varchar(max)`, `StorageName varchar(max)`, `Tanant varchar(500)`, `Detail nvarchar(max)`, `LineManager varchar(100)`, `Assign varchar(200)` |

### `dbo.All_Azure_Dev(VSTS)`

The VSTS backup has 18 nullable columns. Metadata reported no primary key or
unique index.

| Ordinal | Column | SQL type | Relationship relevance |
| ---: | --- | --- | --- |
| 1 | `Type` | `varchar(100)` | Descriptive candidate; not a key |
| 2 | `Title` | `nvarchar(max)` | Free text; omitted from validation |
| 3 | `Description` | `nvarchar(max)` | Free text; omitted from validation |
| 4 | `State` | `varchar(50)` | Candidate source for SharePoint `StatusVSTS` |
| 5 | `Assign` | `varchar(200)` | Person/queue-related; omitted |
| 6 | `CreateBy` | `varchar(200)` | Person-related; omitted |
| 7 | `Owner` | `varchar(50)` | Person/queue-related; omitted |
| 8 | `Priority` | `varchar(100)` | Descriptive |
| 9 | `ImpactCase` | `varchar(200)` | Descriptive |
| 10 | `SystemProgram` | `varchar(200)` | Descriptive comparison field |
| 11 | `TypeALL` | `varchar(200)` | Descriptive comparison field |
| 12 | `SubType` | `varchar(200)` | Descriptive comparison field |
| 13 | `Permission` | `varchar(200)` | Descriptive comparison field |
| 14 | `RequestEmail` | `varchar(200)` | Person-related; omitted |
| 15 | `Work_ID` | `int` | VSTS Work Item identifier candidate |
| 16 | `IDSharepoint` | `int` | SharePoint request reference candidate |
| 17 | `UpdateDate` | `datetime` | VSTS backup timestamp candidate |
| 18 | `CreateDate` | `datetime` | VSTS backup timestamp candidate |

## Candidate relationship keys

| Mapping | Finding | Classification |
| --- | --- | --- |
| SharePoint `Work_ID` ↔ VSTS `Work_ID` | 12,263 normalized values occur on both sides. Types differ, so SharePoint text must be trimmed and safely converted to the VSTS integer domain. | **CONFIRMED** |
| SharePoint `IDSharepoint`/`IDSHARE_INT` ↔ VSTS `IDSharepoint` | 13,909 normalized request IDs occur on both sides. VSTS repeats this value because one request can be represented by multiple VSTS rows. | **CONFIRMED** as a request reference; **CONTRADICTED** as a unique VSTS-row key |
| SharePoint `StatusVSTS` ↔ VSTS `State` | 10,959 of 12,024 comparable Work-ID-matched row pairs agree after trim/case normalization; 1,065 differ. This supports copying/synchronization but cannot prove direction or timing. | **LIKELY** |
| `TypeALL`, `SubType` | Frequently agree for Work-ID matches but are descriptive, mutable values. | **CONTRADICTED** as relationship keys |
| `Type`, `SystemProgram`, `Permission` | Agreement is absent or too sparse to act as a key. | **CONTRADICTED** as relationship keys |
| SharePoint `OpenCase` ↔ VSTS `State` | No vocabulary mapping was exposed by count-only checks. | **UNKNOWN** |

`IDSharepoint` is a request-level reference; `Work_ID` is a work-item-level
reference. They are related but are not interchangeable.

## Aggregate uniqueness, null, and match findings

All values below are counts only.

| Measure | SharePoint backup | VSTS backup |
| --- | ---: | ---: |
| Total rows | 14,463 | 44,461 |
| Non-null/non-blank `Work_ID` rows | 13,781 | 44,456 |
| Distinct `Work_ID` | 13,772 | 44,450 |
| Null/blank `Work_ID` rows | 682 | 5 |
| Duplicate `Work_ID` keys | 5 | 6 |
| Non-numeric non-blank SharePoint `Work_ID` | 0 | Not applicable (`int`) |
| Non-null/non-blank `IDSharepoint` rows | 14,463 | 25,380 |
| Distinct `IDSharepoint` | 14,463 | 15,345 |
| Null/blank `IDSharepoint` rows | 0 | 19,081 |
| Duplicate `IDSharepoint` keys | 0 | 3,358 |

The SharePoint snapshot's `IDSharepoint` is complete, numeric, and
observationally unique. `IDSHARE_INT` is also complete and distinct, and agrees
with normalized `IDSharepoint` on all 14,463 rows. This is strong snapshot
evidence, but the database supplies no primary-key or unique-index guarantee.

For normalized `Work_ID`, 12,263 distinct keys matched, producing 12,272 row
pairs. This leaves 1,509 SharePoint Work IDs without a VSTS-backup match and
32,187 VSTS Work IDs without a SharePoint-backup match. A missing match may be
historical, out of scope, deleted from one snapshot, or created by a different
workflow; its cause remains **UNKNOWN**.

## Cardinality

Grouped by matched normalized `Work_ID`:

| Cardinality | Matched keys | Classification |
| --- | ---: | --- |
| 1 SharePoint row → 1 VSTS row | 12,258 | **CONFIRMED** dominant relationship |
| 1 SharePoint row → many VSTS rows | 0 | Not observed; **UNKNOWN** as a permanent invariant |
| many SharePoint rows → 1 VSTS row | 5 | **CONFIRMED** exception |
| many SharePoint rows → many VSTS rows | 0 | Not observed; **UNKNOWN** as a permanent invariant |

Grouped by matched normalized `IDSharepoint`, 10,733 request IDs were one to
one and 3,176 were one SharePoint row to many VSTS rows. This confirms that
VSTS `IDSharepoint` identifies the originating request rather than a unique
VSTS row.

When joining by `Work_ID`, `IDSharepoint` agreed on 11,997 of 12,272 row pairs.
The remaining disagreement means consumers must not require both keys to agree
silently. A future detail API should report an internal data-quality conflict
without exposing the conflicting production values.

## Status and lifecycle findings

The evidence supports this lifecycle with explicit confidence labels:

```text
SharePoint User Request
  ├─ IDSharepoint identifies the request in the current snapshot [CONFIRMED]
  └─ Work_ID references a VSTS Work Item                       [CONFIRMED]
       ↓
VSTS backup row and State                                      [CONFIRMED]
       ↓
Legacy SQL backup/synchronization timing                        [UNKNOWN]
       ↓
SharePoint StatusVSTS reflects VSTS State                       [LIKELY]
```

The existing workflow inventory says Power Automate reads
`Custom_IDSharepoint` from the VSTS item and copies `System_State` into
SharePoint `StatusVSTS`. The aggregate agreement supports that description.
The 1,065 comparable mismatches prevent classifying the copied status as a
current, transactionally consistent value. Backup timing, later transitions,
manual maintenance, and historical workflow variants remain possible.

## Privacy and logging

The bounded projections select only `IDSharepoint`, `Work_ID`,
`SystemProgram`, `Permission`, and the status field. They omit emails, creator,
owner, assignee, title, description/detail, manager, server, database, storage,
and tenant fields. Raw projections remain in memory only long enough to produce
counts and classifications. The returned relationship summary contains no
source values and is safe to log; production rows themselves are not.

Metadata contains structure rather than employee/request content. Aggregate
queries return counts only. Documentation and tests contain synthetic values
only.

## Canonical identifier recommendation

The Portal should retain its own generated immutable request ID as the
canonical internal identifier. Preserve the legacy SharePoint identity as a
scoped external reference:

```text
sourceSystem = SHAREPOINT_USER_REQUEST
externalId  = normalized IDSharepoint
```

For a future legacy-only detail route, normalized `IDSharepoint` is the best
path identifier because it is complete and unique in the current SharePoint
snapshot and agrees exactly with `IDSHARE_INT`. It must not be promoted to a
database-enforced invariant. The lookup should bind the identifier as a
parameter, use the fixed SharePoint table, read at most two rows, and fail
closed if zero or multiple rows are returned. `Work_ID` should remain an
Azure DevOps external reference, not the Portal request key.

## Recommendation for Task 07I

There is enough evidence to **design** `GET /api/legacy/user-requests/:id`, but
Task 07H does not implement it. Task 07I should:

1. use normalized `IDSharepoint` as the legacy route identifier and preserve a
   Portal-generated ID for any future persisted Portal record;
2. use a fixed, explicit, privacy-reviewed projection and `TOP (@limit)` with a
   hard limit of two for ambiguity detection;
3. require the existing Admin authentication/authorization boundary and
   `Cache-Control: no-store`;
4. return not-found for no row and a sanitized conflict/error for duplicates;
5. expose `Work_ID` only as a passive external reference and never call VSTS;
6. keep all write/provisioning/automation flags false and add no generic SQL,
   SharePoint, VSTS, or Portal-database write path.

## Production safety verification

| Check | Result |
| --- | --- |
| Production data modified | **NO** |
| SharePoint queried directly / modified | **NO / NO** |
| VSTS/Azure DevOps API queried directly / modified | **NO / NO** |
| Power Automate modified | **NO** |
| Portal database modified | **NO** |
| Legacy SQL writes | **NO** |
| Legacy SQL metadata reads | **YES** |
| Legacy SQL bounded relationship validation | **YES**, maximum 10 rows per table |
| Legacy SQL aggregate reads | **YES**, counts only |
| Raw production rows persisted / committed / logged | **NO / NO / NO** |
| Safety flags changed or enabled | **NO** |
