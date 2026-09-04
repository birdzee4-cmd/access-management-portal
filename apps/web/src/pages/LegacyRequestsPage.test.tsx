import type {
  LegacyUserRequestFilters,
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
  parseLegacyRequestListUrlState,
  serializeLegacyRequestListUrlState,
  type LegacyRequestListApi,
  type LegacyRequestListLimit,
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
  limit: LegacyRequestListLimit = 20,
  requests: readonly LegacyUserRequestSummary[] = [syntheticRequest],
): LegacyUserRequestListResponse {
  return {
    rowsRead: requests.length,
    limit,
    requests,
  };
}

interface RecordedCall {
  readonly limit: LegacyRequestListLimit;
  readonly filters: LegacyUserRequestFilters;
}

function recordingApi(calls: RecordedCall[]): LegacyRequestListApi {
  return {
    getLegacyUserRequests: async (limit, filters = {}) => {
      calls.push({ limit, filters });
      return response(limit);
    },
  };
}

function renderView(
  state: LegacyRequestListViewState,
  options: {
    readonly limit?: LegacyRequestListLimit;
    readonly filters?: LegacyUserRequestFilters;
    readonly listSearch?: string;
  } = {},
): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LegacyRequestListView
        state={state}
        limit={options.limit ?? 20}
        filters={options.filters ?? {}}
        listSearch={options.listSearch ?? "?limit=20"}
        onLimitChange={() => undefined}
        onFilterChange={() => undefined}
        onClearFilters={() => undefined}
        onRefresh={() => undefined}
      />
    </MemoryRouter>,
  );
}

test("Admin loads the API with default limit 20 and no filters", async () => {
  const calls: RecordedCall[] = [];
  const loaded = await loadLegacyRequestListForRoles(
    recordingApi(calls),
    ["Admin"],
    DEFAULT_LEGACY_REQUEST_LIST_LIMIT,
  );

  assert.equal(loaded?.rowsRead, 1);
  assert.deepEqual(calls, [{ limit: 20, filters: {} }]);
  assert.equal(DEFAULT_LEGACY_REQUEST_LIST_LIMIT, 20);
});

test("limit 50 is preserved and larger inputs never reach the API", async () => {
  const calls: RecordedCall[] = [];
  const api = recordingApi(calls);

  await loadLegacyRequestListForRoles(api, ["Admin"], 50);
  await loadLegacyRequestListForRoles(api, ["Admin"], 51);
  await loadLegacyRequestListForRoles(api, ["Admin"], 500);

  assert.deepEqual(
    calls.map((call) => call.limit),
    [50, 20, 20],
  );
  assert.equal(normalizeLegacyRequestListLimit(50), 50);
  assert.equal(normalizeLegacyRequestListLimit(Number.POSITIVE_INFINITY), 20);
});

test("Viewer and Approver never request list data", async () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const calls: RecordedCall[] = [];
    const loaded = await loadLegacyRequestListForRoles(
      recordingApi(calls),
      [role],
      20,
      { system: "Example System" },
    );

    assert.equal(canViewLegacyRequestList([role]), false);
    assert.equal(loaded, null);
    assert.deepEqual(calls, []);
  }
});

test("URL state accepts only allowlisted, single, bounded filter values", () => {
  const parsed = parseLegacyRequestListUrlState(
    new URLSearchParams(
      "limit=50&system=Example+System&country=Example+Country&vstsStatus=SOURCE_STATE&department=Example+Department",
    ),
  );
  assert.deepEqual(parsed, {
    valid: true,
    limit: 50,
    filters: {
      system: "Example System",
      country: "Example Country",
      vstsStatus: "SOURCE_STATE",
      department: "Example Department",
    },
  });

  for (const query of [
    "limit=51",
    "limit=20&limit=50",
    "system=",
    "system=One&system=Two",
    "vstsStatus=line%0Abreak",
    "department=" + "x".repeat(201),
    "column=SystemProgram",
    "orderBy=Created",
  ]) {
    assert.deepEqual(
      parseLegacyRequestListUrlState(new URLSearchParams(query)),
      { valid: false },
      query,
    );
  }
});

