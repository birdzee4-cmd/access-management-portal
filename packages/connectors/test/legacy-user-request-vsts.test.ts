import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGACY_VSTS_TABLE,
  LegacyRelationshipSampleLimitError,
  LegacySqlConnector,
  LegacySqlReadGuardError,
  analyzeLegacyUserRequestVstsRows,
  assertLegacySqlReadOnlyQuery,
  buildLegacyUserRequestRelationshipSampleQuery,
  buildLegacyUserRequestVstsColumnsQuery,
  buildLegacyUserRequestVstsIndexesQuery,
  buildLegacyVstsRelationshipSampleQuery,
  normalizeLegacyWorkId,
  readLegacySqlConfig,
  type LegacySqlDriver,
  type LegacySqlParameterValue,
  type LegacySqlPool,
  type LegacySqlRequest,
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

class QueuedRequest implements LegacySqlRequest {
  readonly queries: string[] = [];
  readonly inputs: Array<readonly [string, LegacySqlParameterValue]> = [];

  constructor(
    private readonly rowSets: Array<readonly Record<string, unknown>[]>,
  ) {}

  input(name: string, value: LegacySqlParameterValue): void {
    this.inputs.push([name, value]);
  }

  async query<Row extends Record<string, unknown>>(
    sqlText: string,
  ): Promise<readonly Row[]> {
    this.queries.push(sqlText);
    return (this.rowSets.shift() ?? []) as readonly Row[];
  }
}

class QueuedPool implements LegacySqlPool {
  readonly requestInstance: QueuedRequest;

  constructor(rowSets: Array<readonly Record<string, unknown>[]>) {
    this.requestInstance = new QueuedRequest(rowSets);
  }

  request(): LegacySqlRequest {
    return this.requestInstance;
  }

  async close(): Promise<void> {}
}

function driverFor(pool: QueuedPool): LegacySqlDriver {
  return { connect: async () => pool };
}

test("VSTS relationship queries use only the fixed approved table", () => {
  const query = buildLegacyVstsRelationshipSampleQuery(["00101"], 1);

  assert.equal(LEGACY_VSTS_TABLE, "[dbo].[All_Azure_Dev(VSTS)]");
  assert.match(query.text, /FROM \[dbo\]\.\[All_Azure_Dev\(VSTS\)\]/);
  assert.equal(query.text.includes("SELECT *"), false);
  assert.equal(query.text.includes("[RequestEmail]"), false);
  assert.equal(query.text.includes("[Title]"), false);
  assert.equal(query.text.includes("[Description]"), false);
  assert.equal(query.text.includes("[Assign]"), false);
  assert.equal(query.text.includes("[CreateBy]"), false);
  assert.equal(assertLegacySqlReadOnlyQuery(query.text), query.text);
});

test("metadata discovery is fixed, parameterized, and SELECT-only", () => {
  for (const query of [
    buildLegacyUserRequestVstsColumnsQuery(),
    buildLegacyUserRequestVstsIndexesQuery(),
  ]) {
    assert.equal(assertLegacySqlReadOnlyQuery(query.text), query.text);
    assert.deepEqual(
      query.parameters?.map((parameter) => parameter.name),
      ["schemaName", "sharePointTable", "vstsTable"],
    );
    assert.equal(query.text.includes("All_Azure_Dev(VSTS)"), false);
  }
});

test("relationship sample limits and Work IDs are parameterized", () => {
  const sharePointQuery = buildLegacyUserRequestRelationshipSampleQuery(7);
  const vstsQuery = buildLegacyVstsRelationshipSampleQuery(
    [" 00101 ", 102, "101", null, "not-an-id"],
    7,
  );

  assert.match(sharePointQuery.text, /^SELECT TOP \(@limit\)/);
  assert.deepEqual(sharePointQuery.parameters, [{ name: "limit", value: 7 }]);
  assert.match(vstsQuery.text, /IN \(@workId0, @workId1\)/);
  assert.deepEqual(vstsQuery.parameters, [
    { name: "limit", value: 7 },
    { name: "workId0", value: 101 },
    { name: "workId1", value: 102 },
  ]);

  for (const invalidLimit of [0, 11, 1.5, Number.NaN]) {
    assert.throws(
      () => buildLegacyUserRequestRelationshipSampleQuery(invalidLimit),
      LegacyRelationshipSampleLimitError,
    );
  }
});

test("Work ID normalization handles varchar, integer, blank, and invalid values", () => {
  assert.equal(normalizeLegacyWorkId(" 00042 "), "42");
  assert.equal(normalizeLegacyWorkId(42), "42");
  assert.equal(normalizeLegacyWorkId(null), null);
  assert.equal(normalizeLegacyWorkId("   "), null);
  assert.equal(normalizeLegacyWorkId("42x"), null);
  assert.equal(normalizeLegacyWorkId(0), null);
  assert.equal(normalizeLegacyWorkId("2147483648"), null);
});

