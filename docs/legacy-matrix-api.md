# Admin-only Legacy Matrix Read API

## Scope

Task 07E exposes two backend-only Azure Functions routes for controlled, bounded reads of the four approved Product Management matrix sources. It does not connect the Web UI, import data, persist an audit record, run a migration, or enable any write/provisioning/automation capability.

The Azure Functions routes use `authLevel: anonymous` only because Microsoft Entra bearer-token validation and role authorization are implemented inside the API. The handlers independently require a valid access token and the `Admin` application role.

## Request flow

```mermaid
flowchart LR
    CLIENT["Browser / API client"]
    JWT["Entra JWT validation"]
    ADMIN["Require Admin"]
    INPUT["Validate source + limit"]
    SERVICE["LegacyCatalogService"]
    CONNECTOR["LegacySqlConnector"]
    GUARD["SELECT-only guard"]
    SQL["Legacy SQL<br/>SELECT-only identity"]

    CLIENT -->|"Bearer access token"| JWT --> ADMIN --> INPUT
    INPUT --> SERVICE --> CONNECTOR --> GUARD --> SQL
```

Authentication, authorization, and input validation complete before the runtime legacy service is created. Connector construction is lazy, and SQL connectivity is not required by builds or automated tests.

## Routes

### `GET /api/legacy/matrix`

Example:

```http
GET /api/legacy/matrix?source=NEW&limit=3
```

Query rules:

| Parameter | Rule |
| --- | --- |
| `source` | Required exactly once. Allowed: `NEW`, `TH`, `PH`, `VN_MY_ID`. |
| `limit` | Optional exactly once. Default 20, minimum 1, maximum 50. Non-integer and out-of-range values return 400. |

Any other query parameter is rejected. Callers cannot provide table names, SQL text, column lists, filters, or ordering. The accepted source key is mapped internally by the connector to a fixed table allowlist, and the limit remains a bound parameter.

The response contains `source`, `rowsRead`, `limit`, and bounded rows. Role, department, and active strings are trimmed; blank values become null. Manager values are returned only as `managerMasked` using the existing Task 07C masking function. Raw manager values are not returned or logged.

### `GET /api/legacy/matrix/summary`

Example:

```http
GET /api/legacy/matrix/summary?source=NEW
```

`source` follows the same allowlist. The endpoint rejects other query parameters and analyzes at most 50 rows through `LegacyCatalogService`.

The response deliberately uses sample terminology:

- `sampleSize`;
- `sampleLimit`;
- `sampleDistinctRoleCount`;
- `sampleDistinctDepartmentCount`;
- `sampleDistinctManagerCount`;
- aggregate active patterns and data-quality/relationship counts.

`sampleSize` is the number of rows read for this bounded request. It is not a table row count and must not be presented as exhaustive profiling.

## Authentication and authorization

- Missing or invalid bearer access token: 401 with a generic error code.
- Valid user without `Admin`: 403.
- `Viewer` and `Approver` alone are not sufficient.
- UI visibility is irrelevant; authorization is enforced by the backend.
- The existing Entra issuer, audience, signature, lifetime, tenant, and `access_as_user` validation is reused. No second authentication mechanism is introduced.

## Safe errors and logs

- Invalid input: 400.
- Authentication or legacy SQL configuration unavailable: 503.
- Legacy SQL connection/query unavailable: 503.
- Unexpected error or an internal safety invariant failure: generic 500.

Responses never include server/database/user names, connection strings, SQL text, stack traces, raw driver errors, JWTs, Authorization headers, or employee/manager identities.

Sanitized logs contain only endpoint code, approved source key, requested/sample limit, rows read, and stable result/error code. Task 07E does not write `AuditLog` because the new portal database is not activated.

## Read-only guarantee

The endpoint can call only `LegacyCatalogService.getMatrixRows` or `getMatrixSummary`. Both delegate to `LegacySqlConnector.listProductManagementMatrix`, which:

1. accepts only the four fixed source keys;
2. builds a fixed explicit-column `SELECT TOP (@limit)` query;
3. binds the row limit as a parameter;
4. passes the query through the central SELECT-only guard;
5. uses the separately configured legacy SQL identity.

There is no HTTP route for `executeSelect` and no arbitrary SQL capability. The required safety state remains:

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_SHAREPOINT_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
```

## Automated and controlled testing

Normal automated tests inject authentication and legacy service fakes. They do not load local credentials or contact legacy SQL.

The separately controlled local check is limited to:

- rows: `source=NEW&limit=3`;
- summary: `source=NEW`;
- an authenticated Entra user with the `Admin` role;
- ignored local configuration with the required read-only safety settings.

No full production rows or raw manager values may be recorded in test output or committed files.
