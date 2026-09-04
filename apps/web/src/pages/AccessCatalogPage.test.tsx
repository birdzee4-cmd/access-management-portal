import type {
  LegacyMatrixRowsResponse,
  LegacyMatrixSource,
  LegacyMatrixSummaryResponse,
} from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AuthApiError } from "../auth/authApi.js";
import {
  LegacyMatrixPanelView,
  canViewLegacyMatrix,
  legacyMatrixErrorState,
  loadLegacyMatrixForRoles,
  type LegacyMatrixApi,
  type LegacyMatrixData,
  type LegacyMatrixViewState,
} from "./AccessCatalogPage.js";

function rows(source: LegacyMatrixSource): LegacyMatrixRowsResponse {
  return {
    source,
    rowsRead: 1,
    limit: 20,
    rows: [
      {
        roleName: "Reader",
        department: "Example Department",
        managerMasked: "m***@example.invalid",
        active: "ACTIVE",
      },
    ],
  };
}

function summary(source: LegacyMatrixSource): LegacyMatrixSummaryResponse {
  const quality = {
    nullCount: 0,
    blankCount: 0,
    trailingWhitespaceCount: 0,
    inconsistentCapitalizationGroups: 0,
  };
  return {
    source,
    sampleSize: 1,
    sampleLimit: 50,
    sampleDistinctRoleCount: 1,
    sampleDistinctDepartmentCount: 1,
    sampleDistinctManagerCount: 1,
    activePatterns: [{ value: "ACTIVE", count: 1 }],
    quality: {
      roleName: quality,
      manager: quality,
      department: quality,
      active: quality,
    },
    normalizedDuplicateRows: 0,
    normalizedDuplicateGroups: 0,
    roleNamesWithMultipleManagers: 0,
    roleNamesWithMultipleDepartments: 0,
    departmentRolePairsWithMultipleManagers: 0,
  };
}

function recordingApi(calls: string[]): LegacyMatrixApi {
  return {
    getLegacyMatrixRows: async (source, limit) => {
      calls.push("rows:" + source + ":" + limit);
      return { ...rows(source), limit };
    },
    getLegacyMatrixSummary: async (source) => {
      calls.push("summary:" + source);
      return summary(source);
    },
  };
}

function renderPanel(
  state: LegacyMatrixViewState,
  authorized = true,
): string {
  return renderToStaticMarkup(
    <LegacyMatrixPanelView
      authorized={authorized}
      source="NEW"
      limit={20}
      state={state}
      onSourceChange={() => undefined}
      onLimitChange={() => undefined}
    />,
  );
}

test("Admin loads rows and summary for every supported source", async () => {
  const calls: string[] = [];
  const api = recordingApi(calls);

  for (const source of ["NEW", "TH", "PH", "VN_MY_ID"] as const) {
    const data = await loadLegacyMatrixForRoles(api, ["Admin"], source, 20);
    assert.equal(data?.rows.source, source);
    assert.equal(data?.summary.source, source);
  }

  assert.deepEqual(calls, [
    "rows:NEW:20",
    "summary:NEW",
    "rows:TH:20",
    "summary:TH",
    "rows:PH:20",
    "summary:PH",
    "rows:VN_MY_ID:20",
    "summary:VN_MY_ID",
  ]);
});

test("the 50-row selection remains bounded and is sent only to the rows API", async () => {
  const calls: string[] = [];
  await loadLegacyMatrixForRoles(recordingApi(calls), ["Admin"], "NEW", 50);
  assert.deepEqual(calls, ["rows:NEW:50", "summary:NEW"]);
});

test("Viewer and Approver never request legacy matrix data", async () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const calls: string[] = [];
    const data = await loadLegacyMatrixForRoles(
      recordingApi(calls),
      [role],
      "NEW",
      20,
    );
    assert.equal(canViewLegacyMatrix([role]), false);
    assert.equal(data, null);
    assert.deepEqual(calls, []);
  }
});

test("loading, empty, unauthorized, forbidden, and unavailable states are sanitized", () => {
  assert.match(renderPanel({ kind: "loading" }), /Loading legacy matrix/);

  const emptyData: LegacyMatrixData = {
    rows: { ...rows("NEW"), rowsRead: 0, rows: [] },
    summary: { ...summary("NEW"), sampleSize: 0 },
  };
  assert.match(
    renderPanel({ kind: "success", data: emptyData }),
    /No legacy matrix rows were returned/,
  );

  const cases = [
    [401, "Authentication required"],
    [403, "Access denied"],
    [500, "Legacy matrix unavailable"],
  ] as const;
  for (const [status, message] of cases) {
    const html = renderPanel(legacyMatrixErrorState(new AuthApiError(status)));
    assert.match(html, new RegExp(message));
    assert.doesNotMatch(html, /stack|connection string|SQL password|token/i);
  }
});

test("success renders real response metrics and the already-masked manager value", () => {
  const html = renderPanel({
    kind: "success",
    data: { rows: rows("NEW"), summary: summary("NEW") },
  });

  assert.match(html, /Rows sampled/);
  assert.match(html, /Manager relationships/);
  assert.match(html, /m\*\*\*@example.invalid/);
  assert.doesNotMatch(html, /Unmask|Resolve identity|Edit|Delete|Save/);
});

test("non-Admin view has no selectors or matrix rows", () => {
  const html = renderPanel({ kind: "loading" }, false);

  assert.match(html, /Administrator access is required/);
  assert.doesNotMatch(html, /<select/);
  assert.doesNotMatch(html, /m\*\*\*@example.invalid/);
});
