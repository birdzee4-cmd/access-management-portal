import { createHash } from "node:crypto";
import { matrixSources, type MatrixSource } from "@access-portal/connectors";
import {
  analyzeCatalogObservations, normalizeCatalogSource, normalizeCatalogValue,
  type CatalogCandidate, type CatalogObservation,
} from "./legacy-catalog-mapping.js";

export interface ApprovalObservation extends CatalogObservation {
  readonly manager: string | null;
}

export type ApprovalMode = "UNKNOWN" | "ANY" | "ALL" | "SEQUENTIAL";
export type ApproverIdentityType = "UNKNOWN" | "PORTAL_USER" | "ENTRA_USER" |
  "ENTRA_GROUP" | "SERVICE_PRINCIPAL";
export type ApprovalWarning = "UNRESOLVED_SCOPE" | "MISSING_SCOPE_VALUE" |
  "MISSING_MANAGER" | "MULTIPLE_MANAGERS" | "SHARED_MANAGER" |
  "SOURCE_CROSSING_MANAGER_SETS" | "DEPARTMENT_AMBIGUITY" |
  "NORMALIZATION_COLLISION" | "CONFLICTING_ACTIVE" | "CATALOG_LINK_AMBIGUITY" |
  "FINGERPRINT_COLLISION";

export interface ApprovalRuleApproverCandidate {
  readonly candidateFingerprint: string;
  readonly managerObservation: "OBSERVED" | "UNAVAILABLE";
  readonly identityResolution: "UNRESOLVED";
  readonly identityType: ApproverIdentityType;
  readonly sequenceResolution: "UNRESOLVED";
  readonly sequence: null;
  readonly decisionSemantics: ApprovalMode;
  readonly confidence: "UNKNOWN";
  readonly warnings: readonly ApprovalWarning[];
}

export interface ApprovalRuleCandidate {
  readonly legacySource: MatrixSource;
  readonly candidateFingerprint: string;
  readonly normalizedRoleName: string | null;
  readonly normalizedDepartment: string | null;
  /** Every row retained, including duplicates; no Manager values in output. */
  readonly observations: readonly {
    observedSource: string;
    observedRoleName: string | null;
    observedDepartment: string | null;
    observedActive: string | null;
    normalizedActive: string | null;
    catalogObservationFingerprint: string;
  }[];
  readonly catalogCandidateFingerprint: string | null;
  readonly catalogLinkResolution: "RESOLVED" | "UNRESOLVED" | "COLLISION";
  readonly approvalScopeResolution: "UNRESOLVED";
  readonly approvalMode: ApprovalMode;
  readonly sequenceResolution: "UNRESOLVED";
  readonly approvers: readonly ApprovalRuleApproverCandidate[];
  readonly distinctManagerCount: number;
  readonly confidence: "UNKNOWN";
  readonly warnings: readonly ApprovalWarning[];
}

/** Comparison only; never identifies a real user or rewrites a business name. */
export const normalizeApprovalValue = normalizeCatalogValue;
export const normalizeApprovalSource = normalizeCatalogSource;

const tuple = (values: readonly (string | null)[]) => JSON.stringify(values);
const digest = (canonical: string) => createHash("sha256").update(canonical).digest("hex");

/** Different canonical inputs sharing a digest are never used as a grouping key. */
export function findUnexpectedFingerprintCollisions(
  entries: readonly { fingerprint: string; canonical: string }[],
): readonly (readonly number[])[] {
  const groups = new Map<string, number[]>();
  entries.forEach((entry, index) => groups.set(entry.fingerprint, [...(groups.get(entry.fingerprint) ?? []), index]));
  return [...groups.values()].filter((indexes) =>
    new Set(indexes.map((i) => entries[i]!.canonical)).size > 1);
}

function groupIndexes<T>(rows: readonly T[], key: (row: T) => string | null): number[][] {
  const groups = new Map<string, number[]>();
  rows.forEach((row, i) => {
    const value = key(row);
    if (value !== null) groups.set(value, [...(groups.get(value) ?? []), i]);
  });
  return [...groups.values()];
}

