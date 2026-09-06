import {
  assertLegacySqlReadOnlyQuery,
  buildLegacyCatalogObservationsQuery,
  enforceLegacyMatrixRowLimit,
  matrixSources,
  type ReadOnlyLegacySqlConnector,
} from "@access-portal/connectors";
import { analyzeCatalogObservations, type CatalogObservation } from "./legacy-catalog-mapping.js";

function observationValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return String(value);
  throw new Error("Unsupported catalog observation value.");
}

/** Explicitly invoked internal preview only; no runtime/API/container registration. */
export class LegacyCatalogPreviewService {
  constructor(private readonly reader: Pick<ReadOnlyLegacySqlConnector, "executeSelect">) {}

  async preview(limit = 50) {
    const safeLimit = enforceLegacyMatrixRowLimit(limit);
    const observations: CatalogObservation[] = [];
    const provenance = [];
    for (const source of matrixSources) {
      const query = buildLegacyCatalogObservationsQuery(source, safeLimit);
      assertLegacySqlReadOnlyQuery(query.text);
      const rows = await this.reader.executeSelect<Record<string, unknown>>(query);
      if (rows.length > safeLimit) throw new Error("Catalog observation row limit exceeded.");
      provenance.push({ source, observations: rows.length, limit: safeLimit, limitReached: rows.length === safeLimit });
      for (const row of rows) {
        observations.push({ source, roleName: observationValue(row.roleName),
          department: observationValue(row.department), active: observationValue(row.active) });
      }
    }
    const analysis = analyzeCatalogObservations(observations);
    return { ...analysis, summary: { ...analysis.summary, provenance, boundedSample: true as const,
      stableOrdering: false as const, completeVocabulary: false as const } };
  }
}
