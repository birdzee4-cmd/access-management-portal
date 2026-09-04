import type { LegacyUserRequestDetail } from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AuthApiError } from "../auth/authApi.js";
import {
  LegacyUserRequestDetailView,
  canViewLegacyUserRequestDetail,
  legacyUserRequestDetailErrorState,
  loadLegacyUserRequestDetailForRoles,
  normalizeLegacyRequestRouteId,
  type LegacyUserRequestDetailApi,
  type LegacyUserRequestDetailViewState,
} from "./LegacyUserRequestDetailPage.js";

const syntheticDetail: LegacyUserRequestDetail = {
  externalRequestId: "42",
  workItemId: "7001",
  company: "Example Company",
  department: "Example Department",
  country: "Example Country",
  system: "Example System",
  permission: "Example Permission",
  workflow: {
    lineManagerApprovalStatus: "APPROVE",
    ceoApprovalStatus: null,
    itManagerApprovalStatus: "ACKNOWLEDGE",
    vstsStatus: "NEW",
    openCaseStatus: "COMPLETE",
    statusComparison: "MISMATCH",
  },
  createdDateText: "synthetic-created-source-text",
  updatedDateText: "synthetic-updated-source-text",
  relatedVstsItems: [
    { workItemId: "7001", state: "NEW", statusComparison: "MATCH" },
    { workItemId: "7002", state: "CLOSED", statusComparison: "MISMATCH" },
    { workItemId: null, state: null, statusComparison: "UNKNOWN" },
  ],
  relationship: {
    sourceRowCount: 61,
    returnedRowCount: 3,
    workItemCount: 2,
    duplicateWorkItemIdCount: 0,
    nullWorkItemIdCount: 1,
    truncated: true,
  },
  lifecycle: [
    {
      code: "REQUEST_CREATED",
      availability: "OBSERVED",
      value: null,
      dateText: "synthetic-created-source-text",
      relatedItemCount: null,
    },
    {
      code: "LINE_MANAGER_APPROVAL",
      availability: "OBSERVED",
      value: "APPROVE",
      dateText: null,
      relatedItemCount: null,
    },
    {
      code: "CEO_APPROVAL",
      availability: "UNAVAILABLE",
      value: null,
      dateText: null,
      relatedItemCount: null,
    },
    {
      code: "IT_MANAGER_APPROVAL",
      availability: "OBSERVED",
      value: "ACKNOWLEDGE",
      dateText: null,
      relatedItemCount: null,
    },
    {
      code: "VSTS_WORK_ITEM",
      availability: "OBSERVED",
      value: null,
      dateText: null,
      relatedItemCount: 2,
    },
    {
      code: "VSTS_STATE",
      availability: "OBSERVED",
      value: null,
      dateText: null,
      relatedItemCount: null,
    },
    {
      code: "REQUEST_UPDATED",
      availability: "OBSERVED",
      value: null,
      dateText: "synthetic-updated-source-text",
      relatedItemCount: null,
    },
  ],
};

function renderState(state: LegacyUserRequestDetailViewState): string {
  return renderToStaticMarkup(
    <LegacyUserRequestDetailView
      state={state}
      onBack={() => undefined}
      onRefresh={() => undefined}
    />,
  );
}

function recordingApi(calls: string[]): LegacyUserRequestDetailApi {
  return {
    getLegacyUserRequestDetail: async (idSharepoint) => {
      calls.push(idSharepoint);
      return syntheticDetail;
    },
  };
}

test("Admin loads normalized detail while Viewer and Approver make no request", async () => {
  const adminCalls: string[] = [];
  const loaded = await loadLegacyUserRequestDetailForRoles(
    recordingApi(adminCalls),
    ["Admin"],
    "00042",
  );
  assert.equal(loaded?.externalRequestId, "42");
  assert.deepEqual(adminCalls, ["42"]);

  for (const role of ["Viewer", "Approver"] as const) {
    const calls: string[] = [];
    assert.equal(
      await loadLegacyUserRequestDetailForRoles(recordingApi(calls), [role], "42"),
      null,
    );
    assert.equal(canViewLegacyUserRequestDetail([role]), false);
    assert.deepEqual(calls, []);
  }
});

