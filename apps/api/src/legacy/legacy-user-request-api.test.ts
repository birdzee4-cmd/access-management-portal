import {
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
} from "@access-portal/connectors";
import type {
  LegacyUserRequestFilters,
  LegacyUserRequestSummary,
} from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthenticationService,
  type AuthenticatedUser,
  type HeaderReader,
} from "../auth/index.js";
import {
  DEFAULT_LEGACY_USER_REQUEST_ROWS,
  handleLegacyUserRequestList,
  type LegacyUserRequestApiDependencies,
  type LegacyUserRequestLogger,
  type LegacyUserRequestRequest,
} from "./legacy-user-request-api.js";

function headers(
  values: Readonly<Record<string, string>> = {},
): HeaderReader {
  const normalized = new Map(
    Object.entries(values).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  );
  return {
    get: (name) => normalized.get(name.toLowerCase()) ?? null,
  };
}

function user(roles: AuthenticatedUser["roles"]): AuthenticatedUser {
  return {
    entraObjectId: "synthetic-object-id",
    email: "task07g.user@example.invalid",
    displayName: "Task 07G Synthetic User",
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
        if (invalidToken) {
          throw new Error("synthetic invalid token");
        }
        return user(roles);
      },
    },
    { ENABLE_DEV_AUTH_MOCK: "false" },
  );
}

function request(
  query = "",
  authorization = "Bearer synthetic-access-value",
): LegacyUserRequestRequest {
  return {
    headers: headers(authorization ? { authorization } : {}),
    query: new URLSearchParams(query),
  };
}

const normalizedRequest: LegacyUserRequestSummary = {
  externalRequestId: "1001",
  workItemId: "9001",
  company: "Example Company",
  department: "Example Department",
  country: "TH",
  system: "Example System",
  permission: "Reader",
  lineManagerApprovalStatus: "Approved",
  ceoApprovalStatus: null,
  itManagerApprovalStatus: "Pending",
  vstsStatus: "Active",
  createdDateText: "source-created-text",
  updatedDateText: "source-updated-text",
};

class RecordingLogger implements LegacyUserRequestLogger {
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
  readonly requests?: readonly LegacyUserRequestSummary[];
  readonly error?: Error;
  readonly calls?: Array<{
    readonly limit: number;
    readonly filters: LegacyUserRequestFilters;
  }>;
}): LegacyUserRequestApiDependencies {
  return {
    getAuthenticationService: () =>
      authentication(options?.roles ?? ["Admin"], options?.invalidToken),
    getLegacyUserRequestService: () => ({
      listRequests: async (limit, filters) => {
        options?.calls?.push({
          limit: limit ?? -1,
          filters: filters ?? {},
        });
        if (options?.error) {
          throw options.error;
        }
        return options?.requests ?? [];
      },
    }),
  };
}

test("missing and invalid bearer tokens return 401 before legacy access", async () => {
  const calls: Array<{ limit: number; filters: LegacyUserRequestFilters }> = [];
  const missing = await handleLegacyUserRequestList(
    request("", ""),
    new RecordingLogger(),
    dependencies({ calls }),
  );
  const invalid = await handleLegacyUserRequestList(
    request(),
    new RecordingLogger(),
    dependencies({ invalidToken: true, calls }),
  );

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.deepEqual(calls, []);
});

test("Admin is allowed while Viewer and Approver receive 403", async () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const calls: Array<{ limit: number; filters: LegacyUserRequestFilters }> = [];
    const response = await handleLegacyUserRequestList(
      request(),
      new RecordingLogger(),
      dependencies({ roles: [role], calls }),
    );
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  }

  const response = await handleLegacyUserRequestList(
    request(),
    new RecordingLogger(),
    dependencies({ roles: ["Admin"] }),
  );
  assert.equal(response.status, 200);
});

test("default, minimum, and maximum limits are validated and delegated", async () => {
  const calls: Array<{ limit: number; filters: LegacyUserRequestFilters }> = [];
  for (const query of ["", "limit=1", "limit=50"]) {
    const response = await handleLegacyUserRequestList(
      request(query),
      new RecordingLogger(),
      dependencies({ calls }),
    );
    assert.equal(response.status, 200);
  }
  assert.deepEqual(calls, [
    { limit: DEFAULT_LEGACY_USER_REQUEST_ROWS, filters: {} },
    { limit: 1, filters: {} },
    { limit: 50, filters: {} },
  ]);
});

