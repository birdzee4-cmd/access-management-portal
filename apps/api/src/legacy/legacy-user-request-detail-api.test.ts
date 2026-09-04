import {
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
} from "@access-portal/connectors";
import type { LegacyUserRequestDetail } from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthenticationService,
  type AuthenticatedUser,
  type HeaderReader,
} from "../auth/index.js";
import {
  LegacyUserRequestDuplicateError,
  LegacyUserRequestNotFoundError,
} from "../services/index.js";
import {
  handleLegacyUserRequestDetail,
  type LegacyUserRequestDetailApiDependencies,
  type LegacyUserRequestDetailLogger,
  type LegacyUserRequestDetailRequest,
} from "./legacy-user-request-detail-api.js";

function headers(values: Readonly<Record<string, string>> = {}): HeaderReader {
  const normalized = new Map(
    Object.entries(values).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return { get: (name) => normalized.get(name.toLowerCase()) ?? null };
}

function user(roles: AuthenticatedUser["roles"]): AuthenticatedUser {
  return {
    entraObjectId: "synthetic-object-id",
    email: "task07i.user@example.invalid",
    displayName: "Task 07I Synthetic User",
    roles,
    claims: {},
    authenticationSource: "ENTRA",
  };
}

function authentication(
  roles: AuthenticatedUser["roles"],
  invalidToken = false,
): AuthenticationService {
  return new AuthenticationService(
    {
      validate: async () => {
        if (invalidToken) throw new Error("synthetic invalid token");
        return user(roles);
      },
    },
    { ENABLE_DEV_AUTH_MOCK: "false" },
  );
}

function request(
  idSharepoint?: string,
  authorization = "Bearer synthetic-access-value",
  query = "",
): LegacyUserRequestDetailRequest {
  const resolvedId = arguments.length === 0 ? "42" : idSharepoint;
  return {
    headers: headers(authorization ? { authorization } : {}),
    params: { idSharepoint: resolvedId },
    query: new URLSearchParams(query),
  };
}

const detail: LegacyUserRequestDetail = {
  externalRequestId: "42",
  workItemId: "101",
  company: "Example Company",
  department: "Example Department",
  country: "TH",
  system: "Example System",
  permission: "Reader",
  workflow: {
    lineManagerApprovalStatus: "Approved",
    ceoApprovalStatus: null,
    itManagerApprovalStatus: "Pending",
    vstsStatus: "Active",
    openCaseStatus: null,
    statusComparison: "MATCH",
  },
  createdDateText: "source-created-text",
  updatedDateText: "source-updated-text",
  relatedVstsItems: [
    { workItemId: "101", state: "Active", statusComparison: "MATCH" },
  ],
  relationship: {
    sourceRowCount: 1,
    returnedRowCount: 1,
    workItemCount: 1,
    duplicateWorkItemIdCount: 0,
    nullWorkItemIdCount: 0,
    truncated: false,
  },
  lifecycle: [],
};

class RecordingLogger implements LegacyUserRequestDetailLogger {
  readonly entries: unknown[][] = [];
  info(message: string, properties: Readonly<Record<string, string | number>>) {
    this.entries.push([message, properties]);
  }
  warn(message: string, properties: Readonly<Record<string, string | number>>) {
    this.entries.push([message, properties]);
  }
}

function dependencies(options?: {
  readonly roles?: AuthenticatedUser["roles"];
  readonly invalidToken?: boolean;
  readonly detail?: LegacyUserRequestDetail;
  readonly error?: Error;
  readonly calls?: number[];
  readonly creations?: number[];
}): LegacyUserRequestDetailApiDependencies {
  return {
    getAuthenticationService: () =>
      authentication(options?.roles ?? ["Admin"], options?.invalidToken),
    getLegacyUserRequestDetailService: () => {
      options?.creations?.push(1);
      return {
        getDetail: async (id) => {
          options?.calls?.push(id);
          if (options?.error) throw options.error;
          return options?.detail ?? detail;
        },
      };
    },
  };
}

test("missing and invalid bearer tokens return 401 before service creation", async () => {
  const creations: number[] = [];
  for (const [authorization, invalidToken] of [
    ["", false],
    ["Bearer synthetic-access-value", true],
  ] as const) {
    const response = await handleLegacyUserRequestDetail(
      request("42", authorization),
      new RecordingLogger(),
      dependencies({ invalidToken, creations }),
    );
    assert.equal(response.status, 401);
  }
  assert.deepEqual(creations, []);
});

test("Admin is allowed while Viewer and Approver receive 403", async () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const creations: number[] = [];
    const response = await handleLegacyUserRequestDetail(
      request(),
      new RecordingLogger(),
      dependencies({ roles: [role], creations }),
    );
    assert.equal(response.status, 403);
    assert.deepEqual(creations, []);
  }

  const response = await handleLegacyUserRequestDetail(
    request(),
    new RecordingLogger(),
    dependencies({ roles: ["Admin"] }),
  );
  assert.equal(response.status, 200);
});

