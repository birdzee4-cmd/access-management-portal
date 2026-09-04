import type {
  LegacyProductManagementMatrixRow,
  MatrixSource,
  ReadOnlyLegacySqlConnector,
} from "@access-portal/connectors";
import {
  MAX_LEGACY_MATRIX_ROWS,
  enforceLegacyMatrixRowLimit,
} from "@access-portal/connectors";

import {
  analyzeLegacyMatrixRows,
  type LegacyMatrixSummary,
} from "./legacy-matrix-analysis.js";

export type LegacyCatalogReader = Pick<
  ReadOnlyLegacySqlConnector,
  "listProductManagementMatrix"
>;

/**
 * API service boundary for future legacy catalog reads.
 * Task 07A does not construct this service with production configuration or
 * expose it through an HTTP route.
 */
export class LegacyCatalogService {
  constructor(private readonly legacySql: LegacyCatalogReader) {}

  getMatrixRows(
    source: MatrixSource,
    limit = MAX_LEGACY_MATRIX_ROWS,
  ): Promise<readonly LegacyProductManagementMatrixRow[]> {
    return this.legacySql.listProductManagementMatrix(
      source,
      enforceLegacyMatrixRowLimit(limit),
    );
  }

  async getMatrixSummary(
    source: MatrixSource,
    limit = MAX_LEGACY_MATRIX_ROWS,
  ): Promise<LegacyMatrixSummary> {
    return analyzeLegacyMatrixRows(
      source,
      await this.getMatrixRows(source, limit),
    );
  }

  listProductManagementMatrix(
    source: MatrixSource,
  ): Promise<readonly LegacyProductManagementMatrixRow[]> {
    return this.getMatrixRows(source);
  }
}
