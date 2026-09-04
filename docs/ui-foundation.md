# Access Management Portal UI Foundation

## Scope

Task 06 replaces the temporary authentication test page with the first authenticated portal shell. It is a frontend-only foundation: no request workflow, approval decision, database query, connector, provisioning, revocation, automation, Azure resource, or deployment is introduced.

Task 06 business previews continue to use static, obviously synthetic examples.
The explicit legacy exceptions are the Admin-only role-matrix view and the
Task 07K/07L User Request detail and list routes. These consume minimized
read-only DTOs, do not expose person fields, and add no action workflow.

## Application shell

The authenticated layout contains:

- a persistent portal brand and role-aware navigation sidebar;
- a top header with the local-pilot indicator, safe user display name, verified roles, and sign out;
- a responsive main content area with shared page headers, status badges, statistic cards, integration status rows, tables, filters, banners, and empty/access-denied states;
- a compact sidebar at laptop/tablet sizes and horizontally scrollable navigation on small windows.

The shell calls GET /api/auth/me before rendering portal navigation. Authentication failures show a retry/sign-out boundary without loading portal content. Tokens, authorization headers, object identifiers, and raw claims are never rendered.

## Routes and role visibility

| Route | Page | Visible roles |
| --- | --- | --- |
| / | Dashboard | Admin, Approver, Viewer |
| /requests | My Requests | Admin, Approver, Viewer |
| /catalog | Access Catalog | Admin, Approver, Viewer |
| /approvals | Approvals | Admin, Approver |
| /users | Users | Admin |
| /legacy-requests | Legacy Requests | Admin |
| /legacy-requests/:idSharepoint | Legacy User Request detail | Admin |
| /automation-jobs | Automation Jobs | Admin |
| /audit-logs | Audit Logs | Admin |
| /settings | Settings | Admin |

Navigation filtering and frontend route guards improve usability only. They do not authorize API operations. Every future backend operation must independently validate the access token and enforce the required role and business rules.

## Page behavior

- **Dashboard** shows mock summary cards, recent requests, pending approvals, and explicit integration readiness.
- **My Requests** provides client-side search, status filtering, and request-type filtering over mock rows.
- **Access Catalog** previews normalized Azure DevOps, WMS, and OMS role entries without editing.
- **Approvals** previews pending items without Approve or Reject actions.
- **Users** shows synthetic directory rows and makes clear that Microsoft Graph is not connected.
- **Legacy Requests** retrieves up to 20 or 50 minimized summaries through the
  authenticated legacy SQL read-only API, supports Refresh and four
  allowlisted exact-match filters, and links an available external request ID
  to the detail route while preserving URL query state. Filter options come
  from the current bounded response. It has no free-text search, sorting,
  pagination, polling, authoritative total, or write action.
- **Legacy User Request detail** uses the authenticated read-only API for one
  Admin-selected numeric identifier and shows independent source observations,
  all bounded VSTS rows, discrepancy/truncation notes, and no write actions.
- **Automation Jobs** displays disabled illustrative activity and provides no execution control.
- **Audit Logs** shows synthetic append-oriented event examples.
- **Settings** displays mandatory safety configuration as read-only badges with no enabling controls.

## Production Safety Boundary

The UI consistently represents the current safety state:

~~~text
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
~~~

Integration cards state that the new portal database is not connected,
SharePoint/Azure DevOps source APIs are not called, the specifically approved
legacy SQL paths are read-only, and automation is disabled. These labels are
not a substitute for backend enforcement or least-privilege credentials in
future approved phases.
