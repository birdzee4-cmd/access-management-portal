import type {
  LegacyRelatedVstsRows,
  LegacyUserRequestDetailRow,
} from "@access-portal/connectors";
import assert from "node:assert/strict";
import test from "node:test";

import {
  LegacyUserRequestDetailService,
  LegacyUserRequestDuplicateError,
  LegacyUserRequestNotFoundError,
  normalizeLegacyUserRequestDetail,
  type LegacyUserRequestDetailReader,
} from "./legacy-user-request-detail.service.js";

const sourceRow: LegacyUserRequestDetailRow = {
  externalRequestId: " 42 ",
  workItemId: " 00101 ",
  company: " Example Company ",
  department: " Example Department ",
  country: " TH ",
  system: " Example System ",
  permission: " Reader ",
  lineManagerApprovalStatus: " Approved ",
  ceoApprovalStatus: " ",
  itManagerApprovalStatus: " Pending ",
  vstsStatus: " Active ",
  openCaseStatus: " Observed legacy value ",
  createdDateText: " source-created-text ",
  updatedDateText: " source-updated-text ",
};

function reader(
  requestRows: readonly LegacyUserRequestDetailRow[],
  related: LegacyRelatedVstsRows = { rows: [], totalCount: 0 },
  calls: string[] = [],
): LegacyUserRequestDetailReader {
  return {
    findLegacyUserRequestDetail: async (id) => {
      calls.push("detail:" + id);
      return requestRows;
    },
    listLegacyVstsItemsBySharepointId: async (id, limit) => {
      calls.push("vsts:" + id + ":" + limit);
      return related;
    },
  };
}

test("zero request rows is not found and does not query VSTS", async () => {
  const calls: string[] = [];
  const service = new LegacyUserRequestDetailService(reader([], undefined, calls));

  await assert.rejects(service.getDetail(42), LegacyUserRequestNotFoundError);
  assert.deepEqual(calls, ["detail:42"]);
});

test("duplicate request rows fail closed and do not query VSTS", async () => {
  const calls: string[] = [];
  const service = new LegacyUserRequestDetailService(
    reader([sourceRow, sourceRow], undefined, calls),
  );

  await assert.rejects(service.getDetail(42), LegacyUserRequestDuplicateError);
  assert.deepEqual(calls, ["detail:42"]);
});

test("one request with zero related VSTS items returns a partial lifecycle", async () => {
  const service = new LegacyUserRequestDetailService(reader([sourceRow]));
  const detail = await service.getDetail(42);

  assert.equal(detail.externalRequestId, "42");
  assert.equal(detail.workItemId, "101");
  assert.equal(detail.workflow.ceoApprovalStatus, null);
  assert.equal(detail.workflow.statusComparison, "UNKNOWN");
  assert.deepEqual(detail.relatedVstsItems, []);
  assert.deepEqual(detail.relationship, {
    sourceRowCount: 0,
    returnedRowCount: 0,
    workItemCount: 0,
    duplicateWorkItemIdCount: 0,
    nullWorkItemIdCount: 0,
    truncated: false,
  });
  assert.deepEqual(
    detail.lifecycle.map((stage) => [stage.code, stage.availability]),
    [
      ["REQUEST_CREATED", "OBSERVED"],
      ["LINE_MANAGER_APPROVAL", "OBSERVED"],
      ["CEO_APPROVAL", "UNAVAILABLE"],
      ["IT_MANAGER_APPROVAL", "OBSERVED"],
      ["VSTS_WORK_ITEM", "UNAVAILABLE"],
      ["VSTS_STATE", "UNAVAILABLE"],
      ["REQUEST_UPDATED", "OBSERVED"],
    ],
  );
});

test("status comparison reports match, mismatch, and unknown per observed row", () => {
  const detail = normalizeLegacyUserRequestDetail(
    42,
    sourceRow,
    [
      { workItemId: "101", state: " active " },
      { workItemId: "102", state: "Closed" },
      { workItemId: "103", state: null },
    ],
    3,
  );

  assert.deepEqual(
    detail.relatedVstsItems.map((item) => item.statusComparison),
    ["MATCH", "MISMATCH", "UNKNOWN"],
  );
  assert.equal(detail.workflow.vstsStatus, "Active");
  assert.equal(detail.workflow.statusComparison, "MISMATCH");
  assert.equal(
    detail.lifecycle.find((stage) => stage.code === "VSTS_STATE")?.value,
    null,
  );
});

test("one related VSTS work item produces an observable matching state", async () => {
  const service = new LegacyUserRequestDetailService(
    reader([sourceRow], {
      rows: [{ workItemId: "101", state: "active" }],
      totalCount: 1,
    }),
  );
  const detail = await service.getDetail(42);

  assert.equal(detail.relationship.workItemCount, 1);
  assert.equal(detail.relationship.truncated, false);
  assert.equal(detail.workflow.statusComparison, "MATCH");
  assert.equal(
    detail.lifecycle.find((stage) => stage.code === "VSTS_STATE")?.value,
    "active",
  );
});

test("multiple, duplicate, null, and truncated VSTS rows remain observable", async () => {
  const related: LegacyRelatedVstsRows = {
    rows: [
      { workItemId: "101", state: "Active" },
      { workItemId: "101", state: "Active" },
      { workItemId: null, state: null },
    ],
    totalCount: 70,
  };
  const service = new LegacyUserRequestDetailService(reader([sourceRow], related));
  const detail = await service.getDetail(42);

  assert.equal(detail.relatedVstsItems.length, 3);
  assert.deepEqual(detail.relationship, {
    sourceRowCount: 70,
    returnedRowCount: 3,
    workItemCount: 1,
    duplicateWorkItemIdCount: 1,
    nullWorkItemIdCount: 1,
    truncated: true,
  });
  assert.equal(detail.workflow.statusComparison, "UNKNOWN");
});

test("reader results above the 50-row bound fail the safety invariant", async () => {
  const related: LegacyRelatedVstsRows = {
    rows: Array.from({ length: 51 }, (_, index) => ({
      workItemId: String(index + 1),
      state: "Active",
    })),
    totalCount: 51,
  };
  const service = new LegacyUserRequestDetailService(reader([sourceRow], related));

  await assert.rejects(service.getDetail(42), /bounded result contract/);
});

test("normalized detail omits raw IDs, person data, and source-only extras", () => {
  const rowWithExtra = {
    ...sourceRow,
    externalRequestId: "unexpected-source-id",
    requestEmail: "omitted.person@example.invalid",
    detail: "omitted free text",
  };
  const serialized = JSON.stringify(
    normalizeLegacyUserRequestDetail(42, rowWithExtra, [], 0),
  );

  assert.equal(serialized.includes("unexpected-source-id"), false);
  assert.equal(serialized.includes("omitted.person@example.invalid"), false);
  assert.equal(serialized.includes("omitted free text"), false);
});
