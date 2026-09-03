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

- Node.js 20.19 or later
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

Run the frontend with `npm run dev:web`. Run the API with `npm run dev:api` after installing Azure Functions Core Tools. The only API route is `GET /api/health`; it performs no external I/O.

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

## Current non-goals

- Azure resource provisioning
- Deployment pipelines
- Production authentication configuration or credentials
- Live integration clients
- Data migration
- Access approval, provisioning, or revocation workflows
- Automatic database migration or seed execution
