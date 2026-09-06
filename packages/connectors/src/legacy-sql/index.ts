import type { LegacyProductManagementMatrixRow } from "./types/LegacyProductManagementMatrixRow.js";
import type { LegacyUserRequestFilters } from "@access-portal/contracts";
import type { LegacyUserRequestRow } from "./types/LegacyUserRequestRow.js";
import type {
  LegacyRelatedVstsRows,
  LegacyUserRequestDetailRow,
} from "./types/LegacyUserRequestDetailRow.js";
import type {
  LegacyRelationshipSummary,
  LegacySchemaColumn,
  LegacySqlQuery,
  LegacyUniqueIndexColumn,
  MatrixSource,
} from "./types/index.js";

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
    filters?: LegacyUserRequestFilters,
  ): Promise<readonly LegacyUserRequestRow[]>;

  findLegacyUserRequestDetail(
    idSharepoint: number,
  ): Promise<readonly LegacyUserRequestDetailRow[]>;

  listLegacyVstsItemsBySharepointId(
    idSharepoint: number,
    limit?: number,
  ): Promise<LegacyRelatedVstsRows>;

  describeLegacyUserRequestVstsSchema(): Promise<{
    readonly columns: readonly LegacySchemaColumn[];
    readonly indexes: readonly LegacyUniqueIndexColumn[];
  }>;

  analyzeLegacyUserRequestVstsRelationship(
    limit?: number,
  ): Promise<LegacyRelationshipSummary>;

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
export { buildLegacyCatalogObservationsQuery } from "./query/catalog-observations.js";
export {
  LEGACY_USER_REQUEST_TABLE,
  MAX_LEGACY_USER_REQUEST_ROWS,
  LegacyUserRequestFilterError,
  LegacyUserRequestRowLimitError,
  buildLegacyUserRequestListQuery,
  enforceLegacyUserRequestRowLimit,
  legacyUserRequestFilterKeys,
  normalizeLegacyUserRequestFilters,
  type LegacyUserRequestFilterKey,
} from "./query/legacy-user-request.js";
export {
  LEGACY_USER_REQUEST_DETAIL_LIMIT,
  MAX_RELATED_VSTS_ITEMS,
  LegacyRelatedVstsLimitError,
  LegacySharepointIdError,
  buildLegacyUserRequestDetailQuery,
  buildRelatedVstsItemsQuery,
  enforceLegacySharepointId,
  enforceRelatedVstsLimit,
} from "./query/legacy-user-request-detail.js";
export {
  LEGACY_RELATIONSHIP_SAMPLE_LIMIT,
  LEGACY_VSTS_TABLE,
  LegacyRelationshipSampleLimitError,
  buildLegacyUserRequestRelationshipSampleQuery,
  buildLegacyUserRequestVstsColumnsQuery,
  buildLegacyUserRequestVstsIndexesQuery,
  buildLegacyVstsRelationshipSampleQuery,
  enforceLegacyRelationshipSampleLimit,
  normalizeLegacyWorkId,
} from "./query/legacy-user-request-vsts.js";
export { analyzeLegacyUserRequestVstsRows } from "./LegacyUserRequestVstsAnalysis.js";
export {
  analyzeLegacyApprovalLifecycleRows,
  classifySemanticEvidence,
} from "./LegacyApprovalLifecycleAnalysis.js";
export {
  buildLegacyApprovalPresencePatternQuery,
  buildLegacyApprovalContinuationSummaryQuery,
  buildLegacyApprovalStatusDistributionQuery,
  buildLegacyCrossSourceDateOrderingQuery,
  buildLegacyDatePatternQuery,
  buildLegacyDateOrderingQuery,
  buildLegacyDateTimeSemanticsQuery,
  buildLegacyMultipleVstsSummaryQuery,
  buildLegacyMultipleVstsTypeStateQuery,
  buildLegacyOpenCaseCorrelationQuery,
  buildLegacyOpenCaseApprovalCorrelationQuery,
  buildLegacyOpenCaseStatusCorrelationQuery,
  buildLegacyStatusMismatchPatternQuery,
  buildLegacyStatusMismatchSummaryQuery,
  buildLegacyVstsDuplicateSummaryQuery,
  buildLegacyVstsStatusDistributionQuery,
} from "./query/legacy-approval-lifecycle.js";
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
  LegacyRelatedVstsItemRow,
  LegacyRelatedVstsRows,
  LegacyUserRequestDetailRow,
} from "./types/LegacyUserRequestDetailRow.js";
export type {
  LegacyRelationshipClassification,
  LegacyRelationshipSampleRow,
  LegacyRelationshipSummary,
  LegacySchemaColumn,
  LegacyUniqueIndexColumn,
} from "./types/LegacyUserRequestVstsRelationship.js";
export type {
  ApprovalPresencePattern,
  LegacyApprovalLifecycleSummary,
  LegacyLifecycleSharePointObservation,
  LegacyLifecycleVstsObservation,
  SemanticClassification,
  SemanticFinding,
  SemanticValueCount,
} from "./types/LegacyApprovalLifecycleSemantics.js";
export type {
  LegacySqlDriver,
  LegacySqlParameter,
  LegacySqlParameterValue,
  LegacySqlPool,
  LegacySqlQuery,
  LegacySqlRequest,
  MatrixSource,
} from "./types/index.js";
