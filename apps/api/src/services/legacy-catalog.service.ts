import type {
  LegacyProductManagementMatrixRow,
  MatrixSource,
  ReadOnlyLegacySqlConnector,
} from "@access-portal/connectors";

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

  listProductManagementMatrix(
    source: MatrixSource,
  ): Promise<readonly LegacyProductManagementMatrixRow[]> {
    return this.legacySql.listProductManagementMatrix(source);
  }
}
