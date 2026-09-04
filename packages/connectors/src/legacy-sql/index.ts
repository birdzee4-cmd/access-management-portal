import type { LegacyProductManagementMatrixRow } from "./types/LegacyProductManagementMatrixRow.js";
import type { LegacyUserRequestRow } from "./types/LegacyUserRequestRow.js";
import type { LegacySqlQuery, MatrixSource } from "./types/index.js";

/** Query-only contract for the isolated legacy SQL integration. */
export interface ReadOnlyLegacySqlConnector {
  readonly source: "LEGACY_SQL";

  executeSelect<Row extends Record<string, unknown>>(
    query: LegacySqlQuery,
  ): Promise<readonly Row[]>;

  listProductManagementMatrix(
    source: MatrixSource,
    limit?: number,
  ): Promise<readonly LegacyProductManagementMatrixRow[]>;

  listLegacyUserRequests(
    limit?: number,
  ): Promise<readonly LegacyUserRequestRow[]>;

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
  LEGACY_USER_REQUEST_TABLE,
  MAX_LEGACY_USER_REQUEST_ROWS,
  LegacyUserRequestRowLimitError,
  buildLegacyUserRequestListQuery,
  enforceLegacyUserRequestRowLimit,
} from "./query/legacy-user-request.js";
export {
  LegacySqlRowLimitError,
  LegacySqlTableNotAllowedError,
  MAX_LEGACY_MATRIX_ROWS,
  buildLegacyProductManagementMatrixQuery,
  enforceLegacyMatrixRowLimit,
  getLegacyProductManagementMatrixTable,
  matrixSources,
} from "./query/product-management-matrix.js";
export type { LegacyProductManagementMatrixRow } from "./types/LegacyProductManagementMatrixRow.js";
export type { LegacyUserRequestRow } from "./types/LegacyUserRequestRow.js";
export type {
  LegacySqlDriver,
  LegacySqlParameter,
  LegacySqlParameterValue,
  LegacySqlPool,
  LegacySqlQuery,
  LegacySqlRequest,
  MatrixSource,
} from "./types/index.js";
