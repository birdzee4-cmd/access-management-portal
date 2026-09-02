# Architecture

## Scope

This phase creates a local, deployable-in-the-future code layout without creating infrastructure or connecting to any external system. Azure DevOps / VSTS is the first planned pilot, but its current contract is query-only.

This document describes the **NEW ACCESS MANAGEMENT PORTAL** architecture. The working **CURRENT PRODUCTION SYSTEM** is a separate architecture domain and remains unchanged. Its components, workflow, correlation identifiers, legacy SQL sources, and safety boundary are documented in [Existing System Architecture Baseline](existing-system.md).

## Logical view

```text
Employee browser
      |
      v
React web application
      |
      v
Azure Functions API  ----> New portal Azure SQL database (future)
      |
      +----> Read-only connector boundary
                 |----> Azure DevOps / VSTS (future)
                 |----> SharePoint (future)
                 `----> Existing SQL Server (future)

Microsoft Entra ID will authenticate users at the web and API boundaries.
```

No arrow in this diagram represents an active integration in the initial skeleton.

## Components

### `apps/web`

A React single-page application built by Vite. It contains a static pilot-status screen only. Entra ID configuration placeholders are present, but no login flow or token acquisition is implemented.

### `apps/api`

An Azure Functions TypeScript application using the v4 programming model. Its anonymous health endpoint has no dependency on a database, cloud resource, or legacy system. Business endpoints will require Entra ID authentication when implemented.

### `packages/contracts`

Framework-neutral TypeScript types shared across boundaries. Keeping transport contracts separate prevents frontend code from importing server or database implementation details.

### `packages/shared`

Cross-cutting safety configuration. Legacy integration settings are parsed with a fail-closed policy: the only accepted mode is `READ_ONLY`, and every capability flag must be the exact value `false`.

### `packages/connectors`

Ports for future legacy integrations. Interfaces expose read operations only and intentionally contain no create, update, delete, close, provision, revoke, or automation methods. Concrete network clients are not part of this phase.

### `database`

A Prisma schema targeting SQL Server for a future, dedicated portal database. It does not describe, introspect, or migrate the existing production SQL Server. The normalized design is documented in [Access Management Portal Data Model V1](data-model.md); no migration has been created or run.

## Data ownership

- The existing platform remains authoritative throughout the pilot.
- The future portal database is a separate bounded store owned by this application.
- Legacy data will be read through explicit connector interfaces, not through shared ORM models.
- No migration from the existing system is authorized in this phase.

## Dependency direction

Applications may depend on packages. `connectors` may depend on `contracts`; contracts do not depend on applications, infrastructure SDKs, or Prisma. This keeps domain boundaries testable and prevents infrastructure code from leaking into the frontend.

## Future decision points

Before any live integration, the team must approve identity flows, authorization roles, network boundaries, audit retention, connector permissions, data classification, and a production-read validation plan. Enabling writes requires a separate project phase and security review; changing an environment variable alone is not sufficient authorization.
