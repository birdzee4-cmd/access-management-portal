import assert from "node:assert/strict";
import test from "node:test";

import {
  LegacySqlConfigurationError,
  LegacySqlConnector,
  LegacySqlConnectorError,
  LegacySqlReadGuardError,
  LegacySqlRowLimitError,
  LegacySqlTableNotAllowedError,
  assertLegacySqlReadOnlyQuery,
  buildLegacyProductManagementMatrixQuery,
  getLegacyProductManagementMatrixTable,
  readLegacySqlConfig,
  type LegacySqlConfig,
  type LegacySqlDriver,
  type LegacySqlParameterValue,
  type LegacySqlPool,
  type LegacySqlRequest,
  type MatrixSource,
} from "../src/legacy-sql/index.js";

const safeEnvironment = {
  LEGACY_INTEGRATION_MODE: "READ_ONLY",
  ENABLE_SHAREPOINT_WRITE: "false",
  ENABLE_LEGACY_SQL_WRITE: "false",
  ENABLE_VSTS_WRITE: "false",
  ENABLE_ACCESS_PROVISIONING: "false",
  ENABLE_ACCESS_REVOCATION: "false",
  ENABLE_AUTOMATION: "false",
  LEGACY_SQL_SERVER: "synthetic-sql.example.invalid",
  LEGACY_SQL_DATABASE: "synthetic_legacy",
  LEGACY_SQL_USER: "synthetic_reader",
  LEGACY_SQL_PASSWORD: "synthetic-test-value",
} as const;

class RecordingRequest implements LegacySqlRequest {
  readonly inputs: Array<readonly [string, LegacySqlParameterValue]> = [];
  lastQuery: string | null = null;

  constructor(private readonly rows: readonly Record<string, unknown>[] = []) {}

  input(name: string, value: LegacySqlParameterValue): void {
    this.inputs.push([name, value]);
  }

  async query<Row extends Record<string, unknown>>(
    sqlText: string,
  ): Promise<readonly Row[]> {
    this.lastQuery = sqlText;
    return this.rows as readonly Row[];
  }
}

class RecordingPool implements LegacySqlPool {
  readonly requestInstance: RecordingRequest;
  closeCount = 0;

  constructor(rows: readonly Record<string, unknown>[] = []) {
    this.requestInstance = new RecordingRequest(rows);
  }

  request(): LegacySqlRequest {
    return this.requestInstance;
  }

  async close(): Promise<void> {
    this.closeCount += 1;
  }
}

class RecordingDriver implements LegacySqlDriver {
  connectCount = 0;

  constructor(readonly pool: RecordingPool) {}

  async connect(_configuration: LegacySqlConfig): Promise<LegacySqlPool> {
    this.connectCount += 1;
    return this.pool;
  }
}

test("SELECT is allowed", () => {
  assert.equal(assertLegacySqlReadOnlyQuery(" SELECT 1; "), "SELECT 1");
});

test("SELECT with parameters is allowed and parameters reach the driver separately", async () => {
  const pool = new RecordingPool();
  const connector = new LegacySqlConnector(
    readLegacySqlConfig(safeEnvironment),
    new RecordingDriver(pool),
  );

  await connector.executeSelect({
    text: "SELECT [RoleName] FROM dbo.MatrixProductManagement_TH WHERE [Department] = @department",
    parameters: [{ name: "department", value: "SYNTHETIC_DEPARTMENT" }],
  });

  assert.deepEqual(pool.requestInstance.inputs, [
    ["department", "SYNTHETIC_DEPARTMENT"],
  ]);
  assert.match(pool.requestInstance.lastQuery ?? "", /@department$/);
});

for (const [operation, query] of [
  ["INSERT", "INSERT INTO dbo.Example VALUES (1)"],
  ["UPDATE", "UPDATE dbo.Example SET value = 1"],
  ["DELETE", "DELETE FROM dbo.Example"],
  ["MERGE", "MERGE dbo.Example AS target USING dbo.Source AS source ON 1 = 1 WHEN MATCHED THEN DELETE"],
  ["EXEC", "EXEC dbo.Example"],
] as const) {
  test(operation + " is rejected", () => {
    assert.throws(
      () => assertLegacySqlReadOnlyQuery(query),
      LegacySqlReadGuardError,
    );
  });
}

