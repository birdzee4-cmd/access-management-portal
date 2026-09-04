# Legacy SQL Read-Only Connector Foundation

## Purpose and current scope

Task 07A created the read-only integration boundary, Task 07B performed a controlled health check, Task 07C performed capped discovery, Task 07E exposes an authenticated Admin-only matrix API, and Task 07G adds a backend-only Admin API for a minimized legacy User Request projection. None of these tasks authorizes a legacy write, data import, portal migration, or production-system change.

The existing Power Apps, SharePoint, Power Automate, Azure DevOps / VSTS, and Azure SQL workflow remains unchanged. The required safety controls remain:

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_LEGACY_SQL_WRITE=false
```

All other Production Safety Boundary flags also remain false.

## Separation from the portal database

The normalized new-portal database and legacy SQL are different data domains:

- New portal data uses repository interfaces, Prisma, and the dedicated `DATABASE_URL`.
- Legacy data uses `LegacyCatalogService`, `LegacySqlConnector`, a central read guard, and separate `LEGACY_SQL_*` settings.
- Prisma has no models for legacy tables and must never introspect or migrate legacy SQL.
- Legacy matrix rows are nullable source representations, not portal `Role`, `ApprovalRule`, or `ApprovalRuleApprover` records. A future reviewed interpretation would pass through `LegacySource` and `LegacyApprovalMapping`.

```mermaid
flowchart TD
    API[Portal API] --> Service[LegacyCatalogService]
    Service --> Connector[LegacySqlConnector]
    Connector --> Guard[Read Guard]
    Guard --> Identity[SELECT-only SQL identity]
    Identity --> SQL[(Existing Azure SQL)]

    Connector -. "Task 07A: no connection" .-> Boundary[Activation boundary]
```

No legacy component is constructed by the health endpoint or general API startup. Task 07E creates the runtime service lazily only after a request passes Entra authentication, Admin authorization, and query validation.

## Read-only architecture

`LegacyCatalogService` depends on the read-only connector interface. Its two Task 07E routes expose only matrix rows and sanitized summary methods; there is no HTTP route for generic SQL execution. `LegacySqlConnector` owns lazy pool creation, parameter binding, SELECT execution, safe pool reuse and close behavior, timeout configuration, and safe error translation. Constructing the connector or its `mssql` adapter does not open a connection.

`healthCheck()` is prepared for future explicit activation and uses only:

```sql
SELECT 1 AS ok
```

It is never called automatically at application startup.

## Defense in depth

The application guard is one layer, not the production security boundary:

```text
Application SELECT-only guard
             +
Dedicated SQL login or identity granted SELECT only
             =