test("invalid route IDs fail before the detail API is called", async () => {
  for (const value of [undefined, "", "0", "-1", "1.5", "2147483648", "1%2Fsync"]) {
    assert.equal(normalizeLegacyRequestRouteId(value), null);
    const calls: string[] = [];
    await assert.rejects(
      loadLegacyUserRequestDetailForRoles(recordingApi(calls), ["Admin"], value),
      (error: unknown) => error instanceof AuthApiError && error.status === 400,
    );
    assert.deepEqual(calls, []);
  }
});

test("loading and every required error state use sanitized messages", () => {
  assert.match(renderState({ kind: "loading" }), /Loading legacy request/);

  const cases = [
    [400, "Invalid legacy request identifier"],
    [401, "Authentication required"],
    [403, "Administrator access required"],
    [404, "Legacy request not found"],
    [409, "Multiple legacy records were found"],
    [503, "Legacy data unavailable"],
    [500, "Unable to display legacy request"],
  ] as const;
  for (const [status, message] of cases) {
    const html = renderState(
      legacyUserRequestDetailErrorState(new AuthApiError(status)),
    );
    assert.match(html, new RegExp(message));
    assert.doesNotMatch(html, /stack trace|connection string|SQL password|Bearer|token/i);
  }
});

test("successful detail renders only source observations and safe request fields", () => {
  const html = renderState({ kind: "success", detail: syntheticDetail });

  for (const text of [
    "Legacy User Request",
    "READ ONLY",
    "LEGACY DATA",
    "Request information",
    "Example Company",
    "Example Department",
    "Example Country",
    "Example System",
    "Example Permission",
    "Approval observations",
    "Legacy OpenCase value",
    "SharePoint-side VSTS status",
    "Lifecycle observations",
  ]) {
    assert.match(html, new RegExp(text));
  }
  assert.match(html, /CEO[\s\S]*UNAVAILABLE/);
  assert.doesNotMatch(html, /Workflow progress|required stage|stage completed/i);
});

test("all returned VSTS items, multiple-item note, and truncation are visible", () => {
  const html = renderState({ kind: "success", detail: syntheticDetail });

  assert.match(html, /7001/);
  assert.match(html, /7002/);
  assert.match(html, /Multiple related VSTS items were observed/);
  assert.match(html, /No primary item is selected/);
  assert.match(html, /Additional related VSTS items may exist/);
  assert.match(html, /3 of 61 rows/);
  assert.doesNotMatch(html, /Primary Work Item/);
});

test("MATCH, MISMATCH, and UNKNOWN remain neutral source comparisons", () => {
  const mismatchHtml = renderState({ kind: "success", detail: syntheticDetail });
  assert.match(mismatchHtml, /MISMATCH/);
  assert.match(mismatchHtml, /No reconciliation is performed/);

  for (const comparison of ["MATCH", "UNKNOWN"] as const) {
    const html = renderState({
      kind: "success",
      detail: {
        ...syntheticDetail,
        workflow: { ...syntheticDetail.workflow, statusComparison: comparison },
      },
    });
    assert.match(html, new RegExp(comparison));
    assert.doesNotMatch(html, /Healthy|Correct|Out of sync/);
  }
});

test("dates remain unchanged source text with unknown timezone", () => {
  const html = renderState({ kind: "success", detail: syntheticDetail });

  assert.match(html, /synthetic-created-source-text/);
  assert.match(html, /synthetic-updated-source-text/);
  assert.match(html, /timezone unknown/i);
  assert.doesNotMatch(html, /Asia\/Bangkok|Thailand time|GMT\+7/);
});

test("the page exposes only Back and Refresh actions and ignores extra sensitive fields", () => {
  const detailWithExtras = {
    ...syntheticDetail,
    requestEmail: "person@example.invalid",
    employeeName: "Synthetic Person",
    detail: "synthetic sensitive free text",
  } as LegacyUserRequestDetail;
  const html = renderState({ kind: "success", detail: detailWithExtras });
  const buttonLabels = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(buttonLabels, ["Back", "Refresh"]);
  assert.doesNotMatch(html, /person@example\.invalid|Synthetic Person|sensitive free text/);
  assert.doesNotMatch(html, /Azure DevOps link|VSTS action|Save changes/);
});
