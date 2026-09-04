import { normalizeLegacyWorkId } from "./query/legacy-user-request-vsts.js";
import type {
  LegacyRelationshipClassification,
  LegacyRelationshipSampleRow,
  LegacyRelationshipSummary,
} from "./types/LegacyUserRequestVstsRelationship.js";

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toLocaleLowerCase("en-US");
  return normalized || null;
}

function countByWorkId(
  rows: readonly LegacyRelationshipSampleRow[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const workId = normalizeLegacyWorkId(row.workId);
    if (workId) {
      counts.set(workId, (counts.get(workId) ?? 0) + 1);
    }
  }
  return counts;
}

function classifyEvidence(
  comparable: number,
  matching: number,
  causalInference: boolean,
): LegacyRelationshipClassification {
  if (comparable === 0) {
    return "UNKNOWN";
  }
  if (matching === 0) {
    return "CONTRADICTED";
  }
  if (causalInference || matching < comparable) {
    return "LIKELY";
  }
  return "CONFIRMED";
}

/**
 * Returns counts and evidence labels only. Source values never leave this
 * function, which makes the result safe to log or document.
 */
export function analyzeLegacyUserRequestVstsRows(
  sharePointRows: readonly LegacyRelationshipSampleRow[],
  vstsRows: readonly LegacyRelationshipSampleRow[],
): LegacyRelationshipSummary {
  const sharePointCounts = countByWorkId(sharePointRows);
  const vstsCounts = countByWorkId(vstsRows);
  const vstsRowsByWorkId = new Map<string, LegacyRelationshipSampleRow[]>();

  for (const row of vstsRows) {
    const workId = normalizeLegacyWorkId(row.workId);
    if (!workId) continue;
    const matches = vstsRowsByWorkId.get(workId) ?? [];
    matches.push(row);
    vstsRowsByWorkId.set(workId, matches);
  }

  let matchedWorkIdKeys = 0;
  let matchedRowPairs = 0;
  let oneToOneKeys = 0;
  let oneToManyKeys = 0;
  let manyToOneKeys = 0;
  let manyToManyKeys = 0;
  for (const [workId, sourceCount] of sharePointCounts) {
    const targetCount = vstsCounts.get(workId) ?? 0;
    if (targetCount === 0) continue;
    matchedWorkIdKeys += 1;
    matchedRowPairs += sourceCount * targetCount;
    if (sourceCount === 1 && targetCount === 1) oneToOneKeys += 1;
    else if (sourceCount === 1) oneToManyKeys += 1;
    else if (targetCount === 1) manyToOneKeys += 1;
    else manyToManyKeys += 1;
  }

  let comparableIdSharepointPairs = 0;
  let matchingIdSharepointPairs = 0;
  let comparableStatusPairs = 0;
  let matchingStatusPairs = 0;
  for (const sourceRow of sharePointRows) {
    const workId = normalizeLegacyWorkId(sourceRow.workId);
    if (!workId) continue;
    for (const targetRow of vstsRowsByWorkId.get(workId) ?? []) {
      const sourceId = normalizeLegacyWorkId(sourceRow.idSharepoint);
      const targetId = normalizeLegacyWorkId(targetRow.idSharepoint);
      if (sourceId && targetId) {
        comparableIdSharepointPairs += 1;
        if (sourceId === targetId) matchingIdSharepointPairs += 1;
      }

      const sourceStatus = normalizeText(sourceRow.status);
      const targetStatus = normalizeText(targetRow.status);
      if (sourceStatus && targetStatus) {
        comparableStatusPairs += 1;
        if (sourceStatus === targetStatus) matchingStatusPairs += 1;
      }
    }
  }

  return {
    sharePointRowsRead: sharePointRows.length,
    vstsRowsRead: vstsRows.length,
    sharePointRowsWithUsableWorkId: [...sharePointCounts.values()].reduce(
      (total, count) => total + count,
      0,
    ),
    vstsRowsWithUsableWorkId: [...vstsCounts.values()].reduce(
      (total, count) => total + count,
      0,
    ),
    matchedWorkIdKeys,
    matchedRowPairs,
    duplicateSharePointWorkIdKeys: [...sharePointCounts.values()].filter(
      (count) => count > 1,
    ).length,
    duplicateVstsWorkIdKeys: [...vstsCounts.values()].filter(
      (count) => count > 1,
    ).length,
    oneToOneKeys,
    oneToManyKeys,
    manyToOneKeys,
    manyToManyKeys,
    comparableIdSharepointPairs,
    matchingIdSharepointPairs,
    comparableStatusPairs,
    matchingStatusPairs,
    workIdRelationship: matchedWorkIdKeys > 0 ? "CONFIRMED" : "UNKNOWN",
    idSharepointRelationship: classifyEvidence(
      comparableIdSharepointPairs,
      matchingIdSharepointPairs,
      false,
    ),
    statusSynchronization: classifyEvidence(
      comparableStatusPairs,
      matchingStatusPairs,
      true,
    ),
  };
}
