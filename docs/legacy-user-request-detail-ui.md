# Legacy User Request Detail UI

## Scope

Task 07K adds an Admin-only source-observation page at:

```text
/legacy-requests/:idSharepoint
```

The page consumes the existing authenticated, read-only endpoint:

```http
GET /api/legacy/user-requests/{idSharepoint}
```

It adds no legacy query, source field, Portal persistence, write action,
workflow rule, migration, deployment, SharePoint call, or Azure DevOps/VSTS
API call. The existing Legacy Requests list remains a synthetic preview and is
not linked to a tracked production identifier.

## Authorization and loading

The route is wrapped by the existing `RoleRoute` and requires `Admin`.
Viewer and Approver rendering stops at the access-denied page before the detail
component or API call. Unauthenticated users continue through the existing
Microsoft sign-in flow. Backend authorization remains authoritative.

The page uses `AuthApiClient`, which obtains its bearer token through the
existing MSAL abstraction. The route identifier must contain only positive
decimal digits within the SQL `int` range; it is normalized before the client
performs an authenticated GET.

Refresh repeats only that GET request. Back returns to the existing Legacy
Requests page.

## Source-observation presentation

The header prominently labels the page `READ ONLY` and `LEGACY DATA`. A notice
explains that displayed values are observations from User Request and VSTS
backup data and do not determine the authoritative workflow.

The page displays only fields already present in `LegacyUserRequestDetail`:

- Legacy Request ID, company, department, country, system, and permission;
- unchanged created/updated source text with timezone labeled unknown;
- Line Manager, CEO, and IT Manager fields independently as `OBSERVED` or
  `UNAVAILABLE`;
- the legacy `OpenCase` value and SharePoint-side VSTS status without renaming
  either concept;
- all related VSTS items returned by the bounded API, with Work ID, State, and
  per-item comparison;
- overall `MATCH`, `MISMATCH`, or `UNKNOWN` comparison;
- every existing lifecycle DTO stage as an independent card, with no progress
  connector or required sequence.

When several related rows exist, the page states that multiple VSTS items were
observed and that no primary item is selected. When `truncated` is true, it
states that additional items may exist. A mismatch note says only that values
differ and no reconciliation is performed.

The page does not display or resolve employee identity, email, manager identity,
free text, SQL data, credentials, tokens, or raw database responses.

## Error states

| Result | UI behavior |
| --- | --- |
| Invalid route or HTTP 400 | Invalid legacy request identifier |
| HTTP 401 | Authentication required |
| HTTP 403 | Administrator access required |
| HTTP 404 | Legacy request not found |
| HTTP 409 | Fail closed and explain that multiple records made the request ambiguous |
| HTTP 503 | Legacy data unavailable |
| Other failure | Generic sanitized message |

No error view exposes response bodies, SQL errors, stack traces, tokens,
connection details, or internal exceptions.

## Read-only boundary

The detail view has only Back and Refresh actions. It has no controls for
approval, rejection, retrying source workflow, synchronization, reconciliation,
closing, completion, provisioning, revocation, update, or edit.

The safety settings remain unchanged:

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
```

## Automated verification

Web tests use synthetic DTOs and mocked clients only. They cover Admin loading,
Viewer/Approver non-loading, invalid input, every required HTTP state, partial
approvals, multiple/truncated VSTS results, all comparison labels, unchanged
date text, absence of workflow-ordering claims, the two-action boundary, and
omission of extra sensitive fields. Automated tests do not connect to
production.
