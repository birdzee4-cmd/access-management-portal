import type { LegacyProductManagementMatrixRow } from "./types/LegacyProductManagementMatrixRow.js";
import type { LegacySqlQuery, MatrixSource } from "./types/index.js";

/** Query-only contract for the isolated legacy SQL integration. */
export interface ReadOnlyLegacySqlConnector {
  readonly source: "LEGACY_SQL";

  executeSelect<Row extends Record<string, unknown>>(
    query: LegacySqlQuery,
  ): Promise<readonly Row[]>;

  listProductManagementMatrix(
    source: MatrixSource,
  ): Promise<readonly LegacyProductManagementMatrixRow[]>;

  healthCheck(): Promise<boolean>;

  close(): Promise<void>;
}

export {
  LegacySqlConnector,
  LegacySqlConnectorError,
} from "./LegacySqlConnector.js";
export {
  LegacySqlConfigurationError,
  readLegacySqlConfig,
  type LegacySqlConfig,
  type LegacySqlEnvironment,
} from "./LegacySqlConfig.js";
export {
  LegacySqlReadGuardError,
  assertLegacySqlReadOnlyQuery,
} from "./LegacySqlReadGuard.js";
export { MssqlLegacySqlDriver } from "./MssqlLegacySqlDriver.js";
export {
  LegacySqlTableNotAllowedError,
  buildLegacyProductManagementMatrixQuery,
  getLegacyProductManagementMatrixTable,
  matrixSources,
} from "./query/product-management-matrix.js";
export type { LegacyProductManagementMatrixRow } from "./types/LegacyProductManagementMatrixRow.js";
export type {
  LegacySqlDriver,
  LegacySqlParameter,
  LegacySqlParameterValue,
  LegacySqlPool,
  LegacySqlQuery,
  LegacySqlRequest,
  MatrixSource,
} from "./types/index.js";
