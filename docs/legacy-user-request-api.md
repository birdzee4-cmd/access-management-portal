# Legacy User Request List API

## Endpoint and authorization

```text
GET /api/legacy/user-requests
```

The endpoint requires a valid Microsoft Entra access token and the Admin role.
Viewer and Approver roles receive HTTP 403, and missing or invalid
authentication receives HTTP 401. Authorization is checked before query parsing
and before constructing the lazy legacy SQL service.

## Allowlisted query parameters

| Parameter | Required | Validation | Source comparison |
| --- | --- | --- | --- |
| `limit` | No | Integer 1–50; default 20 | `TOP (@limit)` |
| `system` | No | Nonblank text, at most 200 characters | Trimmed `SystemProgram` exact match |
| `country` | No | Nonblank text, at most 100 characters | Trimmed `Country` exact match |
| `vstsStatus` | No | Nonblank text, at most 200 characters | Trimmed `StatusVSTS` exact match |
| `department` | No | Nonblank text, at most 200 characters | Trimmed `Department` exact match |

Filter values reject control characters and are trimmed once at the API
boundary. Repeated parameters, unknown parameters, blank values, and
out-of-range values return HTTP 400. The Web UI offers only limits 20 and 50,
while the API retains its existing bounded 1–50 contract.

Filters are exact matches against normalized source text under the configured
SQL Server collation. They are not substring, wildcard, semantic workflow, or
case-normalization searches.

## Query construction and safety

The connector uses one fixed table and an explicit minimized projection. Each
supported filter maps in code to one fixed predicate. Values are supplied as
driver parameters named `@system`, `@country`, `@vstsStatus`, and
`@department`; no value can become a table, column, predicate, ordering, or
SQL fragment.

The query remains:

- SELECT-only and checked by the central read guard;
- bounded with parameterized `TOP (@limit)`;
- fixed to `[dbo].[All_SharepointUserRequest]`;
- free of `SELECT *`, dynamic identifiers, arbitrary WHERE input, wildcard
  search, and `ORDER BY`.

Because the source has no validated stable ordering or typed date semantics,
the response is a bounded result rather than an authoritative total or
complete ordered result set.

## Response and privacy

The response contract remains `LegacyUserRequestListResponse` with
`rowsRead`, `limit`, and normalized request summaries. Filtering does not
add fields to the DTO.

Person, free-text, and infrastructure fields remain outside the SQL projection,
including requester email, creator, line manager, assignment, topic/detail,
server, database, storage, and tenant data. No Microsoft Graph, SharePoint API,
Azure DevOps/VSTS API, Portal database, or Power Automate call is made.

## Error behavior

- HTTP 400: invalid, repeated, or unsupported query input;
- HTTP 401: authentication required;
- HTTP 403: Admin role required;
- HTTP 503: authentication or legacy SQL configuration/unavailability;
- HTTP 500: fail-closed safety or unexpected error.

Responses and logs contain fixed error codes and aggregate counts only. Filter
values, SQL text, connection details, tokens, credentials, and raw rows are not
logged.

## Recommendation

A separately authorized follow-up should establish whether users need a
dedicated bounded filter-vocabulary endpoint or stable pagination. That work
requires data-owner validation of value completeness and ordering and must not
weaken the current exact-match, minimized, read-only boundary.
