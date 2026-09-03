# Local Development Data Layer

## Scope

Task 04 prepares a data-access boundary for the NEW ACCESS MANAGEMENT PORTAL only. It does not implement request submission, approvals, provisioning, revocation, automation, authentication, or any live legacy integration.

The Prisma schema remains the Task 03 normalized SQL Server design. No migration was created or executed.

## Portal database flow

~~~mermaid
flowchart LR
    API[Future Azure Function handler] --> Service[API service boundary]
    Service --> Port[Repository interface]
    Port --> Repository[Prisma repository implementation]
    Repository --> Client[Shared Prisma client]
    Client --> PortalDB[(New portal SQL Server database)]
~~~

The database workspace owns the Prisma client and repository contracts. The API workspace owns the minimal service boundaries and composition root. An API handler can request the data-layer container later, but the existing health handler does not initialize Prisma or require DATABASE_URL.

### Prisma client

- getPrismaClient returns one process-wide Prisma client.
- DATABASE_URL is read from the environment only.
- A missing or blank DATABASE_URL produces a clear error before a client is returned.
- The module contains no embedded host, username, password, token, or production fallback.
- Creating the client does not run migrations and does not query a database.
- No automatic migration or seed behavior runs during API startup.

The local placeholder URL used by validation and generation commands is explicitly non-production and is passed only to Prisma's static tooling.

### Repository boundary

Repository interfaces and Prisma implementations exist for:

- User
- Department
- System
- Role
- AccessRequest
- Approval
- ExternalReference
- AuditLog

The repositories contain persistence and query concerns only. They do not contain approval policy, provisioning logic, legacy synchronization, or HTTP behavior. AuditLog exposes an append operation and intentionally exposes no update or delete operation.

### Service boundary

The API provides four dependency-injected service classes:

- CatalogService
- AccessRequestService
- ApprovalService
- AuditService

Each class depends on repository interfaces, so tests can use in-memory mocks without opening a database connection. These are structural boundaries for future handlers, not implemented application features or workflows.

## Legacy isolation

~~~mermaid
flowchart LR
    FutureReader[Future read use case] --> ReadPort[Read-only connector interface]
    ReadPort --> SQL[Legacy SQL]
    ReadPort --> SP[SharePoint]
    ReadPort --> ADO[Azure DevOps / VSTS]

    Service[Portal database services] --> PortalDB[(New portal database)]

    style SQL stroke:#b91c1c
    style SP stroke:#b91c1c
    style ADO stroke:#b91c1c
~~~

The two flows are intentionally separate:

- Portal repositories can access only the new normalized portal database through Prisma.
- Legacy SQL, SharePoint, and Azure DevOps each have a dedicated read-only interface under packages/connectors.
- No concrete legacy client exists.
- Connector contracts contain no create, update, delete, close, provision, revoke, or automation method.
- ExternalReference stores correlation identifiers in the new portal database; it does not grant permission to contact or mutate an external system.

The Production Safety Boundary remains:

~~~text
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
~~~

## Local SQL Server limitation

No SQL Server instance was installed, provisioned, or contacted in Task 04. Prisma format, generation, and validation are static local operations and do not open a remote database connection.

To exercise Prisma repositories later, a developer will need:

1. An explicitly approved local SQL Server instance.
2. A local-only DATABASE_URL stored outside version control.
3. A reviewed migration for the new portal schema.
4. A local seed loader with safeguards that reject remote, legacy, and production targets.

Until those prerequisites exist, repository integration tests that require SQL Server remain intentionally out of scope.

## Development seed fixture

database/seed/development.seed.json contains synthetic data only:

- demo IT and Operations departments;
- fake requester, target user, and approver/manager identities;
- Azure DevOps, WMS, and OMS catalog examples;
- roles, permissions, role-permission mappings, and an approval matrix;
- one fake ADD request, one item, and one pending approval;
- DEV-SP-1001 and DEV-ADO-2001 external references;
- one append-oriented audit event.

The fixture is declarative. There is no executable seed command, so Task 04 cannot write it to any database.

## Testing strategy

Unit tests cover configuration failure and service-to-repository delegation. Service tests inject repository mocks and use no network, Prisma query, SQL Server, or external service. Live database and legacy connector tests are excluded until separately authorized infrastructure exists.
