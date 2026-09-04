import assert from "node:assert/strict";
import test from "node:test";

import type {
  LegacyProductManagementMatrixRow,
  MatrixSource,
} from "@access-portal/connectors";
import {
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
} from "@access-portal/connectors";

import {
  AuthenticationService,
  type AuthenticatedUser,
  type HeaderReader,
} from "../auth/index.js";
import type { LegacyMatrixSummary } from "../services/index.js";
import {
  DEFAULT_LEGACY_MATRIX_ROWS,
  handleLegacyMatrixRows,
  handleLegacyMatrixSummary,
  type LegacyMatrixApiDependencies,
  type LegacyMatrixLogger,
  type LegacyMatrixRequest,
} from "./legacy-matrix-api.js";

type ServiceCall = readonly [string, MatrixSource, number | undefined];

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

function authenticatedUser(
  roles: AuthenticatedUser["roles"],
): AuthenticatedUser {
  return {
    entraObjectId: "00000000-0000-4000-8000-00000000e001",
    email: "task07e.admin@example.invalid",
    displayName: "Task 07E Test Admin",
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
        return authenticatedUser(roles);
      },
    },
    { ENABLE_DEV_AUTH_MOCK: "false" },
  );
}

function request(
  query: string,
  authorization = "Bearer offline-test-token",
): LegacyMatrixRequest {
  return {
    headers: headers(authorization ? { authorization } : {}),
    query: new URLSearchParams(query),
  };
}

function summary(source: MatrixSource): LegacyMatrixSummary {
  const quality = {
    nullCount: 0,
    blankCount: 0,
    trailingWhitespaceCount: 0,
    inconsistentCapitalizationGroups: 0,
  };

  return {
    source,
    sampleCount: 2,
    distinctRoleNameCount: 1,
    distinctDepartmentCount: 1,
    distinctManagerCount: 2,
    activeValuePatterns: [{ value: "ACTIVE", count: 2 }],
    fieldQuality: {
      roleName: quality,
      manager: quality,
      department: quality,
      active: quality,
    },
    normalizedDuplicateRows: 0,
    normalizedDuplicateGroups: 0,
    roleNamesWithMultipleManagers: 1,
    roleNamesWithMultipleDepartments: 0,
    departmentRolePairsWithMultipleManagers: 1,
  };
}

class RecordingLogger implements LegacyMatrixLogger {
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
  readonly rows?: readonly LegacyProductManagementMatrixRow[];
  readonly throwError?: Error;
  readonly calls?: ServiceCall[];
}): LegacyMatrixApiDependencies {
  const roles = options?.roles ?? ["Admin"];
  return {
    getAuthenticationService: () =>
      authentication(roles, options?.invalidToken),
    getLegacyCatalogService: () => ({
      getMatrixRows: async (source, limit) => {
        options?.calls?.push(["rows", source, limit]);
        if (options?.throwError) {
          throw options.throwError;
        }
        return options?.rows ?? [];
      },
      getMatrixSummary: async (source, limit) => {
        options?.calls?.push(["summary", source, limit]);
        if (options?.throwError) {
          throw options.throwError;
        }
        return summary(source);
      },
    }),
  };
}

test("missing and invalid bearer tokens return 401 before legacy access", async () => {
  const calls: ServiceCall[] = [];
  const missing = await handleLegacyMatrixRows(
    request("source=NEW", ""),
    new RecordingLogger(),
    dependencies({ calls }),
  );
  const invalid = await handleLegacyMatrixRows(
    request("source=NEW"),
    new RecordingLogger(),
    dependencies({ invalidToken: true, calls }),
  );

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.deepEqual(calls, []);
});

test("Viewer and Approver receive 403 while Admin is allowed", async () => {
  for (const role of ["Viewer", "Approver"] as const) {
    const calls: ServiceCall[] = [];
    const response = await handleLegacyMatrixRows(
      request("source=NEW"),
      new RecordingLogger(),
      dependencies({ roles: [role], calls }),
    );
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  }

  const response = await handleLegacyMatrixRows(
    request("source=NEW"),
    new RecordingLogger(),
    dependencies(),
  );
  assert.equal(response.status, 200);
});

test("all fixed matrix source keys are accepted and delegated unchanged", async () => {
  const calls: ServiceCall[] = [];

  for (const source of ["NEW", "TH", "PH", "VN_MY_ID"] as const) {
    const response = await handleLegacyMatrixRows(
      request("source=" + source + "&limit=3"),
      new RecordingLogger(),
      dependencies({ calls }),
    );
    assert.equal(response.status, 200);
  }

  assert.deepEqual(
    calls,
    ["NEW", "TH", "PH", "VN_MY_ID"].map((source) => [
      "rows",
      source,
      3,
    ]),
  );
});

test("source and limit validation rejects malformed input before service creation", async () => {
  for (const query of [
    "",
    "source=UNKNOWN",
    "source=NEW&source=TH",
    "source=NEW&limit=abc",
    "source=NEW&limit=0",
    "source=NEW&limit=51",
    "source=NEW&limit=1.5",
    "source=NEW&limit=20&limit=21",
  ]) {
    let serviceCreations = 0;
    const base = dependencies();
    const response = await handleLegacyMatrixRows(
      request(query),
      new RecordingLogger(),
      {
        ...base,
        getLegacyCatalogService: () => {
          serviceCreations += 1;
          return base.getLegacyCatalogService();
        },
      },
    );

    assert.equal(response.status, 400, query);
    assert.equal(serviceCreations, 0, query);
  }
});

