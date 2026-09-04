import { normalizeLegacyWorkId } from "./query/legacy-user-request-vsts.js";
import type {
  ApprovalPresencePattern,
  LegacyApprovalLifecycleSummary,
  LegacyLifecycleSharePointObservation,
  LegacyLifecycleVstsObservation,
  SemanticClassification,
  SemanticValueCount,
} from "./types/LegacyApprovalLifecycleSemantics.js";

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLocaleUpperCase("en-US");
  return normalized || null;
}

function valueCounts(values: readonly unknown[]): readonly SemanticValueCount[] {
  const counts = new Map<string | null, number>();
  for (const value of values) {
    const normalized = normalizeValue(value);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) =>
      (left.value ?? "").localeCompare(right.value ?? "", "en-US"),
    );
}

function hasValue(value: unknown): boolean {
  return normalizeValue(value) !== null;
}

function hasExplicitOffset(value: unknown): boolean {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
}

export function classifySemanticEvidence(
  observed: number,
  supporting: number,
  contradicting: number,
  causalMeaningUnproven = false,
): SemanticClassification {
  if (observed <= 0) return "UNKNOWN";
  if (supporting <= 0 && contradicting > 0) return "CONTRADICTED";
  if (contradicting > 0 || causalMeaningUnproven) return "LIKELY";
  return supporting === observed ? "CONFIRMED" : "UNKNOWN";
}

