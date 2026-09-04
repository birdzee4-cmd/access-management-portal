# Legacy User Request List UI

## Scope

Task 07L connects the authenticated Portal route:

```text
/legacy-requests
```

to the existing Admin-only endpoint:

```text
GET /api/legacy/user-requests?limit=<20|50>
```

The former production-facing synthetic preview is removed. The page reads
normalized summaries from the guarded legacy SQL integration and can navigate
to the Task 07K detail route. It does not query legacy SQL directly.

## Authorization

- Admin users may load the bounded list and open a detail route.
- Viewer and Approver users are stopped by the client route guard before the
  list page is mounted, so the list API is not requested.
- Unauthenticated users remain in the existing Microsoft sign-in flow.
- The backend validates the access token and Admin role independently and
  remains the authorization boundary.

## Bounded reads and navigation

The initial request uses limit 20. The only other UI selection is 50. The Web
client constructs an authenticated GET with that limit and optional exact-match
`system`, `country`, `vstsStatus`, and `department` values. It exposes no
arbitrary query, free-text search, offset, cursor, sorting, or polling behavior.

Filter controls are dropdowns derived from normalized values in the current
bounded response. They are explicitly described as observed options rather
than a complete source vocabulary. A selected value is sent to the server, so
filtering is not limited to a client-side subset. No production value is
hard-coded.

The selected limit and filters are stored in the browser query string. Unknown,
repeated, blank, overlength, or control-character parameters produce a safe
invalid-filter state before the Web client calls the API. Detail links carry
the validated query string, and the detail page Back action returns to that
list state.

Each usable `externalRequestId` is a client-side link to:

```text
/legacy-requests/:idSharepoint
```

The passive `workItemId` is not displayed and is never used to construct the
route. Invalid or unavailable external request identifiers are not linked.

## Displayed fields

The table displays only the existing minimized list DTO fields:

- external request ID;
- system and permission;
- department and country;
- SharePoint-side VSTS status;
- created and updated source date text.

Source date text is preserved and labeled with unknown timezone. The
SharePoint-side VSTS status is an observation; the UI does not treat it as a
live or authoritative VSTS state.

The list intentionally omits person, free-text, infrastructure, and workflow
detail fields, including requester email, creator, line manager, assignment,
topic/detail text, server, database, storage, tenant, approval values, and
Work Item ID. No Microsoft Graph lookup is performed.

## Read-only and failure behavior

The only list interactions are Refresh, changing the bounded 20/50 limit,
selecting or clearing safe exact filters, and opening an available detail link.
Refresh repeats the same authenticated GET for the selected limit and filters.
There is no background polling and no create, edit, delete, approval,
synchronization, reconciliation, provisioning, revocation, or Work Item
action.

Result copy reports the number of rows returned from the bounded result and
states that additional matching rows may exist when the limit is reached. It
never describes `rowsRead` as a total. No ordering is promised because the
legacy query has no validated `ORDER BY`.

The page provides loading, empty, unauthorized, forbidden, legacy-unavailable,
and generic failure states. Errors use fixed messages and never display SQL
details, exceptions, connection strings, tokens, or raw source rows.

## Integration boundary

The browser calls only the Portal API. The resulting flow is:

```text
Admin browser
  -> authenticated Portal list GET (20 or 50)
  -> guarded SELECT-only legacy SQL connector
  -> normalized summaries
  -> client-side external-request-ID detail route
  -> authenticated Portal detail GET
```

There is no browser or backend call to SharePoint or Azure DevOps/VSTS APIs in
this UI path, no Portal database write, and no Power Automate interaction.

## Tests and next recommendation

Automated tests use synthetic DTOs and mock API clients. They verify Admin and
non-Admin behavior, bounds, states, refresh semantics, privacy omissions,
external-ID navigation, mock-row removal, GET-only client behavior, and the
absence of write actions without requiring production SQL.

A separately authorized follow-up should validate whether a dedicated bounded
filter-vocabulary endpoint or stable pagination is required. Value
completeness, ordering, broader visibility, and new fields require data-owner
review. Write capability remains outside this recommendation and requires its
own security review.