test("default, minimum, and maximum bounded limits reach the service", async () => {
  const calls: ServiceCall[] = [];
  for (const query of ["source=TH", "source=TH&limit=1", "source=TH&limit=50"]) {
    const response = await handleLegacyMatrixRows(
      request(query),
      new RecordingLogger(),
      dependencies({ calls }),
    );
    assert.equal(response.status, 200);
  }

  assert.deepEqual(calls, [
    ["rows", "TH", DEFAULT_LEGACY_MATRIX_ROWS],
    ["rows", "TH", 1],
    ["rows", "TH", 50],
  ]);
});

test("SQL, table, column, and ordering parameters are rejected", async () => {
  for (const query of [
    "source=NEW&sql=SELECT",
    "source=NEW&table=dbo.MatrixProductManagement_new",
    "source=NEW&columns=RoleName",
    "source=NEW&orderBy=RoleName",
  ]) {
    const response = await handleLegacyMatrixRows(
      request(query),
      new RecordingLogger(),
      dependencies(),
    );
    assert.equal(response.status, 400);
    assert.deepEqual(response.jsonBody, {
      error: "unsupported_query_parameter",
    });
  }
});

test("raw table names and SQL fragments cannot be injected through source", async () => {
  for (const source of [
    "dbo.MatrixProductManagement_new",
    "NEW;DELETE FROM dbo.Example",
    "NEW ORDER BY Manager",
  ]) {
    const response = await handleLegacyMatrixRows(
      request("source=" + encodeURIComponent(source)),
      new RecordingLogger(),
      dependencies(),
    );
    assert.equal(response.status, 400);
  }
});

test("matrix response trims values, masks manager, and uses bounded row terminology", async () => {
  const rawManager = "sensitive.person@example.invalid";
  const logger = new RecordingLogger();
  const response = await handleLegacyMatrixRows(
    request("source=NEW&limit=3"),
    logger,
    dependencies({
      rows: [
        {
          roleName: " Reader ",
          department: " Demo Department ",
          manager: rawManager,
          active: " ACTIVE ",
        },
      ],
    }),
  );
  const body = response.jsonBody as {
    readonly rowsRead: number;
    readonly limit: number;
    readonly rows: readonly Record<string, unknown>[];
  };

  assert.equal(response.status, 200);
  assert.equal(body.rowsRead, 1);
  assert.equal(body.limit, 3);
  assert.deepEqual(body.rows, [
    {
      roleName: "Reader",
      department: "Demo Department",
      managerMasked: "s***@example.invalid",
      active: "ACTIVE",
    },
  ]);
  assert.equal(JSON.stringify(response).includes(rawManager), false);
  assert.equal(JSON.stringify(logger.entries).includes(rawManager), false);
  assert.equal("totalRows" in body, false);
});

test("summary response uses sample terminology and the fixed 50-row cap", async () => {
  const calls: ServiceCall[] = [];
  const response = await handleLegacyMatrixSummary(
    request("source=NEW"),
    new RecordingLogger(),
    dependencies({ calls }),
  );
  const body = response.jsonBody as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.sampleSize, 2);
  assert.equal(body.sampleLimit, 50);
  assert.equal(body.sampleDistinctRoleCount, 1);
  assert.equal("totalCount" in body, false);
  assert.deepEqual(calls, [["summary", "NEW", 50]]);
});

test("unexpected failures return and log only safe diagnostics", async () => {
  const sensitiveDetail =
    "sensitive-driver-detail synthetic-server synthetic-user";
  const logger = new RecordingLogger();
  const response = await handleLegacyMatrixRows(
    request("source=NEW"),
    logger,
    dependencies({ throwError: new Error(sensitiveDetail) }),
  );
  const serialized = JSON.stringify({ response, logs: logger.entries });

  assert.equal(response.status, 500);
  assert.deepEqual(response.jsonBody, { error: "legacy_matrix_failed" });
  assert.equal(serialized.includes(sensitiveDetail), false);
  assert.equal(serialized.includes("synthetic-server"), false);
  assert.equal(serialized.includes("synthetic-user"), false);
});

test("legacy configuration and connector failures map to sanitized 503 responses", async () => {
  for (const [error, expectedCode] of [
    [
      new LegacySqlConfigurationError("sensitive configuration detail"),
      "legacy_sql_not_configured",
    ],
    [
      new LegacySqlConnectorError(
        "LEGACY_SQL_CONNECTION_FAILED",
        "sensitive connection detail",
      ),
      "legacy_sql_unavailable",
    ],
  ] as const) {
    const logger = new RecordingLogger();
    const response = await handleLegacyMatrixRows(
      request("source=NEW"),
      logger,
      dependencies({ throwError: error }),
    );
    const serialized = JSON.stringify({ response, logs: logger.entries });

    assert.equal(response.status, 503);
    assert.deepEqual(response.jsonBody, { error: expectedCode });
    assert.equal(serialized.includes(error.message), false);
  }
});
