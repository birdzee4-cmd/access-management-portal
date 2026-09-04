import type {
  LegacyUserRequestListResponse,
  LegacyUserRequestSummary,
} from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { AuthApiError } from "../auth/authApi.js";
import {
  DEFAULT_LEGACY_REQUEST_LIST_LIMIT,
  LegacyRequestListView,
  canViewLegacyRequestList,
  legacyRequestListErrorState,
  loadLegacyRequestListForRoles,
  normalizeLegacyRequestListLimit,
  type LegacyRequestListApi,
  type LegacyRequestListViewState,
} from "./LegacyRequestsPage.js";

const syntheticRequest: LegacyUserRequestSummary = {
  externalRequestId: "42",
  workItemId: "7001",
  company: "Example Company",
  department: "Example Department",
  country: "Example Country",
  system: "Example System",
  permission: "Example Permission",
  lineManagerApprovalStatus: "SOURCE_MANAGER_VALUE",
  ceoApprovalStatus: "SOURCE_CEO_VALUE",
  itManagerApprovalStatus: "SOURCE_IT_VALUE",
  vstsStatus: "SOURCE_VSTS_VALUE",
  createdDateText: "SOURCE_CREATED_TEXT",
  updatedDateText: "SOURCE_UPDATED_TEXT",
};

function response(
  limit: 20 | 50 = 20,
  requests: readonly LegacyUserRequestSummary[] = [syntheticRequest],
): LegacyUserRequestListResponse {
  return {
    rowsRead: requests.length,
    limit,
    requests,
  };
}

function recordingApi(calls: number[]): LegacyRequestListApi {
  return {
    getLegacyUserRequests: async (limit) => {
      calls.push(limit);
      return response(limit);
    },
  };
}

function renderView(state: LegacyRequestListViewState): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LegacyRequestListView
        state={state}
        limit={20}
        onLimitChange={() => undefined}
        onRefresh={() => undefined}
      />
    </MemoryRouter>,
  );
}

test("Admin loads the real-list API with the default bounded limit 20", async () => {
  const calls: number[] = [];
  const loaded = await loadLegacyRequestListForRoles(
    recordingApi(calls),
    ["Admin"],
    DEFAULT_LEGACY_REQUEST_LIST_LIMIT,
  );

  assert.equal(loaded?.rowsRead, 1);
  assert.deepEqual(calls, [20]);
  assert.equal(DEFAULT_LEGACY_REQUEST_LIST_LIMIT, 20);
});

test("the selectable 50-row limit is allowed and larger inputs never reach the API", async () => {
  const calls: number[] = [];
  const api = recordingApi(calls);

  await loadLegacyRequestListForRoles(api, ["Admin"], 50);
  await loadLegacyRequestListForRoles(api, ["Admin"], 51);
  await loadLegacyRequestListForRoles(api, ["Admin"], 500);

  assert.deepEqual(calls, [50, 20, 20]);
  assert.equal(normalizeLegacyRequestListLimit(50), 50);
  assert.equal(normalizeLegacyRequestListLimit(Number.POSITIVE_INFINITY), 20);
  assert.equal(calls.every((limit) => limit <= 50), true);
});

test("Viewer and Approver never request legacy User Request list data", async () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const calls: number[] = [];
    const loaded = await loadLegacyRequestListForRoles(
      recordingApi(calls),
      [role],
      20,
    );

    assert.equal(canViewLegacyRequestList([role]), false);
    assert.equal(loaded, null);
    assert.deepEqual(calls, []);
  }
});

test("loading and safe 401, 403, 503, and generic error states render", () => {
  assert.match(renderView({ kind: "loading" }), /Loading legacy requests/);

  const cases = [
    [401, "Authentication required"],
    [403, "Administrator access is required to view legacy requests"],
    [503, "Legacy request data is temporarily unavailable"],
    [500, "Unable to load legacy requests"],
  ] as const;

  for (const [status, message] of cases) {
    const html = renderView(
      legacyRequestListErrorState(new AuthApiError(status)),
    );
    assert.match(html, new RegExp(message));
    assert.doesNotMatch(
      html,
      /stack trace|connection string|SQL password|Bearer|token|internal exception/i,
    );
  }
});

test("success renders only approved columns and navigates by external request ID", () => {
  const html = renderView({ kind: "success", response: response() });

  for (const value of [
    "42",
    "Example System",
    "Example Permission",
    "Example Department",
    "Example Country",
    "SOURCE_VSTS_VALUE",
    "SOURCE_CREATED_TEXT",
    "SOURCE_UPDATED_TEXT",
  ]) {
    assert.match(html, new RegExp(value));
  }
  assert.match(html, /href="\/legacy-requests\/42"/);
  assert.doesNotMatch(html, /legacy-requests\/7001/);
  assert.doesNotMatch(html, />7001</);
  assert.match(html, /SharePoint-side VSTS Status/);
  assert.match(html, /Timezone unknown/);
});

test("empty success response has a dedicated empty state", () => {
  const html = renderView({
    kind: "success",
    response: response(20, []),
  });

  assert.match(html, /No legacy requests were returned for this bounded read/);
  assert.match(html, /Showing 0 of up to 20/);
});

test("Refresh repeats only the same bounded list request", async () => {
  const calls: number[] = [];
  const api = recordingApi(calls);

  await loadLegacyRequestListForRoles(api, ["Admin"], 50);
  await loadLegacyRequestListForRoles(api, ["Admin"], 50);

  assert.deepEqual(calls, [50, 50]);
});

test("live list view has no mock rows, sensitive fields, or write actions", () => {
  const sensitiveRequest = {
    ...syntheticRequest,
    requestEmail: "HIDDEN_REQUEST_EMAIL_VALUE",
    createBy: "HIDDEN_PERSON_NAME",
    lineManager: "HIDDEN_MANAGER_NAME",
    assign: "HIDDEN_ASSIGNMENT",
    topicRequest: "HIDDEN_TOPIC",
    detail: "HIDDEN_DETAIL",
    servername: "HIDDEN_SERVER",
    dbName: "HIDDEN_DATABASE",
    storageName: "HIDDEN_STORAGE",
    tenant: "HIDDEN_TENANT",
  } as LegacyUserRequestSummary;
  const html = renderView({
    kind: "success",
    response: response(20, [sensitiveRequest]),
  });

  assert.match(html, /Legacy SQL source · Read only/);
  assert.match(html, /Connected \(Read only\)/);
  assert.doesNotMatch(html, /LEG-DEMO|ADO-DEMO|Local mock data|integration not connected/i);
  assert.doesNotMatch(
    html,
    /HIDDEN_REQUEST_EMAIL|HIDDEN_PERSON|HIDDEN_MANAGER|HIDDEN_ASSIGNMENT|HIDDEN_TOPIC|HIDDEN_DETAIL|HIDDEN_SERVER|HIDDEN_DATABASE|HIDDEN_STORAGE|HIDDEN_TENANT/,
  );

  const buttonLabels = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map(
    (match) => match[1]?.replace(/<[^>]+>/g, "").trim(),
  );
  assert.deepEqual(buttonLabels, ["Refresh"]);
  assert.doesNotMatch(
    html,
    />\s*(Create|Edit|Delete|Approve|Reject|Close|Complete|Sync|Reconcile|Provision|Revoke)\s*</i,
  );
});
