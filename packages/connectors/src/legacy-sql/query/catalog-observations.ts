import type { LegacySqlQuery, MatrixSource } from "../types/index.js";
import {
  enforceLegacyMatrixRowLimit,
  getLegacyProductManagementMatrixTable,
} from "./product-management-matrix.js";

/** Catalog-only projection; approval/person fields are deliberately absent. */
export function buildLegacyCatalogObservationsQuery(
  source: MatrixSource,
  limit = 50,
): LegacySqlQuery {
  const table = getLegacyProductManagementMatrixTable(source);
  const safeLimit = enforceLegacyMatrixRowLimit(limit);
  return {
    text: "SELECT TOP (@limit) [RoleName] AS [roleName], " +
      "[Department] AS [department], [Active] AS [active] FROM " + table,
    parameters: [{ name: "limit", value: safeLimit }],
  };
}
