import {
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
} from "@access-portal/connectors";
import type { LegacyUserRequestSummary } from "@access-portal/contracts";
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
  readonly calls?: number[];
}): LegacyUserRequestApiDependencies {
  return {
    getAuthenticationService: () =>
      authentication(options?.roles ?? ["Admin"], options?.invalidToken),
    getLegacyUserRequestService: () => ({
      listRequests: async (limit) => {
        options?.calls?.push(limit ?? -1);
        if (options?.error) {
          throw options.error;
        }
        return options?.requests ?? [];
      },
    }),
  };
}

test("missing and invalid bearer tokens return 401 before legacy access", async () => {
  const calls: number[] = [];
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
    const calls: number[] = [];
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
  const calls: number[] = [];
  for (const query of ["", "limit=1", "limit=50"]) {
    const response = await handleLegacyUserRequestList(
      request(query),
      new RecordingLogger(),
      dependencies({ calls }),
    );
    assert.equal(response.status, 200);
  }
  assert.deepEqual(calls, [DEFAULT_LEGACY_USER_REQUEST_ROWS, 1, 50]);
});

test("invalid limits and unsupported filters return 400 before service creation", async () => {
  for (const query of [
    "limit=0",
    "limit=51",
    "limit=1.5",
    "limit=abc",
    "limit=20&limit=21",
    "status=Active",
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
  const response = await handleLegacyUserRequestList(
    request("limit=1"),
    new RecordingLogger(),
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
