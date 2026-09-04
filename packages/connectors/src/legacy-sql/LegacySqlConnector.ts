import type { ReadOnlyLegacySqlConnector } from "./index.js";
import type { LegacySqlConfig, LegacySqlEnvironment } from "./LegacySqlConfig.js";
import { readLegacySqlConfig } from "./LegacySqlConfig.js";
import { assertLegacySqlReadOnlyQuery } from "./LegacySqlReadGuard.js";
import { MssqlLegacySqlDriver } from "./MssqlLegacySqlDriver.js";
import { buildLegacyProductManagementMatrixQuery } from "./query/product-management-matrix.js";
import type { LegacyProductManagementMatrixRow } from "./types/LegacyProductManagementMatrixRow.js";
import type {
  LegacySqlDriver,
  LegacySqlPool,
  LegacySqlQuery,
  MatrixSource,
} from "./types/index.js";

const parameterNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class LegacySqlConnectorError extends Error {
  readonly code:
    | "LEGACY_SQL_CONNECTION_FAILED"
    | "LEGACY_SQL_QUERY_FAILED"
    | "LEGACY_SQL_CLOSE_FAILED";

  constructor(
    code:
      | "LEGACY_SQL_CONNECTION_FAILED"
      | "LEGACY_SQL_QUERY_FAILED"
      | "LEGACY_SQL_CLOSE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "LegacySqlConnectorError";
    this.code = code;
  }
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

export class LegacySqlConnector implements ReadOnlyLegacySqlConnector {
  readonly source = "LEGACY_SQL" as const;
  private poolPromise: Promise<LegacySqlPool> | null = null;

  constructor(
    private readonly configuration: LegacySqlConfig,
    private readonly driver: LegacySqlDriver = new MssqlLegacySqlDriver(),
  ) {}

  static fromEnvironment(
    environment: LegacySqlEnvironment = process.env,
    driver?: LegacySqlDriver,
  ): LegacySqlConnector {
    return new LegacySqlConnector(
      readLegacySqlConfig(environment),
      driver ?? new MssqlLegacySqlDriver(),
    );
  }

  private getPool(): Promise<LegacySqlPool> {
    if (!this.poolPromise) {
      this.poolPromise = this.driver.connect(this.configuration).catch(() => {
        this.poolPromise = null;
        throw new LegacySqlConnectorError(
          "LEGACY_SQL_CONNECTION_FAILED",
          "Legacy SQL connection failed.",
        );
      });
    }

    return this.poolPromise;
  }

  async executeSelect<Row extends Record<string, unknown>>(
    query: LegacySqlQuery,
  ): Promise<readonly Row[]> {
    const sqlText = assertLegacySqlReadOnlyQuery(query.text);

    for (const parameter of query.parameters ?? []) {
      if (!parameterNamePattern.test(parameter.name)) {
        throw new LegacySqlConnectorError(
          "LEGACY_SQL_QUERY_FAILED",
          "Legacy SQL query contains an invalid parameter name.",
        );
      }
    }

    const pool = await this.getPool();
    try {
      const request = pool.request();
      for (const parameter of query.parameters ?? []) {
        request.input(parameter.name, parameter.value);
      }

      return await request.query<Row>(sqlText);
    } catch {
      throw new LegacySqlConnectorError(
        "LEGACY_SQL_QUERY_FAILED",
        "Legacy SQL read query failed.",
      );
    }
  }

  async listProductManagementMatrix(
    source: MatrixSource,
    limit?: number,
  ): Promise<readonly LegacyProductManagementMatrixRow[]> {
    const rows = await this.executeSelect<Record<string, unknown>>(
      buildLegacyProductManagementMatrixQuery(source, limit),
    );

    return rows.map((row) => ({
      roleName: nullableString(row.roleName),
      manager: nullableString(row.manager),
      department: nullableString(row.department),
      active: nullableString(row.active),
    }));
  }

  async healthCheck(): Promise<boolean> {
    const rows = await this.executeSelect<{ ok: number }>({
      text: "SELECT 1 AS ok",
    });
    return rows.length === 1 && rows[0]?.ok === 1;
  }

  async close(): Promise<void> {
    const activePool = this.poolPromise;
    this.poolPromise = null;
    if (!activePool) {
      return;
    }

    try {
      const pool = await activePool;
      await pool.close();
    } catch {
      throw new LegacySqlConnectorError(
        "LEGACY_SQL_CLOSE_FAILED",
        "Legacy SQL connection could not be closed cleanly.",
      );
    }
  }
}