Read-only legacy integration
```

Before any live activation, the database owner must provide a dedicated identity restricted to `SELECT` on approved views or tables. It must have no DML, DDL, stored-procedure execution, ownership, impersonation, or broad database role permissions. Network restrictions, secret storage, monitoring, code review, and change approval remain required.

## Central read guard

Every query reaches `assertLegacySqlReadOnlyQuery` before the driver is asked for a request. The guard:

- permits one plain `SELECT` statement;
- permits a single optional trailing semicolon;
- rejects empty or non-`SELECT` input;
- rejects statement chaining and embedded semicolons;
- rejects line and block comments as bypass surfaces;
- rejects mutation, execution, DDL, permission, backup/restore, diagnostic, `SELECT INTO`, session-changing, wait, and external-query keywords.

The rejected vocabulary includes `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `EXEC`, `EXECUTE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `DENY`, `BACKUP`, `RESTORE`, and `DBCC`.

String inspection cannot understand every SQL Server behavior. The SELECT-only database identity is therefore mandatory.

## Supported matrix tables and allowlist

Callers select an internal `MatrixSource`; they never supply a table name:

| Matrix source | Fixed SQL identifier |
| --- | --- |
| `NEW` | `dbo.MatrixProductManagement_new` |
| `TH` | `dbo.MatrixProductManagement_TH` |
| `PH` | `dbo.MatrixProductManagement_PH` |
| `VN_MY_ID` | `dbo.MatrixProductManagement_VN_MY_ID` |

Unknown values fail before query execution. HTTP input must never be interpolated into schema, table, column, ordering, or other SQL identifiers.

Rows preserve the known legacy meanings and tolerate nulls:

```ts
interface LegacyProductManagementMatrixRow {
  roleName: string | null;
  manager: string | null;
  department: string | null;
  active: string | null;
}
```

No migration or normalization occurs in the connector.

## Configuration

Future local-only values belong in the ignored `apps/api/local.settings.json` under:

- `LEGACY_SQL_SERVER`
- `LEGACY_SQL_DATABASE`
- `LEGACY_SQL_USER`
- `LEGACY_SQL_PASSWORD`
- `LEGACY_SQL_ENCRYPT` (default `true`)
- `LEGACY_SQL_TRUST_SERVER_CERTIFICATE` (default `false`)
- `LEGACY_SQL_CONNECTION_TIMEOUT_MS` (default `15000`)
- `LEGACY_SQL_REQUEST_TIMEOUT_MS` (default `30000`)

The tracked `apps/api/local.settings.example.json` contains placeholders only. Real server names, users, passwords, and connection strings must never be added to Git. Legacy SQL never uses the new-portal `DATABASE_URL`.

Configuration validation fails closed when required values are missing, placeholders remain, timeouts are invalid, encryption flags are malformed, `LEGACY_INTEGRATION_MODE` is not `READ_ONLY`, or any capability flag is not exactly `false`.

## Parameterization rules

Dynamic values use named `mssql` request parameters. Parameter names must match a conservative identifier pattern and values are passed separately to the driver. Callers must never concatenate user-controlled values into SQL text.

Fixed identifiers cannot be parameterized by SQL Server, so the connector maps its closed `MatrixSource` union to reviewed constant identifiers. Arbitrary identifiers are rejected.

## Errors and logging

Connector errors expose only stable error codes and generic messages. Raw driver errors are not propagated because they may contain hostnames, usernames, connection details, or sensitive values.

The connector must not log:

- passwords or complete connection strings;
- SQL parameter values that may contain employee or other sensitive data;
- tokens, authorization headers, or secrets;
- raw driver errors without an approved sanitizer.

Operational logs may record a safe connector operation name, result, elapsed time, correlation ID, and generic error code.

## Controlled production validation

Task 07B used ignored local configuration to run the connector's single `SELECT 1 AS ok` health check successfully. The pool was closed afterward; no business table was queried and no tracked configuration changed.

Task 07C then added a hard, parameterized maximum of 50 rows to matrix reads and queried only the four fixed Product Management matrix identifiers. Automated tests continue to use injected fake drivers. The sanitized aggregate findings and mapping recommendations are recorded in [Legacy Product Management Matrix Discovery](legacy-role-matrix-analysis.md).

Task 07E adds:

- `GET /api/legacy/matrix?source=<SOURCE>&limit=<1-50>` with default limit 20;
- `GET /api/legacy/matrix/summary?source=<SOURCE>` with a fixed maximum sample of 50.

Both routes require a valid Entra access token plus the `Admin` role. They accept only `NEW`, `TH`, `PH`, and `VN_MY_ID`, reject unrecognized query parameters, trim returned source strings, mask manager values, use sample terminology, and return sanitized errors/logs. See [Admin-only Legacy Matrix Read API](legacy-matrix-api.md).

Normal `npm test` never connects to production.

Task 07G also uses the same lazy connector for `GET /api/legacy/user-requests`. Its fixed query selects only 13 approved columns from `[dbo].[All_SharepointUserRequest]`, binds `TOP (@limit)`, and omits person, free-text, and infrastructure columns at the SQL projection. Metadata discovery read no business rows and found no primary/unique key, so no detail endpoint was created. See [Legacy User Request Read Integration](legacy-user-request-analysis.md).

## Future production operating requirements

Any additional activation must still:

1. confirm source ownership, stable keys, and approved schemas and columns;
2. use a database identity restricted to SELECT;
3. keep real local values only in ignored `apps/api/local.settings.json` and hosted secrets in an approved secret store;
4. verify network restrictions, encryption, certificate policy, and timeouts;
5. review and cap every query template;
6. use non-production fixtures for automated tests;
7. avoid automatic startup queries;
8. authorize any future API route on the backend, minimize returned employee data, and add safe audit/monitoring;
9. validate that all write flags remain false and that the identity cannot mutate data;
10. obtain change, data-owner, and security approval before expanding production use.
