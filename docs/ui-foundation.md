# Access Management Portal UI Foundation

## Scope

Task 06 replaces the temporary authentication test page with the first authenticated portal shell. It is a frontend-only foundation: no request workflow, approval decision, database query, connector, provisioning, revocation, automation, Azure resource, or deployment is introduced.

All business records shown by the UI are static, obviously synthetic examples. Names use Demo, Example, or Sample labels; email addresses use example.invalid; request, legacy, work-item, job, and correlation identifiers use explicit demo prefixes.

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
| /legacy-requests | Legacy Requests | Admin, Approver, Viewer |
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
- **Legacy Requests** labels its source as not connected and read-only.
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

Integration cards state that the new portal database is not connected, legacy SQL/SharePoint/Azure DevOps are read-only and not connected, and automation is disabled. These labels are not a substitute for backend enforcement or least-privilege credentials in future approved phases.
