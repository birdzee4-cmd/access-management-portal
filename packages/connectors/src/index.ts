export {
  LIVE_LEGACY_CONNECTORS_ENABLED,
  type ReadOnlyLegacyConnector,
} from "./read-only.js";
export type { ReadOnlyAzureDevOpsConnector } from "./azure-devops/index.js";
export {
  LegacySqlConfigurationError,
  LegacySqlConnector,
  LegacySqlConnectorError,
  LegacySqlReadGuardError,
  LegacySqlRowLimitError,
  LegacySqlTableNotAllowedError,
  MAX_LEGACY_MATRIX_ROWS,
  MssqlLegacySqlDriver,
  assertLegacySqlReadOnlyQuery,
  buildLegacyProductManagementMatrixQuery,
  enforceLegacyMatrixRowLimit,
  getLegacyProductManagementMatrixTable,
  matrixSources,
  readLegacySqlConfig,
  type LegacyProductManagementMatrixRow,
  type LegacySqlConfig,
  type LegacySqlDriver,
  type LegacySqlEnvironment,
  type LegacySqlParameter,
  type LegacySqlParameterValue,
  type LegacySqlPool,
  type LegacySqlQuery,
  type LegacySqlRequest,
  type MatrixSource,
  type ReadOnlyLegacySqlConnector,
} from "./legacy-sql/index.js";
export type { ReadOnlySharePointConnector } from "./sharepoint/index.js";