test("identifier validation rejects missing, malformed, SQL-like, and non-positive IDs", async () => {
  for (const invalidId of [
    undefined,
    "",
    "abc",
    "0",
    "-1",
    "1.5",
    "1 OR 1=1",
    "42;DELETE",
    "2147483648",
  ]) {
    const creations: number[] = [];
    const response = await handleLegacyUserRequestDetail(
      request(invalidId),
      new RecordingLogger(),
      dependencies({ creations }),
    );
    assert.equal(response.status, 400, String(invalidId));
    assert.deepEqual(creations, []);
  }
});

test("valid numeric ID is normalized and query parameters are rejected", async () => {
  const calls: number[] = [];
  const valid = await handleLegacyUserRequestDetail(
    request("00042"),
    new RecordingLogger(),
    dependencies({ calls }),
  );
  const filtered = await handleLegacyUserRequestDetail(
    request("42", undefined, "table=dbo.Anything"),
    new RecordingLogger(),
    dependencies(),
  );

  assert.equal(valid.status, 200);
  assert.deepEqual(calls, [42]);
  assert.equal(filtered.status, 400);
});

test("not found and duplicate legacy IDs map to 404 and 409", async () => {
  for (const [error, status, code] of [
    [new LegacyUserRequestNotFoundError(), 404, "legacy_user_request_not_found"],
    [new LegacyUserRequestDuplicateError(), 409, "legacy_user_request_duplicate"],
  ] as const) {
    const response = await handleLegacyUserRequestDetail(
      request(),
      new RecordingLogger(),
      dependencies({ error }),
    );
    assert.equal(response.status, status);
    assert.deepEqual(response.jsonBody, { error: code });
  }
});

test("successful detail is returned with no-store and safe aggregate logs", async () => {
  const logger = new RecordingLogger();
  const response = await handleLegacyUserRequestDetail(
    request(),
    logger,
    dependencies(),
  );
  const logs = JSON.stringify(logger.entries);

  assert.equal(response.status, 200);
  assert.deepEqual(response.jsonBody, detail);
  assert.match(JSON.stringify(response.headers), /no-store/);
  assert.equal(logs.includes(detail.externalRequestId), false);
  assert.equal(logs.includes(detail.company ?? "never"), false);
  assert.equal(logs.includes(detail.relatedVstsItems[0]?.workItemId ?? "never"), false);
});

test("SQL and unexpected failures return sanitized responses and logs", async () => {
  const sensitive = "synthetic hostname, credential, SQL, token, and raw row";
  for (const [error, status, code] of [
    [new Error(sensitive), 500, "legacy_user_request_detail_failed"],
    [
      new LegacySqlConfigurationError(sensitive),
      503,
      "legacy_sql_not_configured",
    ],
    [
      new LegacySqlConnectorError("LEGACY_SQL_QUERY_FAILED", sensitive),
      503,
      "legacy_sql_unavailable",
    ],
  ] as const) {
    const logger = new RecordingLogger();
    const response = await handleLegacyUserRequestDetail(
      request(),
      logger,
      dependencies({ error }),
    );
    const serialized = JSON.stringify({ response, logs: logger.entries });

    assert.equal(response.status, status);
    assert.deepEqual(response.jsonBody, { error: code });
    assert.equal(serialized.includes(sensitive), false);
  }
});