/** Pure analysis. Raw and normalized Manager strings never leave this function. */
export function analyzeApprovalObservations(
  observations: readonly ApprovalObservation[],
  catalogCandidates: readonly CatalogCandidate[] = [],
) {
  // The existing catalog mapper receives a person-free explicit projection.
  const catalogProvenance = analyzeCatalogObservations(observations.map((r) => ({
    source: r.source, roleName: r.roleName, department: r.department, active: r.active,
  }))).candidates;
  const rows = observations.map((row, i) => ({
    source: normalizeApprovalSource(row.source),
    role: normalizeApprovalValue(row.roleName),
    department: normalizeApprovalValue(row.department),
    manager: normalizeApprovalValue(row.manager),
    active: normalizeApprovalValue(row.active),
    original: row,
    catalog: catalogProvenance[i]!,
  }));
  type Row = (typeof rows)[number];
  const scope = (r: Row) => tuple([r.source, r.role, r.department]);
  const ruleGroups = groupIndexes(rows, scope);
  const ambiguities: { kind: ApprovalWarning; observationIndexes: readonly number[] }[] = [];
  const add = (kind: ApprovalWarning, indexes: readonly number[]) => ambiguities.push({ kind, observationIndexes: indexes });
  const distinct = (indexes: readonly number[], field: (r: Row) => string | null) =>
    new Set(indexes.map((i) => field(rows[i]!)).filter((value) => value !== null)).size;

  const roleDepartmentGroups = groupIndexes(rows, (r) => r.role === null || r.department === null ? null : tuple([r.role, r.department]));
  const roleDepartmentMultipleManagers = roleDepartmentGroups.filter((g) => distinct(g, (r) => r.manager) > 1).length;
  const roleGroups = groupIndexes(rows, (r) => r.role);
  for (const indexes of roleGroups) {
    const sources = new Map<string, Set<string>>();
    for (const i of indexes) {
      const r = rows[i]!;
      const values = sources.get(r.source) ?? new Set<string>();
      if (r.manager !== null) values.add(r.manager);
      sources.set(r.source, values);
    }
    // Missing Manager is absence of evidence; compare only populated sets.
    const sets = [...sources.values()].filter((s) => s.size > 0);
    if (sets.length > 1 && new Set(sets.map((s) => JSON.stringify([...s].sort()))).size > 1) {
      add("SOURCE_CROSSING_MANAGER_SETS", indexes);
    }
  }
  for (const indexes of groupIndexes(rows, (r) => r.role === null ? null : tuple([r.source, r.role]))) {
    if (distinct(indexes, (r) => r.department) > 1) add("DEPARTMENT_AMBIGUITY", indexes);
  }
  for (const indexes of groupIndexes(rows, (r) => r.manager)) {
    if (new Set(indexes.map((i) => scope(rows[i]!))).size > 1) add("SHARED_MANAGER", indexes);
  }
  for (const field of ["source", "roleName", "department", "manager", "active"] as const) {
    for (const indexes of groupIndexes(rows, (r) => field === "source" ? r.source : normalizeApprovalValue(r.original[field]))) {
      if (new Set(indexes.map((i) => rows[i]!.original[field])).size > 1) add("NORMALIZATION_COLLISION", indexes);
    }
  }
  for (const indexes of ruleGroups) {
    if (distinct(indexes, (r) => r.manager) > 1) add("MULTIPLE_MANAGERS", indexes);
    if (distinct(indexes, (r) => r.active) > 1) add("CONFLICTING_ACTIVE", indexes);
  }

  const ruleEntries = ruleGroups.map((indexes) => {
    const r = rows[indexes[0]!]!;
    const canonical = tuple(["approval-rule-v1", r.source, r.role, r.department]);
    return { canonical, fingerprint: digest(canonical) };
  });
  const approverEntries = rows.map((r) => {
    const canonical = tuple(["approval-approver-v1", r.source, r.role, r.department, r.manager]);
    return { canonical, fingerprint: digest(canonical) };
  });
  const ruleHashCollisions = findUnexpectedFingerprintCollisions(ruleEntries);
  const approverHashCollisions = findUnexpectedFingerprintCollisions(approverEntries);
  for (const indexes of ruleHashCollisions) add("FINGERPRINT_COLLISION", indexes.flatMap((i) => ruleGroups[i]!));
  for (const indexes of approverHashCollisions) add("FINGERPRINT_COLLISION", indexes);

  const candidates: ApprovalRuleCandidate[] = ruleGroups.map((indexes, groupIndex) => {
    const first = rows[indexes[0]!]!;
    const expected = new Set(indexes.map((i) => rows[i]!.catalog.sourceFingerprint));
    // Match provenance AND normalized fields; a hash alone is never sufficient.
    const matches = catalogCandidates.filter((c) => expected.has(c.sourceFingerprint) &&
      c.legacySource === first.source && c.normalizedRoleName === first.role &&
      c.normalizedDepartment === first.department && indexes.some((i) => rows[i]!.active === c.normalizedActive));
    let catalogLinkResolution: ApprovalRuleCandidate["catalogLinkResolution"] = "UNRESOLVED";
    if (matches.length > 1 || matches.some((c) => c.classification === "COLLISION")) catalogLinkResolution = "COLLISION";
    else if (expected.size === 1 && matches.length === 1 && first.role !== null && first.department !== null) catalogLinkResolution = "RESOLVED";
    const hashConflict = ambiguities.some((a) => a.kind === "FINGERPRINT_COLLISION" && a.observationIndexes.some((i) => indexes.includes(i)));
    if (hashConflict) catalogLinkResolution = "COLLISION";
    if (catalogLinkResolution !== "RESOLVED") add("CATALOG_LINK_AMBIGUITY", indexes);
    const warnings: ApprovalWarning[] = ["UNRESOLVED_SCOPE"];
    if (first.role === null || first.department === null) warnings.push("MISSING_SCOPE_VALUE");
    if (indexes.some((i) => rows[i]!.manager === null)) warnings.push("MISSING_MANAGER");
    warnings.push(...new Set(ambiguities.filter((a) => a.observationIndexes.some((i) => indexes.includes(i))).map((a) => a.kind)));
    return {
      legacySource: first.source,
      candidateFingerprint: ruleEntries[groupIndex]!.fingerprint,
      normalizedRoleName: first.role,
      normalizedDepartment: first.department,
      observations: indexes.map((i) => ({
        observedSource: rows[i]!.original.source,
        observedRoleName: rows[i]!.original.roleName,
        observedDepartment: rows[i]!.original.department,
        observedActive: rows[i]!.original.active,
        normalizedActive: rows[i]!.active,
        catalogObservationFingerprint: rows[i]!.catalog.sourceFingerprint,
      })),
      catalogCandidateFingerprint: catalogLinkResolution === "RESOLVED" ? matches[0]!.sourceFingerprint : null,
      catalogLinkResolution,
      approvalScopeResolution: "UNRESOLVED",
      approvalMode: "UNKNOWN",
      sequenceResolution: "UNRESOLVED",
      approvers: indexes.map((i) => ({
        candidateFingerprint: approverEntries[i]!.fingerprint,
        managerObservation: rows[i]!.manager === null ? "UNAVAILABLE" : "OBSERVED",
        identityResolution: "UNRESOLVED",
        identityType: "UNKNOWN",
        sequenceResolution: "UNRESOLVED",
        sequence: null,
        decisionSemantics: "UNKNOWN",
        confidence: "UNKNOWN",
        warnings: [...(rows[i]!.manager === null ? ["MISSING_MANAGER" as const] : []),
          ...new Set(ambiguities.filter((a) => a.observationIndexes.includes(i)).map((a) => a.kind))],
      })),
      distinctManagerCount: distinct(indexes, (r) => r.manager),
      confidence: "UNKNOWN",
      warnings,
    };
  });
  const count = (kind: ApprovalWarning) => ambiguities.filter((a) => a.kind === kind).length;
  const grouping = (key: (r: Row) => string | null) => {
    const groups = groupIndexes(rows, key);
    return { groups: groups.length, multiManagerGroups: groups.filter((g) => distinct(g, (r) => r.manager) > 1).length };
  };
  return {
    candidates,
    ambiguities,
    summary: {
      observationsAnalyzed: rows.length,
      approvalRuleCandidates: candidates.length,
      approverObservations: rows.filter((r) => r.manager !== null).length,
      approverCandidateEntries: rows.length,
      blankOrNullManagers: rows.filter((r) => r.manager === null).length,
      oneManagerCandidates: candidates.filter((c) => c.distinctManagerCount === 1).length,
      multiManagerCandidates: candidates.filter((c) => c.distinctManagerCount > 1).length,
      noManagerCandidates: candidates.filter((c) => c.distinctManagerCount === 0).length,
      maxManagersPerCandidate: Math.max(0, ...candidates.map((c) => c.distinctManagerCount)),
      unresolvedIdentities: rows.length,
      unresolvedCatalogLinks: candidates.filter((c) => c.catalogLinkResolution !== "RESOLVED").length,
      resolvedCatalogObservationLinks: candidates.filter((c) => c.catalogLinkResolution === "RESOLVED").length,
      catalogLinkCollisions: candidates.filter((c) => c.catalogLinkResolution === "COLLISION").length,
      sourceCrossingCollisions: count("SOURCE_CROSSING_MANAGER_SETS"),
      departmentAmbiguities: count("DEPARTMENT_AMBIGUITY"),
      sharedManagerGroups: count("SHARED_MANAGER"),
      roleDepartmentMultipleManagers,
      normalizationCollisions: count("NORMALIZATION_COLLISION"),
      conflictingActiveGroups: count("CONFLICTING_ACTIVE"),
      unexpectedFingerprintCollisions: ruleHashCollisions.length + approverHashCollisions.length,
      ambiguityGroups: ambiguities.length,
      approvalModeUnknown: candidates.length,
      sequenceUnresolved: candidates.length,
      approverSequenceUnresolved: rows.length,
      groupingComparisons: {
        role: grouping((r) => r.role),
        roleDepartment: grouping((r) => r.role === null || r.department === null ? null : tuple([r.role, r.department])),
        roleSource: grouping((r) => r.role === null ? null : tuple([r.role, r.source])),
        roleDepartmentSource: grouping(scope),
      },
      provenance: matrixSources.map((source) => ({ source,
        observations: rows.filter((r) => r.source === source).length,
        ruleCandidates: candidates.filter((c) => c.legacySource === source).length,
        distinctDepartments: new Set(rows.filter((r) => r.source === source).map((r) => r.department).filter((v) => v !== null)).size,
      })),
    },
  };
}
