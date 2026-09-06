import {
  assertLegacySqlReadOnlyQuery, buildLegacyProductManagementMatrixQuery,
  enforceLegacyMatrixRowLimit, matrixSources, type ReadOnlyLegacySqlConnector,
} from "@access-portal/connectors";
import { analyzeCatalogObservations } from "./legacy-catalog-mapping.js";
import { analyzeApprovalObservations, type ApprovalObservation } from "./legacy-approval-mapping.js";

function value(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "string") return input;
  if (typeof input === "boolean" || (typeof input === "number" && Number.isFinite(input))) return String(input);
  throw new Error("Unsupported approval observation value.");
}

/** Internal invocation only. No registration, persistence, identity lookup or workflow port. */
export class LegacyApprovalPreviewService {
  constructor(private readonly reader: Pick<ReadOnlyLegacySqlConnector, "executeSelect">) {}

  async preview(limit = 50) {
    const bound = enforceLegacyMatrixRowLimit(limit);
    const observations: ApprovalObservation[] = [];
    const samples = [];
    for (const source of matrixSources) {
      const query = buildLegacyProductManagementMatrixQuery(source, bound);
      assertLegacySqlReadOnlyQuery(query.text);
      const rows = await this.reader.executeSelect<Record<string, unknown>>(query);
      if (rows.length > bound) throw new Error("Approval observation row limit exceeded.");
      samples.push({ source, observations: rows.length, limit: bound, limitReached: rows.length === bound });
      for (const row of rows) observations.push({ source, roleName: value(row.roleName),
        department: value(row.department), manager: value(row.manager), active: value(row.active) });
    }
    // Same read batch supplies both analyses, avoiding a second unordered SQL sample.
    const catalog = analyzeCatalogObservations(observations.map((r) => ({
      source: r.source, roleName: r.roleName, department: r.department, active: r.active,
    })));
    const analysis = analyzeApprovalObservations(observations, catalog.candidates);
    return { ...analysis, summary: { ...analysis.summary, samples,
      boundedSample: true as const, stableOrdering: false as const, completeVocabulary: false as const } };
  }

  /** The only production reporting surface: counts and fixed source labels. */
  async summarize(limit = 50) {
    return (await this.preview(limit)).summary;
  }
}
