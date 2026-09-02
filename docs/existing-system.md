# Existing system

## Current production platform

The company has a working production access-request system built with:

- Power Apps
- SharePoint
- Power Automate
- SQL Server
- Azure DevOps / VSTS

It remains operational and authoritative. This project does not replace, modify, migrate, or synchronize it during the initial phase.

## Allowed interactions

There are no live interactions in the initial skeleton. A later, separately approved pilot may read a limited set of Azure DevOps / VSTS data through a least-privilege connector. SharePoint and existing SQL Server integrations, if approved later, must also be query-only.

## Prohibited interactions

- Creating, updating, or deleting SharePoint content
- Running `INSERT`, `UPDATE`, `DELETE`, `MERGE`, DDL, or stored procedures with side effects against existing SQL Server
- Creating or editing Azure DevOps / VSTS work items, including closing them
- Changing Azure DevOps memberships, permissions, repositories, or pipelines
- Provisioning or revoking access
- Editing, enabling, disabling, or triggering Power Automate flows
- Migrating production data

## Integration admission checklist

Before a live read-only connector is introduced, document and approve:

1. Business owner and data owner
2. Exact data fields and business purpose
3. Read-only API scopes or database grants
4. Non-production test endpoint and synthetic test data
5. Query limits, caching, retries, and failure isolation
6. Sensitive-data handling and log redaction
7. Audit evidence showing no mutation capability
8. Rollback and connector-disable procedure

Write capability is outside the scope of this checklist and requires a new design and explicit authorization.
