import assert from "node:assert/strict";
import test from "node:test";

import type {
  LegacyMatrixRowsResponse,
  LegacyMatrixSummaryResponse,
} from "@access-portal/contracts";

import { AuthApiClient, AuthApiError } from "./authApi.js";

function responseBody(path: string): object {
  if (path.includes("/summary")) {
    const quality = {
      nullCount: 0,
      blankCount: 0,
      trailingWhitespaceCount: 0,
      inconsistentCapitalizationGroups: 0,
    };
    return {
      source: "NEW",
      sampleSize: 0,
      sampleLimit: 50,
      sampleDistinctRoleCount: 0,
      sampleDistinctDepartmentCount: 0,
      sampleDistinctManagerCount: 0,
      activePatterns: [],
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
    } satisfies LegacyMatrixSummaryResponse;
  }

  return {
    source: "NEW",
    rowsRead: 0,
    limit: 20,
    rows: [],
  } satisfies LegacyMatrixRowsResponse;
}

test("legacy matrix client uses only authenticated GET requests and bounded inputs", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; authorization: string }> = [];

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method: init?.method ?? "",
      authorization: headers.get("authorization") ?? "",
    });
    return Response.json(responseBody(url));
  }) as typeof fetch;

  try {
    const client = new AuthApiClient(
      async () => "synthetic-access-value",
      "http://localhost:7071/api",
    );

    await client.getLegacyMatrixRows("NEW", 20);
    await client.getLegacyMatrixRows("TH", 50);
    await client.getLegacyMatrixRows("PH", 20);
    await client.getLegacyMatrixRows("VN_MY_ID", 50);
    await client.getLegacyMatrixSummary("NEW");

    assert.deepEqual(
      calls.map((call) => call.url),
      [
        "http://localhost:7071/api/legacy/matrix?source=NEW&limit=20",
        "http://localhost:7071/api/legacy/matrix?source=TH&limit=50",
        "http://localhost:7071/api/legacy/matrix?source=PH&limit=20",
        "http://localhost:7071/api/legacy/matrix?source=VN_MY_ID&limit=50",
        "http://localhost:7071/api/legacy/matrix/summary?source=NEW",
      ],
    );
    assert.equal(calls.every((call) => call.method === "GET"), true);
    assert.equal(
      calls.every((call) => call.authorization === "Bearer synthetic-access-value"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("legacy matrix client exposes status only for failed API responses", async () => {
  const originalFetch = globalThis.fetch;

  try {
    for (const status of [401, 403, 500]) {
      globalThis.fetch = (async () =>
        Response.json(
          { error: "synthetic_backend_detail_that_must_not_be_exposed" },
          { status },
        )) as typeof fetch;
      const client = new AuthApiClient(
        async () => "synthetic-access-value",
        "http://localhost:7071/api",
      );

      await assert.rejects(
        client.getLegacyMatrixRows("NEW", 20),
        (error: unknown) =>
          error instanceof AuthApiError &&
          error.status === status &&
          !error.message.includes("synthetic_backend_detail"),
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