test("DDL is rejected", () => {
  for (const query of [
    "CREATE TABLE dbo.Example (id int)",
    "ALTER TABLE dbo.Example ADD value int",
    "DROP TABLE dbo.Example",
    "TRUNCATE TABLE dbo.Example",
  ]) {
    assert.throws(
      () => assertLegacySqlReadOnlyQuery(query),
      LegacySqlReadGuardError,
    );
  }
});

test("multiple-statement mutation attempts and comments are rejected", () => {
  for (const query of [
    "SELECT 1; DELETE FROM dbo.Example",
    "SELECT 1 -- harmless looking comment",
    "/* prefix */ SELECT 1",
  ]) {
    assert.throws(
      () => assertLegacySqlReadOnlyQuery(query),
      LegacySqlReadGuardError,
    );
  }
});

test("arbitrary matrix table names are rejected", () => {
  assert.throws(
    () =>
      getLegacyProductManagementMatrixTable(
        "dbo.UserSuppliedTable" as MatrixSource,
      ),
    LegacySqlTableNotAllowedError,
  );
});

test("approved matrix sources map to fixed SQL identifiers", () => {
  assert.deepEqual(
    {
      NEW: getLegacyProductManagementMatrixTable("NEW"),
      TH: getLegacyProductManagementMatrixTable("TH"),
      PH: getLegacyProductManagementMatrixTable("PH"),
      VN_MY_ID: getLegacyProductManagementMatrixTable("VN_MY_ID"),
    },
    {
      NEW: "dbo.MatrixProductManagement_new",
      TH: "dbo.MatrixProductManagement_TH",
      PH: "dbo.MatrixProductManagement_PH",
      VN_MY_ID: "dbo.MatrixProductManagement_VN_MY_ID",
    },
  );
});

test("matrix queries enforce and parameterize a maximum 50-row limit", () => {
  const query = buildLegacyProductManagementMatrixQuery("TH", 25);

  assert.match(query.text, /^SELECT TOP \(@limit\)/);
  assert.deepEqual(query.parameters, [{ name: "limit", value: 25 }]);

  for (const invalidLimit of [0, 51, 1.5, Number.NaN]) {
    assert.throws(
      () => buildLegacyProductManagementMatrixQuery("TH", invalidLimit),
      LegacySqlRowLimitError,
    );
  }
});

test("matrix row mapping tolerates nulls and uses the capped query", async () => {
  const pool = new RecordingPool([
    {
      roleName: null,
      manager: null,
      department: null,
      active: null,
    },
  ]);
  const connector = new LegacySqlConnector(
    readLegacySqlConfig(safeEnvironment),
    new RecordingDriver(pool),
  );

  assert.deepEqual(await connector.listProductManagementMatrix("PH"), [
    {
      roleName: null,
      manager: null,
      department: null,
      active: null,
    },
  ]);
  assert.match(pool.requestInstance.lastQuery ?? "", /^SELECT TOP \(@limit\)/);
  assert.deepEqual(pool.requestInstance.inputs, [["limit", 50]]);
});

test("missing legacy SQL configuration fails without opening a connection", () => {
  const { LEGACY_SQL_SERVER: _server, ...incompleteEnvironment } =
    safeEnvironment;

  assert.throws(
    () => readLegacySqlConfig(incompleteEnvironment),
    (error: unknown) =>
      error instanceof LegacySqlConfigurationError &&
      error.message === "LEGACY_SQL_SERVER is required.",
  );
});

test("connector errors do not expose credentials or driver details", async () => {
  const configuration = readLegacySqlConfig(safeEnvironment);
  const driver: LegacySqlDriver = {
    async connect() {
      throw new Error(
        "Login failed for synthetic_reader using synthetic-test-value at synthetic-sql.example.invalid",
      );
    },
  };
  const connector = new LegacySqlConnector(configuration, driver);

  await assert.rejects(
    connector.healthCheck(),
    (error: unknown) =>
      error instanceof LegacySqlConnectorError &&
      error.code === "LEGACY_SQL_CONNECTION_FAILED" &&
      !error.message.includes(configuration.server) &&
      !error.message.includes(configuration.user) &&
      !error.message.includes(configuration.password),
  );
});

test("connector reuses and closes its injected pool safely", async () => {
  const pool = new RecordingPool([{ ok: 1 }]);
  const driver = new RecordingDriver(pool);
  const connector = new LegacySqlConnector(
    readLegacySqlConfig(safeEnvironment),
    driver,
  );

  assert.equal(await connector.healthCheck(), true);
  assert.equal(await connector.healthCheck(), true);
  assert.equal(driver.connectCount, 1);

  await connector.close();
  assert.equal(pool.closeCount, 1);
});
