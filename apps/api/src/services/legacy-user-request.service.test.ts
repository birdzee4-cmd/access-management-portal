import type {
  LegacyUserRequestRow,
  ReadOnlyLegacySqlConnector,
} from "@access-portal/connectors";
import assert from "node:assert/strict";
import test from "node:test";

import {
  LegacyUserRequestService,
  normalizeLegacyUserRequest,
} from "./legacy-user-request.service.js";

const sourceRow: LegacyUserRequestRow = {
  externalRequestId: " 1001 ",
  workItemId: " 9001 ",
  company: " Example Company ",
  department: " Example Department ",
  country: " TH ",
  system: " Example System ",
  permission: " Reader ",
  lineManagerApprovalStatus: " Approved ",
  ceoApprovalStatus: " ",
  itManagerApprovalStatus: null,
  vstsStatus: " Active ",
  createdDateText: " source-created-text ",
  updatedDateText: " source-updated-text ",
};

test("normalization trims source text and converts blank values to null", () => {
  assert.deepEqual(normalizeLegacyUserRequest(sourceRow), {
    externalRequestId: "1001",
    workItemId: "9001",
    company: "Example Company",
    department: "Example Department",
    country: "TH",
    system: "Example System",
    permission: "Reader",
    lineManagerApprovalStatus: "Approved",
    ceoApprovalStatus: null,
    itManagerApprovalStatus: null,
    vstsStatus: "Active",
    createdDateText: "source-created-text",
    updatedDateText: "source-updated-text",
  });
});

test("service enforces bounds and delegates only to the read-only method", async () => {
  const calls: Array<{ limit: number; filters: object }> = [];
  const reader: Pick<ReadOnlyLegacySqlConnector, "listLegacyUserRequests"> = {
    listLegacyUserRequests: async (limit, filters) => {
      calls.push({ limit: limit ?? -1, filters: filters ?? {} });
      return [sourceRow];
    },
  };
  const service = new LegacyUserRequestService(reader);

  assert.equal((await service.listRequests(1)).length, 1);
  assert.equal(
    (
      await service.listRequests(50, {
        system: "Example System",
        country: "TH",
      })
    ).length,
    1,
  );
  assert.deepEqual(calls, [
    { limit: 1, filters: {} },
    {
      limit: 50,
      filters: { system: "Example System", country: "TH" },
    },
  ]);

  for (const invalidLimit of [0, 51, 1.5]) {
    await assert.rejects(service.listRequests(invalidLimit));
  }
});

test("service rejects an injected reader that violates the response bound", async () => {
  const reader = {
    listLegacyUserRequests: async () => Array.from({ length: 2 }, () => sourceRow),
  };
  const service = new LegacyUserRequestService(reader);

  await assert.rejects(service.listRequests(1));
});