test("duplicate relationships are counted without returning or logging raw values", () => {
  const sourceRows = [
    {
      idSharepoint: "5001",
      workId: " 00101 ",
      systemProgram: "sensitive-source-system",
      permission: "sensitive-source-permission",
      status: " Active ",
    },
    {
      idSharepoint: "5002",
      workId: "101",
      systemProgram: null,
      permission: null,
      status: "Closed",
    },
    {
      idSharepoint: "5003",
      workId: "102",
      systemProgram: null,
      permission: null,
      status: "New",
    },
    {
      idSharepoint: null,
      workId: " ",
      systemProgram: null,
      permission: null,
      status: null,
    },
  ];
  const vstsRows = [
    {
      idSharepoint: 5001,
      workId: 101,
      systemProgram: null,
      permission: null,
      status: "active",
    },
    {
      idSharepoint: 5003,
      workId: 102,
      systemProgram: null,
      permission: null,
      status: "Resolved",
    },
    {
      idSharepoint: 5003,
      workId: 102,
      systemProgram: null,
      permission: null,
      status: "New",
    },
  ];

  const originalLog = console.log;
  let logCalls = 0;
  console.log = () => {
    logCalls += 1;
  };
  let summary: ReturnType<typeof analyzeLegacyUserRequestVstsRows>;
  try {
    summary = analyzeLegacyUserRequestVstsRows(sourceRows, vstsRows);
  } finally {
    console.log = originalLog;
  }
  const serialized = JSON.stringify(summary);

  assert.equal(summary.matchedWorkIdKeys, 2);
  assert.equal(summary.matchedRowPairs, 4);
  assert.equal(summary.duplicateSharePointWorkIdKeys, 1);
  assert.equal(summary.duplicateVstsWorkIdKeys, 1);
  assert.equal(summary.manyToOneKeys, 1);
  assert.equal(summary.oneToManyKeys, 1);
  assert.equal(summary.workIdRelationship, "CONFIRMED");
  assert.equal(summary.idSharepointRelationship, "LIKELY");
  assert.equal(summary.statusSynchronization, "LIKELY");
  assert.equal(serialized.includes("5001"), false);
  assert.equal(serialized.includes("sensitive-source-system"), false);
  assert.equal(serialized.includes("sensitive-source-permission"), false);
  assert.equal(serialized.includes("Active"), false);
  assert.equal(logCalls, 0);
});

test("no comparable or matching evidence remains UNKNOWN or CONTRADICTED", () => {
  const unknown = analyzeLegacyUserRequestVstsRows(
    [{ idSharepoint: null, workId: null, systemProgram: null, permission: null, status: null }],
    [],
  );
  assert.equal(unknown.workIdRelationship, "UNKNOWN");
  assert.equal(unknown.idSharepointRelationship, "UNKNOWN");
  assert.equal(unknown.statusSynchronization, "UNKNOWN");

  const contradicted = analyzeLegacyUserRequestVstsRows(
    [{ idSharepoint: "10", workId: "20", systemProgram: null, permission: null, status: "New" }],
    [{ idSharepoint: 11, workId: 20, systemProgram: null, permission: null, status: "Closed" }],
  );
  assert.equal(contradicted.idSharepointRelationship, "CONTRADICTED");
  assert.equal(contradicted.statusSynchronization, "CONTRADICTED");
});

test("schema discovery maps metadata without reading business fields", async () => {
  const pool = new QueuedPool([
    [
      {
        tableName: "All_Azure_Dev(VSTS)",
        ordinalPosition: 15,
        columnName: "Work_ID",
        dataType: "int",
        maxLength: null,
        isNullable: "YES",
      },
    ],
    [],
  ]);
  const connector = new LegacySqlConnector(
    readLegacySqlConfig(safeEnvironment),
    driverFor(pool),
  );

  assert.deepEqual(await connector.describeLegacyUserRequestVstsSchema(), {
    columns: [
      {
        tableName: "All_Azure_Dev(VSTS)",
        ordinalPosition: 15,
        columnName: "Work_ID",
        dataType: "int",
        maxLength: null,
        isNullable: true,
      },
    ],
    indexes: [],
  });
  assert.equal(pool.requestInstance.queries.length, 2);
  assert.equal(pool.requestInstance.queries.every((sql) => /^SELECT\b/.test(sql)), true);
});

test("prohibited mutations remain rejected during relationship discovery", () => {
  for (const sql of [
    "INSERT INTO dbo.Example VALUES (1)",
    "UPDATE dbo.Example SET value = 1",
    "DELETE FROM dbo.Example",
    "MERGE dbo.Example AS target USING dbo.Source AS source ON 1 = 1 WHEN MATCHED THEN DELETE",
    "EXEC dbo.Example",
    "SELECT * INTO dbo.Copy FROM dbo.Example",
  ]) {
    assert.throws(() => assertLegacySqlReadOnlyQuery(sql), LegacySqlReadGuardError);
  }
});
