import {
  matrixSources,
  type LegacySqlQuery,
  type MatrixSource,
} from "../types/index.js";

export { matrixSources };

export const MAX_LEGACY_MATRIX_ROWS = 50;

const matrixTables: Readonly<Record<MatrixSource, string>> = {
  NEW: "dbo.MatrixProductManagement_new",
  TH: "dbo.MatrixProductManagement_TH",
  PH: "dbo.MatrixProductManagement_PH",
  VN_MY_ID: "dbo.MatrixProductManagement_VN_MY_ID",
};

export class LegacySqlTableNotAllowedError extends Error {
  readonly code = "LEGACY_SQL_TABLE_NOT_ALLOWED";

  constructor() {
    super("The requested legacy matrix source is not allowed.");
    this.name = "LegacySqlTableNotAllowedError";
  }
}

export class LegacySqlRowLimitError extends Error {
  readonly code = "LEGACY_SQL_ROW_LIMIT_INVALID";

  constructor() {
    super("Legacy matrix row limit must be an integer between 1 and 50.");
    this.name = "LegacySqlRowLimitError";
  }
}

export function enforceLegacyMatrixRowLimit(
  limit = MAX_LEGACY_MATRIX_ROWS,
): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LEGACY_MATRIX_ROWS) {
    throw new LegacySqlRowLimitError();
  }

  return limit;
}

export function getLegacyProductManagementMatrixTable(
  source: MatrixSource,
): string {
  if (!Object.prototype.hasOwnProperty.call(matrixTables, source)) {
    throw new LegacySqlTableNotAllowedError();
  }

  return matrixTables[source];
}

export function buildLegacyProductManagementMatrixQuery(
  source: MatrixSource,
  limit = MAX_LEGACY_MATRIX_ROWS,
): LegacySqlQuery {
  const table = getLegacyProductManagementMatrixTable(source);
  const safeLimit = enforceLegacyMatrixRowLimit(limit);
  return {
    text:
      "SELECT TOP (@limit) [RoleName] AS [roleName], " +
      "[Manager] AS [manager], " +
      "[Department] AS [department], " +
      "[Active] AS [active] " +
      "FROM " +
      table,
    parameters: [{ name: "limit", value: safeLimit }],
  };
}