function groupByRequest(
  rows: readonly LegacyLifecycleVstsObservation[],
): Map<string, LegacyLifecycleVstsObservation[]> {
  const groups = new Map<string, LegacyLifecycleVstsObservation[]>();
  for (const row of rows) {
    const id = normalizeLegacyWorkId(row.idSharepoint);
    if (!id) continue;
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  return groups;
}

function presencePatterns(
  rows: readonly LegacyLifecycleSharePointObservation[],
): readonly ApprovalPresencePattern[] {
  const patterns = new Map<string, ApprovalPresencePattern>();
  for (const row of rows) {
    const lineManagerPresent = hasValue(row.lineManagerStatus);
    const ceoPresent = hasValue(row.ceoStatus);
    const itManagerPresent = hasValue(row.itManagerStatus);
    const key = [lineManagerPresent, ceoPresent, itManagerPresent].join("|");
    const previous = patterns.get(key);
    patterns.set(key, {
      lineManagerPresent,
      ceoPresent,
      itManagerPresent,
      count: (previous?.count ?? 0) + 1,
    });
  }
  return [...patterns.values()].sort((left, right) => right.count - left.count);
}

function distinctNonNull(values: readonly unknown[]): number {
  return new Set(values.map(normalizeValue).filter((value) => value !== null)).size;
}

/**
 * Synthetic/bounded-row analysis helper. It deliberately emits counts and
 * approved categorical values only; identifiers, dates, and extra object
 * properties never appear in its result.
 */
export function analyzeLegacyApprovalLifecycleRows(
  sharePointRows: readonly LegacyLifecycleSharePointObservation[],
  vstsRows: readonly LegacyLifecycleVstsObservation[],
): LegacyApprovalLifecycleSummary {
  const vstsByRequest = groupByRequest(vstsRows);
  let ceoAbsentWithWorkId = 0;
  let ceoAbsentWithRelatedVsts = 0;
  let itManagerAbsentWithWorkId = 0;
  let itManagerAbsentWithRelatedVsts = 0;
  let openCasePresentWithWorkId = 0;
  let openCasePresentWithStatusVsts = 0;
  let openCasePresentWithRelatedVsts = 0;
  let comparablePairs = 0;
  let matchingPairs = 0;
  let mismatchesOnMultipleVstsRequests = 0;
  let mismatchesWithMissingSharePointWorkId = 0;
  let mismatchesWithMissingVstsWorkId = 0;

  for (const row of sharePointRows) {
    const related = vstsByRequest.get(normalizeLegacyWorkId(row.idSharepoint) ?? "") ?? [];
    const hasWorkId = normalizeLegacyWorkId(row.workId) !== null;
    if (!hasValue(row.ceoStatus) && hasWorkId) ceoAbsentWithWorkId += 1;
    if (!hasValue(row.ceoStatus) && related.length > 0) ceoAbsentWithRelatedVsts += 1;
    if (!hasValue(row.itManagerStatus) && hasWorkId) itManagerAbsentWithWorkId += 1;
    if (!hasValue(row.itManagerStatus) && related.length > 0) itManagerAbsentWithRelatedVsts += 1;

    if (hasValue(row.openCase)) {
      if (hasWorkId) openCasePresentWithWorkId += 1;
      if (hasValue(row.statusVsts)) openCasePresentWithStatusVsts += 1;
      if (related.length > 0) openCasePresentWithRelatedVsts += 1;
    }

    const sourceStatus = normalizeValue(row.statusVsts);
    for (const target of related) {
      const targetStatus = normalizeValue(target.state);
      if (!sourceStatus || !targetStatus) continue;
      comparablePairs += 1;
      if (sourceStatus === targetStatus) {
        matchingPairs += 1;
      } else {
        if (related.length > 1) mismatchesOnMultipleVstsRequests += 1;
        if (!hasWorkId) mismatchesWithMissingSharePointWorkId += 1;
        if (!normalizeLegacyWorkId(target.workId)) mismatchesWithMissingVstsWorkId += 1;
      }
    }
  }

  let multipleRequestCount = 0;
  let multipleRelatedRowCount = 0;
  let requestsWithDifferentWorkIds = 0;
  let requestsWithDifferentTypes = 0;
  let requestsWithDifferentStates = 0;
  let exactDuplicateGroups = 0;
  for (const related of vstsByRequest.values()) {
    if (related.length <= 1) continue;
    multipleRequestCount += 1;
    multipleRelatedRowCount += related.length;
    if (distinctNonNull(related.map((row) => row.workId)) > 1) requestsWithDifferentWorkIds += 1;
    if (distinctNonNull(related.map((row) => row.type)) > 1) requestsWithDifferentTypes += 1;
    if (distinctNonNull(related.map((row) => row.state)) > 1) requestsWithDifferentStates += 1;

    const signatures = new Map<string, number>();
    for (const row of related) {
      const signature = JSON.stringify([
        normalizeLegacyWorkId(row.workId),
        normalizeValue(row.type),
        normalizeValue(row.state),
        normalizeValue(row.createdDateText),
        normalizeValue(row.updatedDateText),
      ]);
      signatures.set(signature, (signatures.get(signature) ?? 0) + 1);
    }
    exactDuplicateGroups += [...signatures.values()].filter((count) => count > 1).length;
  }

  const mismatchingPairs = comparablePairs - matchingPairs;
  const statusClassification = classifySemanticEvidence(
    comparablePairs,
    matchingPairs,
    mismatchingPairs,
    true,
  );

  return {
    sharePointRowsRead: sharePointRows.length,
    vstsRowsRead: vstsRows.length,
    approvalValues: {
      lineManager: valueCounts(sharePointRows.map((row) => row.lineManagerStatus)),
      ceo: valueCounts(sharePointRows.map((row) => row.ceoStatus)),
      itManager: valueCounts(sharePointRows.map((row) => row.itManagerStatus)),
    },
    approvalPresencePatterns: presencePatterns(sharePointRows),
    downstreamEvidence: {
      ceoAbsentWithWorkId,
      ceoAbsentWithRelatedVsts,
      itManagerAbsentWithWorkId,
      itManagerAbsentWithRelatedVsts,
    },
    openCase: {
      values: valueCounts(sharePointRows.map((row) => row.openCase)),
      presentWithWorkId: openCasePresentWithWorkId,
      presentWithStatusVsts: openCasePresentWithStatusVsts,
      presentWithRelatedVsts: openCasePresentWithRelatedVsts,
    },
    statusComparison: {
      comparablePairs,
      matchingPairs,
      mismatchingPairs,
      mismatchesOnMultipleVstsRequests,
      mismatchesWithMissingSharePointWorkId,
      mismatchesWithMissingVstsWorkId,
    },
    multipleVsts: {
      requestCount: multipleRequestCount,
      relatedRowCount: multipleRelatedRowCount,
      requestsWithDifferentWorkIds,
      requestsWithDifferentTypes,
      requestsWithDifferentStates,
      exactDuplicateGroups,
    },
    dateTime: {
      sharePointCreatedMissing: sharePointRows.filter((row) => !hasValue(row.createdDateText)).length,
      sharePointUpdatedMissing: sharePointRows.filter((row) => !hasValue(row.updatedDateText)).length,
      sharePointValuesWithExplicitOffset: sharePointRows.reduce(
        (count, row) => count + Number(hasExplicitOffset(row.createdDateText)) + Number(hasExplicitOffset(row.updatedDateText)),
        0,
      ),
      vstsCreatedMissing: vstsRows.filter((row) => !hasValue(row.createdDateText)).length,
      vstsUpdatedMissing: vstsRows.filter((row) => !hasValue(row.updatedDateText)).length,
      vstsValuesWithExplicitOffset: vstsRows.reduce(
        (count, row) => count + Number(hasExplicitOffset(row.createdDateText)) + Number(hasExplicitOffset(row.updatedDateText)),
        0,
      ),
      timezone: "UNKNOWN",
    },
    findings: [
      {
        subject: "approval-ordering",
        classification: "UNKNOWN",
        evidenceSummary: "Approval value presence can be counted.",
        limitations: "No per-stage approval timestamp is present.",
      },
      {
        subject: "ceo-stage-mandatory",
        classification: ceoAbsentWithRelatedVsts > 0 ? "CONTRADICTED" : "UNKNOWN",
        evidenceSummary: "Requests without a CEO value can be checked for downstream VSTS evidence.",
        limitations: "A blank value cannot distinguish optional, skipped, or missing data.",
      },
      {
        subject: "it-manager-stage-mandatory",
        classification: itManagerAbsentWithRelatedVsts > 0 ? "CONTRADICTED" : "UNKNOWN",
        evidenceSummary: "Requests without an IT Manager value can be checked for downstream VSTS evidence.",
        limitations: "A blank value cannot distinguish optional, skipped, or missing data.",
      },
      {
        subject: "open-case-business-meaning",
        classification: "UNKNOWN",
        evidenceSummary: "OpenCase co-occurrence can be measured.",
        limitations: "Correlation does not establish authoritative business meaning.",
      },
      {
        subject: "status-vsts-state-association",
        classification: statusClassification,
        evidenceSummary: "Comparable request-to-VSTS state pairs are counted.",
        limitations: "Backup timing and update direction are not proven.",
      },
      {
        subject: "one-request-can-have-multiple-vsts-rows",
        classification: multipleRequestCount > 0 ? "CONFIRMED" : "UNKNOWN",
        evidenceSummary: "Related VSTS row cardinality is observed by request reference.",
        limitations: "The snapshot cannot define a primary Work Item.",
      },
      {
        subject: "timestamp-timezone",
        classification: "UNKNOWN",
        evidenceSummary: "Missing and explicitly offset-looking values are counted.",
        limitations: "Source types and text alone do not prove the business timezone.",
      },
    ],
  };
}
