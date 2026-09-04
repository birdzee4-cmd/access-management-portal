# Access Management Portal

Initial local project skeleton for a centralized access-management platform intended to serve approximately 1,000 employees. The first planned pilot integration is Azure DevOps / VSTS.

This repository does **not** connect to production, provision or revoke access, create Azure resources, or deploy anything.

## Safety boundary

The existing Power Apps, SharePoint, Power Automate, SQL Server, and Azure DevOps / VSTS solution remains the system of record. Every legacy integration in this phase is read-only.

The following actions are explicitly prohibited:

- SharePoint writes
- `INSERT`, `UPDATE`, or `DELETE` against the existing SQL Server
- Azure DevOps / VSTS writes or work-item closure
- Access provisioning or revocation
- Power Automate changes or execution

The `.env.example` feature flags disable these operations. The shared safety parser also fails closed: missing, malformed, or permissive values are rejected. Connector contracts expose query operations only.

## Repository layout

```text
apps/
  web/          React + TypeScript + Vite frontend
  api/          Azure Functions + TypeScript backend
packages/
  shared/       Cross-cutting safety configuration
  contracts/    Transport-safe domain contracts
  connectors/   Read-only integration interfaces
database/
  migrations/   Reserved for new-portal migrations only
  schema/       Prisma schema for a new Azure SQL database
  seed/         Synthetic local-development fixtures only
docs/
```

## Prerequisites

- Node.js 22 or later
- npm 10 or later
- Azure Functions Core Tools 4 (only when running the API locally)

No Azure subscription or production credential is required for this skeleton.

## Local setup

```bash
npm install
copy .env.example .env
copy apps/api/local.settings.example.json apps/api/local.settings.json
npm run build
```

On macOS or Linux, use `cp` instead of `copy`.

Run the frontend with `npm run dev:web`. Run the API with `npm run dev:api` after installing Azure Functions Core Tools. `GET /api/health` performs no external I/O.

With placeholder Entra values, the frontend runs in an explicit unconfigured authentication state. Task 05B wires the manually created local Entra registrations to the MSAL client and the protected test endpoints without committing identifiers. Real frontend values belong only in the ignored local `.env`; real API values belong only in the ignored `apps/api/local.settings.json`.

The authentication-only test routes are `GET /api/auth/me` and `GET /api/auth/admin-test`. They do not query SQL or any legacy system.

Task 06 adds the authenticated portal shell, role-aware navigation, responsive page layouts, and clearly synthetic local data. It does not add business operations or external integrations.

Task 07A adds an inactive legacy SQL connector foundation with a central SELECT-only guard, fixed Product Management matrix table allowlist, separate placeholder configuration, and no API route or database connection.

Tasks 07B and 07C validate the connector through a controlled health check and capped, aggregate-only Product Management matrix discovery. No raw production rows, API route, UI integration, migration, or database write is included.

Task 07D refines only the new-portal data model: access catalog, typed contexts, versioned approval rules with multiple approver candidates, and source-aware legacy mapping remain separate. It performs no migration, import, production query, or integration activation.

Task 07E adds backend-only Admin-protected legacy matrix rows and summary routes. Inputs are allowlisted and bounded, manager values are masked, and all access continues through the SELECT-only connector.

Task 07F connects the Access Catalog page to those protected read routes for Admin users only. It adds source selection, bounded 20/50-row views, sampled summary metrics, and sanitized loading/error/empty states. Non-Admin users do not trigger matrix requests, while the API remains the authorization source of truth.

## Validation

```bash
npm run typecheck
npm test
npm run build
npm run prisma:validate
```

`prisma:validate` validates schema syntax only and deliberately forces a local placeholder URL. It never reads a production connection string.

## Documentation

- [Architecture](docs/architecture.md)
- [Security model](docs/security.md)
- [Existing-system boundary](docs/existing-system.md)
- [Data model](docs/data-model.md)
- [Local data-access layer](docs/data-access.md)
- [Authentication foundation](docs/authentication.md)
- [Portal UI foundation](docs/ui-foundation.md)
- [Legacy SQL read-only integration](docs/legacy-sql-integration.md)
- [Legacy role matrix discovery](docs/legacy-role-matrix-analysis.md)
- [Access catalog and approval-rule model](docs/access-catalog-data-model.md)
- [Admin-only legacy matrix API](docs/legacy-matrix-api.md)

## Current non-goals

- Azure resource provisioning
- Deployment pipelines
- Production authentication configuration, app registrations, or credentials
- Live integration clients
- Data migration
- Access approval, provisioning, or revocation workflows
- Automatic database migration or seed execution
