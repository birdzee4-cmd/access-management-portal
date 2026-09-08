import type { AuthenticatedIdentityResponse } from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { PortalRole } from "../auth/types.js";
import { LoginPage, PortalView } from "./PortalApplication.js";

const noOperation = async () => undefined;
const portalApi = {
  getLegacyMatrixRows: async () => {
    throw new Error("Not called during server rendering.");
  },
  getLegacyMatrixSummary: async () => {
    throw new Error("Not called during server rendering.");
  },
  getLegacyUserRequests: async () => {
    throw new Error("Not called during server rendering.");
  },
  getLegacyUserRequestDetail: async () => {
    throw new Error("Not called during server rendering.");
  },
};
const requestApi = {
  catalog: async () => ({ roles: [] }),
  list: async () => ({ requests: [] }),
  detail: async () => { throw new Error("Not called during server rendering."); },
  submit: async () => { throw new Error("Not called during server rendering."); },
};
const productManagementApi = {
  list: async () => ({ source: "MOCK" as const, requests: [] }),
  countries: async () => ({ source: "MOCK" as const, countries: [] }),
  topics: async (country: string) => ({ source: "MOCK" as const, country, topics: [] }),
  form: async () => ({ country: "Thailand", topic: "Create New Account (ลูกค้าใหม่)", schema: { legacyScreenPattern: "{CC}_สร้างAccountลูกค้า", legacyFormPattern: "Form* (DataSource: USR_PowerApp)", lookupRequirements: [], implementationStatus: "PARTIAL" as const, partialReasons: ["UNKNOWN_SUBMISSION_MAPPING" as const] }, fields: [] }),
  lookup: async (lookup: string) => ({ source: "MOCK" as const, lookup, options: [] }),
  submit: async () => { throw new Error("Not called during server rendering."); },
};

function identity(roles: readonly PortalRole[]): AuthenticatedIdentityResponse {
  return {
    authenticated: true,
    displayName: "Taylor Demo",
    email: "taylor.demo@example.invalid",
    roles,
  };
}

function renderPortal(path: string, roles: readonly PortalRole[]): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <PortalView
        identity={identity(roles)}
        onSignOut={noOperation}
        api={portalApi}
        requestApi={requestApi}
        productManagementApi={productManagementApi}
      />
    </MemoryRouter>,
  );
}

test("unauthenticated user sees Microsoft sign in", () => {
  const html = renderToStaticMarkup(
    <LoginPage state="unauthenticated" onLogin={noOperation} />,
  );

  assert.match(html, /Sign in with Microsoft/);
  assert.doesNotMatch(html, /Portal navigation/);
});

test("authenticated user sees the portal dashboard", () => {
  const html = renderPortal("/", ["Viewer"]);

  assert.match(html, /Access Management Portal/);
  assert.match(html, /Dashboard/);
  assert.match(html, /Taylor Demo/);
  assert.match(html, /Local pilot/);
});

test("Admin sees Phase-1 Admin navigation only", () => {
  const html = renderPortal("/", ["Admin"]);

  assert.doesNotMatch(html, />Users</);
  assert.doesNotMatch(html, />Automation Jobs</);
  assert.match(html, />Audit Logs</);
  assert.match(html, />Settings</);
});

test("Viewer does not see Admin-only navigation", () => {
  const html = renderPortal("/", ["Viewer"]);

  assert.doesNotMatch(html, />Users</);
  assert.doesNotMatch(html, />Automation Jobs</);
  assert.doesNotMatch(html, />Audit Logs</);
  assert.doesNotMatch(html, />Settings</);
  assert.doesNotMatch(html, />Legacy Requests</);
});

test("Approver does not see feature-hidden access navigation", () => {
  const html = renderPortal("/", ["Approver"]);

  assert.doesNotMatch(html, />Approvals</);
  assert.doesNotMatch(html, />Users</);
});

test("Viewer does not see Approvals navigation", () => {
  const html = renderPortal("/", ["Viewer"]);

  assert.doesNotMatch(html, />Approvals</);
});

test("safety settings are displayed as read-only and disabled", () => {
  const html = renderPortal("/settings", ["Admin"]);

  assert.match(html, /Production Safety Boundary enforced/);
  assert.match(html, /Legacy Integration Mode/);
  assert.match(html, /READ_ONLY/);
  assert.match(html, /SharePoint Write/);
  assert.match(html, /Automation/);
  assert.match(html, /Disabled/);
  assert.match(html, /No controls available/);
  assert.doesNotMatch(html, /type="checkbox"/);
});

test("Phase-1 Product Management routes render for Admin", () => {
  const routes = [
    ["/", "Dashboard"],
    ["/requests", "My Requests"],
    ["/requests/new", "New Request"],
    ["/admin/resolution", "Request Workspace"],
    ["/audit-logs", "Audit Logs"],
    ["/settings", "Settings"],
  ] as const;

  for (const [path, heading] of routes) {
    assert.match(renderPortal(path, ["Admin"]), new RegExp(heading));
  }
});

test("direct navigation to a restricted route shows the access-denied state", () => {
  const html = renderPortal("/settings", ["Viewer"]);

  assert.match(html, /Page not available/);
  assert.doesNotMatch(html, /Production Safety Boundary enforced/);
});

test("legacy request detail route is Admin-only before any detail request", () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const html = renderPortal("/legacy-requests/42", [role]);
    assert.match(html, /Page not available/);
    assert.doesNotMatch(html, /Loading legacy request/);
  }
});

test("legacy request list route is Admin-only before any list request", () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const html = renderPortal("/legacy-requests", [role]);
    assert.match(html, /Page not available/);
    assert.doesNotMatch(html, /Loading legacy requests/);
  }
});

test("non-Admin catalog view explains the Legacy Matrix restriction", () => {
  const html = renderPortal("/catalog", ["Viewer"]);

  assert.match(html, /Legacy Role Matrix/);
  assert.match(html, /Administrator access is required/);
  assert.doesNotMatch(html, /Legacy matrix source/);
});
