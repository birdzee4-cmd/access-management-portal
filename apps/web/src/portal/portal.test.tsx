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

test("Admin sees all Admin navigation", () => {
  const html = renderPortal("/", ["Admin"]);

  assert.match(html, />Users</);
  assert.match(html, />Automation Jobs</);
  assert.match(html, />Audit Logs</);
  assert.match(html, />Settings</);
});

test("Viewer does not see Admin-only navigation", () => {
  const html = renderPortal("/", ["Viewer"]);

  assert.doesNotMatch(html, />Users</);
  assert.doesNotMatch(html, />Automation Jobs</);
  assert.doesNotMatch(html, />Audit Logs</);
  assert.doesNotMatch(html, />Settings</);
});

test("Approver sees Approvals navigation", () => {
  const html = renderPortal("/", ["Approver"]);

  assert.match(html, />Approvals</);
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

test("every Task 06 page route renders for Admin", () => {
  const routes = [
    ["/", "Dashboard"],
    ["/requests", "My Requests"],
    ["/catalog", "Access Catalog"],
    ["/approvals", "Approvals"],
    ["/users", "Users"],
    ["/legacy-requests", "Legacy Requests"],
    ["/automation-jobs", "Automation Jobs"],
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

test("non-Admin catalog view explains the Legacy Matrix restriction", () => {
  const html = renderPortal("/catalog", ["Viewer"]);

  assert.match(html, /Legacy Role Matrix/);
  assert.match(html, /Administrator access is required/);
  assert.doesNotMatch(html, /Legacy matrix source/);
});