test("serialization preserves selected limit and exact filters", () => {
  assert.equal(
    serializeLegacyRequestListUrlState(50, {
      system: "Example System",
      country: "Example Country",
    }).toString(),
    "limit=50&system=Example+System&country=Example+Country",
  );
});

test("loading and safe 400, 401, 403, 503, and generic states render", () => {
  assert.match(renderView({ kind: "loading" }), /Loading legacy requests/);

  const cases = [
    [400, "Invalid legacy request filter"],
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
      /stack trace|connection string|SQL password|Bearer|token|query text/i,
    );
  }
});

test("filter controls derive options from bounded rows", () => {
  const html = renderView({
    kind: "success",
    response: response(),
  });

  for (const label of [
    "Legacy request system filter",
    "Legacy request country filter",
    "Legacy request vsts status filter",
    "Legacy request department filter",
    "Legacy request row limit",
  ]) {
    assert.match(html, new RegExp('aria-label="' + label + '"'));
  }
  for (const option of [
    "Example System",
    "Example Country",
    "SOURCE_VSTS_VALUE",
    "Example Department",
  ]) {
    assert.match(html, new RegExp(option));
  }
  assert.match(html, /not an authoritative or complete value list/);
});

test("selected filters are delegated server-side and clear preserves limit", async () => {
  const calls: RecordedCall[] = [];
  const api = recordingApi(calls);
  const selected = {
    system: "Example System",
    country: "Example Country",
  };

  await loadLegacyRequestListForRoles(api, ["Admin"], 50, selected);
  await loadLegacyRequestListForRoles(api, ["Admin"], 50, {});

  assert.deepEqual(calls, [
    { limit: 50, filters: selected },
    { limit: 50, filters: {} },
  ]);
});

test("success keeps URL state in external-ID detail navigation and never uses Work ID", () => {
  const listSearch =
    "?limit=50&system=Example+System&country=Example+Country";
  const html = renderView(
    { kind: "success", response: response(50) },
    {
      limit: 50,
      filters: {
        system: "Example System",
        country: "Example Country",
      },
      listSearch,
    },
  );

  assert.match(
    html,
    /href="\/legacy-requests\/42\?limit=50&amp;system=Example\+System&amp;country=Example\+Country"/,
  );
  assert.doesNotMatch(html, /legacy-requests\/7001/);
  assert.doesNotMatch(html, />7001</);
});

test("empty and bounded result wording never claims an authoritative total", () => {
  const emptyHtml = renderView({
    kind: "success",
    response: response(20, []),
  });
  assert.match(emptyHtml, /No legacy requests matched the selected exact filters/);
  assert.match(emptyHtml, /0 rows returned from a bounded legacy result/);

  const fullHtml = renderView({
    kind: "success",
    response: {
      ...response(20),
      rowsRead: 20,
      requests: Array.from({ length: 20 }, () => syntheticRequest),
    },
  });
  assert.match(fullHtml, /Additional matching records may exist/);
  assert.doesNotMatch(fullHtml, /Total requests|All matching requests/i);
});

test("list view renders no mock rows, sensitive fields, or write actions", () => {
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
  assert.doesNotMatch(html, /LEG-DEMO|ADO-DEMO|Local mock data/i);
  assert.doesNotMatch(
    html,
    /HIDDEN_REQUEST_EMAIL|HIDDEN_PERSON|HIDDEN_MANAGER|HIDDEN_ASSIGNMENT|HIDDEN_TOPIC|HIDDEN_DETAIL|HIDDEN_SERVER|HIDDEN_DATABASE|HIDDEN_STORAGE|HIDDEN_TENANT/,
  );

  const buttonLabels = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map(
    (match) => match[1]?.replace(/<[^>]+>/g, "").trim(),
  );
  assert.deepEqual(buttonLabels, ["Refresh", "Clear filters"]);
  assert.doesNotMatch(
    html,
    />\s*(Create|Edit|Delete|Approve|Reject|Close|Complete|Sync|Reconcile|Provision|Revoke)\s*</i,
  );
});
