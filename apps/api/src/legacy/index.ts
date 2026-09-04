export {
  DEFAULT_LEGACY_MATRIX_ROWS,
  LegacyMatrixInputError,
  handleLegacyMatrixRows,
  handleLegacyMatrixSummary,
  parseLegacyMatrixRowsQuery,
  parseLegacyMatrixSummaryQuery,
  type LegacyMatrixApiDependencies,
  type LegacyMatrixLogger,
  type LegacyMatrixQuery,
  type LegacyMatrixRequest,
} from "./legacy-matrix-api.js";
export {
  DEFAULT_LEGACY_USER_REQUEST_ROWS,
  LegacyUserRequestInputError,
  handleLegacyUserRequestList,
  parseLegacyUserRequestLimit,
  type LegacyUserRequestApiDependencies,
  type LegacyUserRequestLogger,
  type LegacyUserRequestQuery,
  type LegacyUserRequestRequest,
} from "./legacy-user-request-api.js";
export type {
  LegacyMatrixRow as LegacyMatrixRowDto,
  LegacyMatrixRowsResponse,
  LegacyMatrixSummaryResponse,
} from "@access-portal/contracts";
export {
  getRuntimeLegacyCatalogService,
  getRuntimeLegacyUserRequestService,
} from "./runtime.js";
