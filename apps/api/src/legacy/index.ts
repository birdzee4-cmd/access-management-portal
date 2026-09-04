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
export type {
  LegacyMatrixRow as LegacyMatrixRowDto,
  LegacyMatrixRowsResponse,
  LegacyMatrixSummaryResponse,
} from "@access-portal/contracts";
export { getRuntimeLegacyCatalogService } from "./runtime.js";
