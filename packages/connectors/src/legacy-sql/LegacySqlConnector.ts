import type { ReadOnlyLegacySqlConnector } from "./index.js";
import type { LegacySqlConfig, LegacySqlEnvironment } from "./LegacySqlConfig.js";
import { readLegacySqlConfig } from "./LegacySqlConfig.js";
import { assertLegacySqlReadOnlyQuery } from "./LegacySqlReadGuard.js";
import { MssqlLegacySqlDriver } from "./MssqlLegacySqlDriver.js";
import { analyzeLegacyUserRequestVstsRows } from "./LegacyUserRequestVstsAnalysis.js";
import {
  buildLegacyUserRequestDetailQuery,
  buildRelatedVstsItemsQuery,
} from "./query/legacy-user-request-detail.js";
import {
  buildLegacyUserRequestRelationshipSampleQuery,
  buildLegacyUserRequestVstsColumnsQuery,
  buildLegacyUserRequestVstsIndexesQuery,
  buildLegacyVstsRelationshipSampleQuery,
} from "./query/legacy-user-request-vsts.js";
import { buildLegacyUserRequestListQuery } from "./query/legacy-user-request.js";
import { buildLegacyProductManagementMatrixQuery } from "./query/product-management-matrix.js";
import type { LegacyProductManagementMatrixRow } from "./types/LegacyProductManagementMatrixRow.js";
import type { LegacyUserRequestRow } from "./types/LegacyUserRequestRow.js";
import type {
  LegacyRelatedVstsRows,
  LegacyUserRequestDetailRow,
} from "./types/LegacyUserRequestDetailRow.js";
import type {
  LegacySqlDriver,
  LegacySqlPool,
  LegacySqlQuery,
  LegacyRelationshipSampleRow,
  LegacyRelationshipSummary,
  LegacySchemaColumn,
  LegacyUniqueIndexColumn,
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

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 1;
}

function relationshipSampleRow(
  row: Record<string, unknown>,
): LegacyRelationshipSampleRow {
  return {
    idSharepoint:
      typeof row.idSharepoint === "number"
        ? row.idSharepoint
        : nullableString(row.idSharepoint),
    workId:
      typeof row.workId === "number" ? row.workId : nullableString(row.workId),
    systemProgram: nullableString(row.systemProgram),
    permission: nullableString(row.permission),
    status: nullableString(row.status),
  };
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

  async listLegacyUserRequests(
    limit?: number,
  ): Promise<readonly LegacyUserRequestRow[]> {
    const rows = await this.executeSelect<Record<string, unknown>>(
      buildLegacyUserRequestListQuery(limit),
    );

    return rows.map((row) => ({
      externalRequestId: nullableString(row.externalRequestId),
      workItemId: nullableString(row.workItemId),
      company: nullableString(row.company),
      department: nullableString(row.department),
      country: nullableString(row.country),
      system: nullableString(row.system),
      permission: nullableString(row.permission),
      lineManagerApprovalStatus: nullableString(row.lineManagerApprovalStatus),
      ceoApprovalStatus: nullableString(row.ceoApprovalStatus),
      itManagerApprovalStatus: nullableString(row.itManagerApprovalStatus),
      vstsStatus: nullableString(row.vstsStatus),
      createdDateText: nullableString(row.createdDateText),
      updatedDateText: nullableString(row.updatedDateText),
    }));
  }

  async findLegacyUserRequestDetail(
    idSharepoint: number,
  ): Promise<readonly LegacyUserRequestDetailRow[]> {
    const rows = await this.executeSelect<Record<string, unknown>>(
      buildLegacyUserRequestDetailQuery(idSharepoint),
    );

    return rows.map((row) => ({
      externalRequestId: nullableString(row.externalRequestId),
      workItemId: nullableString(row.workItemId),
      company: nullableString(row.company),
      department: nullableString(row.department),
      country: nullableString(row.country),
      system: nullableString(row.system),
      permission: nullableString(row.permission),
      lineManagerApprovalStatus: nullableString(row.lineManagerApprovalStatus),
      ceoApprovalStatus: nullableString(row.ceoApprovalStatus),
      itManagerApprovalStatus: nullableString(row.itManagerApprovalStatus),
      vstsStatus: nullableString(row.vstsStatus),
      openCaseStatus: nullableString(row.openCaseStatus),
      createdDateText: nullableString(row.createdDateText),
      updatedDateText: nullableString(row.updatedDateText),
    }));
  }

  async listLegacyVstsItemsBySharepointId(
    idSharepoint: number,
    limit?: number,
  ): Promise<LegacyRelatedVstsRows> {
    const rows = await this.executeSelect<Record<string, unknown>>(
      buildRelatedVstsItemsQuery(idSharepoint, limit),
    );
    const relatedRows = rows.map((row) => ({
      workItemId: nullableString(row.workItemId),
      state: nullableString(row.state),
    }));

    return {
      rows: relatedRows,
      totalCount: Math.max(
        relatedRows.length,
        numberValue(rows[0]?.relatedCount),
      ),
    };
  }

  async describeLegacyUserRequestVstsSchema(): Promise<{
    readonly columns: readonly LegacySchemaColumn[];
    readonly indexes: readonly LegacyUniqueIndexColumn[];
  }> {
    const columnRows = await this.executeSelect<Record<string, unknown>>(
      buildLegacyUserRequestVstsColumnsQuery(),
    );
    const indexRows = await this.executeSelect<Record<string, unknown>>(
      buildLegacyUserRequestVstsIndexesQuery(),
    );

    return {
      columns: columnRows.map((row) => ({
        tableName: String(row.tableName),
        ordinalPosition: numberValue(row.ordinalPosition),
        columnName: String(row.columnName),
        dataType: String(row.dataType),
        maxLength: row.maxLength === null ? null : numberValue(row.maxLength),
        isNullable: String(row.isNullable).toUpperCase() === "YES",
      })),
      indexes: indexRows.map((row) => ({
        tableName: String(row.tableName),
        indexName: String(row.indexName),
        isPrimaryKey: booleanValue(row.isPrimaryKey),
        isUnique: booleanValue(row.isUnique),
        keyOrdinal: numberValue(row.keyOrdinal),
        columnName: String(row.columnName),
      })),
    };
  }

  async analyzeLegacyUserRequestVstsRelationship(
    limit?: number,
  ): Promise<LegacyRelationshipSummary> {
    const sharePointRows = (
      await this.executeSelect<Record<string, unknown>>(
        buildLegacyUserRequestRelationshipSampleQuery(limit),
      )
    ).map(relationshipSampleRow);
    const vstsRows = (
      await this.executeSelect<Record<string, unknown>>(
        buildLegacyVstsRelationshipSampleQuery(
          sharePointRows.map((row) => row.workId),
          limit,
        ),
      )
    ).map(relationshipSampleRow);
    return analyzeLegacyUserRequestVstsRows(sharePointRows, vstsRows);
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
