/**
 * Nullable representation of the known legacy matrix columns.
 * No normalization or migration semantics are applied here.
 */
export interface LegacyProductManagementMatrixRow {
  readonly roleName: string | null;
  readonly manager: string | null;
  readonly department: string | null;
  readonly active: string | null;
}
