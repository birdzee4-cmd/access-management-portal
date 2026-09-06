import { createHash } from "node:crypto";
import { matrixSources, type MatrixSource } from "@access-portal/connectors";

export interface CatalogObservation {
  readonly source: string;
  readonly roleName: string | null;
  readonly department: string | null;
  readonly active: string | null;
}

export type CatalogWarning = "MISSING_ROLE_NAME" | "MULTI_SOURCE_ROLE" |
  "MULTI_DEPARTMENT_ROLE" | "NORMALIZATION_COLLISION" | "ROLE_CODE_COLLISION" |
  "CONFLICTING_ACTIVE" | "UNRESOLVED_CATALOG_IDENTITY";

/** Internal observation candidate, never a persistable Portal Role DTO. */
export interface CatalogCandidate {
  readonly legacySource: MatrixSource;
  readonly observedSource: string;
  readonly sourceFingerprint: string;
  readonly candidateIdentity: string;
  readonly observedRoleName: string | null;
  readonly normalizedRoleName: string | null;
  readonly observedDepartment: string | null;
  readonly normalizedDepartment: string | null;
  readonly observedActive: string | null;
  readonly normalizedActive: string | null;
  readonly roleNameClassification: "OBSERVED";
  readonly systemResolution: "UNRESOLVED";
  readonly applicationResolution: "UNRESOLVED";
  readonly contextResolution: "UNRESOLVED";
  readonly permissionResolution: "UNRESOLVED";
  readonly candidateRoleCode: string | null;
  readonly roleCodeClassification: "GENERATED_CANDIDATE" | "UNRESOLVED";
  readonly confidence: "UNKNOWN";
  readonly classification: "UNRESOLVED" | "COLLISION";
  readonly warnings: readonly CatalogWarning[];
}

export interface CatalogCollision {
  readonly kind: Exclude<CatalogWarning, "MISSING_ROLE_NAME" | "UNRESOLVED_CATALOG_IDENTITY">;
  /** Array positions correlate even identical observations without claiming a source row key. */
  readonly candidateIndexes: readonly number[];
}

export function normalizeCatalogValue(value: string | null): string | null {
  return value?.trim().toLowerCase() || null;
}

export function normalizeCatalogSource(source: string): MatrixSource {
  const normalized = source.trim().toUpperCase();
  if (!matrixSources.includes(normalized as MatrixSource)) {
    throw new Error("Catalog observation source is not allowed.");
  }
  return normalized as MatrixSource;
}

function fingerprint(values: readonly (string | null)[]): string {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

/** Preview code only. Lossy punctuation/length conversion is checked below. */
export function generateCandidateRoleCode(source: MatrixSource, role: string): string {
  const slug = role.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "ROLE";
  return ("CAND_" + source + "_" + slug).slice(0, 100);
}

export function analyzeCatalogObservations(observations: readonly CatalogObservation[]) {
  const candidates: CatalogCandidate[] = observations.map((row) => {
    const source = normalizeCatalogSource(row.source);
    const role = normalizeCatalogValue(row.roleName);
    const department = normalizeCatalogValue(row.department);
    const active = normalizeCatalogValue(row.active);
    return {
      legacySource: source,
      observedSource: row.source,
      sourceFingerprint: fingerprint(["catalog-observation-v1", source, role, department, active]),
      // Department and Active are observations, never assumed Role identity dimensions.
      candidateIdentity: fingerprint(["catalog-role-v1", source, null, null, null, role]),
      observedRoleName: row.roleName,
      normalizedRoleName: role,
      observedDepartment: row.department,
      normalizedDepartment: department,
      observedActive: row.active,
      normalizedActive: active,
      roleNameClassification: "OBSERVED",
      systemResolution: "UNRESOLVED",
      applicationResolution: "UNRESOLVED",
      contextResolution: "UNRESOLVED",
      permissionResolution: "UNRESOLVED",
      candidateRoleCode: role === null ? null : generateCandidateRoleCode(source, role),
      roleCodeClassification: role === null ? "UNRESOLVED" : "GENERATED_CANDIDATE",
      confidence: "UNKNOWN",
      classification: "UNRESOLVED",
      warnings: role === null
        ? ["UNRESOLVED_CATALOG_IDENTITY", "MISSING_ROLE_NAME"]
        : ["UNRESOLVED_CATALOG_IDENTITY"],
    };
  });
  const collisions: CatalogCollision[] = [];
  function groups(key: (c: CatalogCandidate) => string | null) {
    const result = new Map<string, number[]>();
    candidates.forEach((candidate, index) => {
      const value = key(candidate);
      if (value !== null) result.set(value, [...(result.get(value) ?? []), index]);
    });
    return [...result.values()];
  }
  function detect(
    grouped: number[][],
    kind: CatalogCollision["kind"],
    value: (c: CatalogCandidate) => string | null,
  ) {
    for (const indexes of grouped) {
      const values = indexes.map((index) => value(candidates[index]!))
        .filter((entry) => entry !== null);
      if (new Set(values).size > 1) collisions.push({ kind, candidateIndexes: indexes });
    }
  }
  const roles = groups((c) => c.normalizedRoleName);
  detect(roles, "MULTI_SOURCE_ROLE", (c) => c.legacySource);
  detect(roles, "MULTI_DEPARTMENT_ROLE", (c) => c.normalizedDepartment);
  detect(roles, "NORMALIZATION_COLLISION", (c) => c.observedRoleName);
  detect(groups((c) => c.candidateRoleCode), "ROLE_CODE_COLLISION", (c) => c.candidateIdentity);
  // A null Active is missing evidence, not a conflicting business value.
  detect(groups((c) => c.normalizedRoleName === null ? null : c.candidateIdentity),
    "CONFLICTING_ACTIVE", (c) => c.normalizedActive);
  const annotated = candidates.map((candidate, index): CatalogCandidate => {
    const warnings = collisions.filter((c) => c.candidateIndexes.includes(index)).map((c) => c.kind);
    return { ...candidate, classification: warnings.length ? "COLLISION" : "UNRESOLVED",
      warnings: [...candidate.warnings, ...warnings] };
  });
  const count = (kind: CatalogCollision["kind"]) => collisions.filter((c) => c.kind === kind).length;
  const n = candidates.length;
  return {
    candidates: annotated,
    collisions,
    summary: {
      observationsAnalyzed: n,
      uniqueNormalizedRoleNames: roles.length,
      roleNamesInMultipleSources: count("MULTI_SOURCE_ROLE"),
      roleNamesInMultipleDepartments: count("MULTI_DEPARTMENT_ROLE"),
      normalizationCollisions: count("NORMALIZATION_COLLISION"),
      candidateCodeCollisions: count("ROLE_CODE_COLLISION"),
      conflictingActiveGroups: count("CONFLICTING_ACTIVE"),
      collisionGroups: collisions.length,
      candidatesWithCollisions: annotated.filter((c) => c.classification === "COLLISION").length,
      unresolvedCatalogIdentities: n,
      unresolvedSystems: n,
      unresolvedApplications: n,
      unresolvedPermissions: n,
      unresolvedContexts: n,
      missingRoleNames: candidates.filter((c) => c.normalizedRoleName === null).length,
      missingActiveValues: candidates.filter((c) => c.normalizedActive === null).length,
      uniqueNormalizedActiveValues: new Set(candidates.map((c) => c.normalizedActive).filter((v) => v !== null)).size,
      provenance: matrixSources.map((source) => ({
        source,
        observations: candidates.filter((c) => c.legacySource === source).length,
      })),
    },
  };
}