test("allowed exact-match filters and combinations are delegated by fixed keys", async () => {
  const calls: Array<{ limit: number; filters: LegacyUserRequestFilters }> = [];
  const queries = [
    ["system=Example%20System", { system: "Example System" }],
    ["country=Example%20Country", { country: "Example Country" }],
    ["vstsStatus=SOURCE_STATE", { vstsStatus: "SOURCE_STATE" }],
    ["department=Example%20Department", { department: "Example Department" }],
    [
      "limit=50&system=Example%20System&country=Example%20Country&vstsStatus=SOURCE_STATE&department=Example%20Department",
      {
        system: "Example System",
        country: "Example Country",
        vstsStatus: "SOURCE_STATE",
        department: "Example Department",
      },
    ],
  ] as const;

  for (const [query, filters] of queries) {
    const response = await handleLegacyUserRequestList(
      request(query),
      new RecordingLogger(),
      dependencies({ calls }),
    );
    assert.equal(response.status, 200, query);
    assert.deepEqual(calls.at(-1)?.filters, filters);
  }
  assert.equal(calls.at(-1)?.limit, 50);
});

test("invalid, repeated, and unknown query parameters fail before service creation", async () => {
  for (const query of [
    "limit=0",
    "limit=51",
    "limit=1.5",
    "limit=abc",
    "limit=20&limit=21",
    "system=",
    "system=One&system=Two",
    "country=%20%20",
    "vstsStatus=line%0Abreak",
    "department=" + "x".repeat(201),
    "status=Active",
    "column=SystemProgram",
    "orderBy=CreateDate",
    "table=dbo.All_SharepointUserRequest",
    "sql=SELECT",
  ]) {
    let serviceCreations = 0;
    const base = dependencies();
    const response = await handleLegacyUserRequestList(
      request(query),
      new RecordingLogger(),
      {
        ...base,
        getLegacyUserRequestService: () => {
          serviceCreations += 1;
          return base.getLegacyUserRequestService();
        },
      },
    );
    assert.equal(response.status, 400, query);
    assert.equal(serviceCreations, 0, query);
  }
});

test("successful response contains only the normalized bounded DTO", async () => {
  const logger = new RecordingLogger();
  const response = await handleLegacyUserRequestList(
    request("limit=1&system=Example%20System"),
    logger,
    dependencies({ requests: [normalizedRequest] }),
  );
  const serialized = JSON.stringify(response);

  assert.equal(response.status, 200);
  assert.deepEqual(response.jsonBody, {
    rowsRead: 1,
    limit: 1,
    requests: [normalizedRequest],
  });
  for (const omittedField of [
    "RequestEmail",
    "CreateBy",
    "LineManager",
    "Detail",
    "Servername",
    "DBName",
    "StorageName",
    "Tanant",
  ]) {
    assert.equal(serialized.includes(omittedField), false);
  }
  assert.equal(JSON.stringify(logger.entries).includes("Example System"), false);
});

test("unexpected and SQL failures return only sanitized errors and logs", async () => {
  const sensitiveDetail =
    "synthetic production hostname, connection string, and raw row detail";
  for (const [error, expectedStatus, expectedCode] of [
    [new Error(sensitiveDetail), 500, "legacy_user_request_failed"],
    [
      new LegacySqlConfigurationError(sensitiveDetail),
      503,
      "legacy_sql_not_configured",
    ],
    [
      new LegacySqlConnectorError("LEGACY_SQL_QUERY_FAILED", sensitiveDetail),
      503,
      "legacy_sql_unavailable",
    ],
  ] as const) {
    const logger = new RecordingLogger();
    const response = await handleLegacyUserRequestList(
      request(),
      logger,
      dependencies({ error }),
    );
    const serialized = JSON.stringify({ response, logs: logger.entries });

    assert.equal(response.status, expectedStatus);
    assert.deepEqual(response.jsonBody, { error: expectedCode });
    assert.equal(serialized.includes(sensitiveDetail), false);
  }
});
