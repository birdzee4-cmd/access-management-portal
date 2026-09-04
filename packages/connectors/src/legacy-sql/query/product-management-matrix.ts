import {
  matrixSources,
  type LegacySqlQuery,
  type MatrixSource,
} from "../types/index.js";

export { matrixSources };

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
): LegacySqlQuery {
  const table = getLegacyProductManagementMatrixTable(source);
  return {
    text:
      "SELECT [RoleName] AS [roleName], " +
      "[Manager] AS [manager], " +
      "[Department] AS [department], " +
      "[Active] AS [active] " +
      "FROM " +
      table,
  };
}
