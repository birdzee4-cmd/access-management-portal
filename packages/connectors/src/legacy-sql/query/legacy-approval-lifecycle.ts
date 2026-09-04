import type { LegacySqlQuery } from "../types/index.js";

const SHAREPOINT_TABLE = "[dbo].[All_SharepointUserRequest]";
const VSTS_TABLE = "[dbo].[All_Azure_Dev(VSTS)]";
const normalized = (column: string): string =>
  `NULLIF(UPPER(LTRIM(RTRIM(${column}))), N'')`;

/** Aggregate-only approval vocabulary; NULL and blank remain distinguishable. */
export function buildLegacyApprovalStatusDistributionQuery(): LegacySqlQuery {
  const stageSelect = (stage: string, column: string): string =>
    `SELECT N'${stage}' AS [stage], CASE WHEN ${column} IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(${column})) = N'' THEN N'BLANK' ELSE N'VALUE' END AS [valueKind], ${normalized(column)} AS [statusValue] FROM ${SHAREPOINT_TABLE}`;
  return {
    text:
      "SELECT [stage], [valueKind], [statusValue], COUNT_BIG(*) AS [rowCount] FROM (" +
      stageSelect("LINE_MANAGER", "[StatusLineManager]") +
      " UNION ALL " +
      stageSelect("CEO", "[StatusCEOApprove]") +
      " UNION ALL " +
      stageSelect("IT_MANAGER", "[StatusITManager]") +
      ") AS [approvalValues] GROUP BY [stage], [valueKind], [statusValue] ORDER BY [stage], [valueKind], [statusValue]",
  };
}

/** Presence patterns plus downstream evidence, grouped without request identifiers. */
export function buildLegacyApprovalPresencePatternQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT [lineManagerPresent], [ceoPresent], [itManagerPresent], [workIdPresent], [statusVstsPresent], [openCasePresent], [relatedVstsPresent], COUNT_BIG(*) AS [requestCount], SUM([relatedVstsRows]) AS [relatedVstsRows] FROM (" +
      "SELECT CASE WHEN " + normalized("s.[StatusLineManager]") + " IS NULL THEN 0 ELSE 1 END AS [lineManagerPresent], " +
      "CASE WHEN " + normalized("s.[StatusCEOApprove]") + " IS NULL THEN 0 ELSE 1 END AS [ceoPresent], " +
      "CASE WHEN " + normalized("s.[StatusITManager]") + " IS NULL THEN 0 ELSE 1 END AS [itManagerPresent], " +
      "CASE WHEN TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[Work_ID])), N'')) IS NULL THEN 0 ELSE 1 END AS [workIdPresent], " +
      "CASE WHEN " + normalized("s.[StatusVSTS]") + " IS NULL THEN 0 ELSE 1 END AS [statusVstsPresent], " +
      "CASE WHEN " + normalized("s.[OpenCase]") + " IS NULL THEN 0 ELSE 1 END AS [openCasePresent], " +
      "CASE WHEN COALESCE(v.[relatedVstsRows], 0) = 0 THEN 0 ELSE 1 END AS [relatedVstsPresent], COALESCE(v.[relatedVstsRows], 0) AS [relatedVstsRows] " +
      `FROM ${SHAREPOINT_TABLE} AS s LEFT JOIN (` +
      `SELECT [IDSharepoint], COUNT_BIG(*) AS [relatedVstsRows] FROM ${VSTS_TABLE} WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint]` +
      ") AS v ON v.[IDSharepoint] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[IDSharepoint])), N''))" +
      ") AS [patterns] GROUP BY [lineManagerPresent], [ceoPresent], [itManagerPresent], [workIdPresent], [statusVstsPresent], [openCasePresent], [relatedVstsPresent] " +
      "ORDER BY [lineManagerPresent], [ceoPresent], [itManagerPresent], [workIdPresent], [statusVstsPresent], [openCasePresent], [relatedVstsPresent]",
  };
}

/** OpenCase vocabulary correlated only with presence flags and aggregate VSTS counts. */
export function buildLegacyOpenCaseCorrelationQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT [valueKind], [openCaseValue], [workIdPresent], [statusVstsPresent], [lineManagerPresent], [ceoPresent], [itManagerPresent], [relatedVstsPresent], COUNT_BIG(*) AS [requestCount], SUM([relatedVstsRows]) AS [relatedVstsRows] FROM (" +
      "SELECT CASE WHEN s.[OpenCase] IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(s.[OpenCase])) = N'' THEN N'BLANK' ELSE N'VALUE' END AS [valueKind], " +
      normalized("s.[OpenCase]") + " AS [openCaseValue], " +
      "CASE WHEN TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[Work_ID])), N'')) IS NULL THEN 0 ELSE 1 END AS [workIdPresent], " +
      "CASE WHEN " + normalized("s.[StatusVSTS]") + " IS NULL THEN 0 ELSE 1 END AS [statusVstsPresent], " +
      "CASE WHEN " + normalized("s.[StatusLineManager]") + " IS NULL THEN 0 ELSE 1 END AS [lineManagerPresent], " +
      "CASE WHEN " + normalized("s.[StatusCEOApprove]") + " IS NULL THEN 0 ELSE 1 END AS [ceoPresent], " +
      "CASE WHEN " + normalized("s.[StatusITManager]") + " IS NULL THEN 0 ELSE 1 END AS [itManagerPresent], " +
      "CASE WHEN COALESCE(v.[relatedVstsRows], 0) = 0 THEN 0 ELSE 1 END AS [relatedVstsPresent], COALESCE(v.[relatedVstsRows], 0) AS [relatedVstsRows] " +
      `FROM ${SHAREPOINT_TABLE} AS s LEFT JOIN (` +
      `SELECT [IDSharepoint], COUNT_BIG(*) AS [relatedVstsRows] FROM ${VSTS_TABLE} WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint]` +
      ") AS v ON v.[IDSharepoint] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[IDSharepoint])), N''))" +
      ") AS [correlations] GROUP BY [valueKind], [openCaseValue], [workIdPresent], [statusVstsPresent], [lineManagerPresent], [ceoPresent], [itManagerPresent], [relatedVstsPresent] " +
      "ORDER BY [valueKind], [openCaseValue], [workIdPresent], [statusVstsPresent], [lineManagerPresent], [ceoPresent], [itManagerPresent], [relatedVstsPresent]",
  };
}

/** Count-only counterexamples to treating any approval stage as mandatory. */
export function buildLegacyApprovalContinuationSummaryQuery(): LegacySqlQuery {
  const lineMissing = normalized("s.[StatusLineManager]") + " IS NULL";
  const ceoMissing = normalized("s.[StatusCEOApprove]") + " IS NULL";
  const itMissing = normalized("s.[StatusITManager]") + " IS NULL";
  const workPresent =
    "TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[Work_ID])), N'')) IS NOT NULL";
  return {
    text:
      "SELECT COUNT_BIG(*) AS [requestCount], " +
      "SUM(CASE WHEN " + lineMissing + " THEN 1 ELSE 0 END) AS [lineManagerMissing], " +
      "SUM(CASE WHEN " + lineMissing + " AND " + workPresent + " THEN 1 ELSE 0 END) AS [lineManagerMissingWithWorkId], " +
      "SUM(CASE WHEN " + lineMissing + " AND COALESCE(v.[relatedVstsRows], 0) > 0 THEN 1 ELSE 0 END) AS [lineManagerMissingWithRelatedVsts], " +
      "SUM(CASE WHEN " + ceoMissing + " THEN 1 ELSE 0 END) AS [ceoMissing], " +
      "SUM(CASE WHEN " + ceoMissing + " AND " + workPresent + " THEN 1 ELSE 0 END) AS [ceoMissingWithWorkId], " +
      "SUM(CASE WHEN " + ceoMissing + " AND COALESCE(v.[relatedVstsRows], 0) > 0 THEN 1 ELSE 0 END) AS [ceoMissingWithRelatedVsts], " +
      "SUM(CASE WHEN " + itMissing + " THEN 1 ELSE 0 END) AS [itManagerMissing], " +
      "SUM(CASE WHEN " + itMissing + " AND " + workPresent + " THEN 1 ELSE 0 END) AS [itManagerMissingWithWorkId], " +
      "SUM(CASE WHEN " + itMissing + " AND COALESCE(v.[relatedVstsRows], 0) > 0 THEN 1 ELSE 0 END) AS [itManagerMissingWithRelatedVsts] " +
      "FROM " + SHAREPOINT_TABLE + " AS s LEFT JOIN (" +
      "SELECT [IDSharepoint], COUNT_BIG(*) AS [relatedVstsRows] FROM " + VSTS_TABLE + " WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint]" +
      ") AS v ON v.[IDSharepoint] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[IDSharepoint])), N''))",
  };
}

/** OpenCase-to-status aggregate pairs across both backup sources. */
export function buildLegacyOpenCaseStatusCorrelationQuery(): LegacySqlQuery {
  const openCase = normalized("s.[OpenCase]");
  const sharePointStatus = normalized("s.[StatusVSTS]");
  const vstsState = normalized("v.[State]");
  return {
    text:
      "SELECT [source], [openCaseValue], [statusValue], [pairCount] FROM (" +
      "SELECT N'SHAREPOINT_STATUS_VSTS' AS [source], " + openCase + " AS [openCaseValue], " + sharePointStatus + " AS [statusValue], COUNT_BIG(*) AS [pairCount] FROM " + SHAREPOINT_TABLE + " AS s GROUP BY " + openCase + ", " + sharePointStatus +
      " UNION ALL SELECT N'VSTS_STATE' AS [source], " + openCase + " AS [openCaseValue], " + vstsState + " AS [statusValue], COUNT_BIG(*) AS [pairCount] FROM " + SHAREPOINT_TABLE + " AS s INNER JOIN " + VSTS_TABLE + " AS v ON v.[IDSharepoint] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[IDSharepoint])), N'')) GROUP BY " + openCase + ", " + vstsState +
      ") AS [openCaseStatuses] ORDER BY [source], [openCaseValue], [statusValue]",
  };
}

/** OpenCase-to-approval-value aggregate pairs; stages stay separate. */
export function buildLegacyOpenCaseApprovalCorrelationQuery(): LegacySqlQuery {
  const stageSelect = (stage: string, column: string): string => {
    const openCase = normalized("s.[OpenCase]");
    const approval = normalized("s." + column);
    return "SELECT N'" + stage + "' AS [stage], " + openCase + " AS [openCaseValue], " + approval + " AS [approvalValue], COUNT_BIG(*) AS [requestCount] FROM " + SHAREPOINT_TABLE + " AS s GROUP BY " + openCase + ", " + approval;
  };
  return {
    text:
      "SELECT [stage], [openCaseValue], [approvalValue], [requestCount] FROM (" +
      stageSelect("LINE_MANAGER", "[StatusLineManager]") + " UNION ALL " +
      stageSelect("CEO", "[StatusCEOApprove]") + " UNION ALL " +
      stageSelect("IT_MANAGER", "[StatusITManager]") +
      ") AS [openCaseApprovals] ORDER BY [stage], [openCaseValue], [approvalValue]",
  };
}

/** Distinct SharePoint StatusVSTS and VSTS State values with counts. */
export function buildLegacyVstsStatusDistributionQuery(): LegacySqlQuery {
  const distribution = (source: string, column: string, table: string): string =>
    `SELECT N'${source}' AS [source], CASE WHEN ${column} IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(${column})) = N'' THEN N'BLANK' ELSE N'VALUE' END AS [valueKind], ${normalized(column)} AS [statusValue], COUNT_BIG(*) AS [rowCount] FROM ${table} GROUP BY CASE WHEN ${column} IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(${column})) = N'' THEN N'BLANK' ELSE N'VALUE' END, ${normalized(column)}`;
  return {
    text:
      "SELECT [source], [valueKind], [statusValue], [rowCount] FROM (" +
      distribution("SHAREPOINT_STATUS_VSTS", "[StatusVSTS]", SHAREPOINT_TABLE) +
      " UNION ALL " +
      distribution("VSTS_STATE", "[State]", VSTS_TABLE) +
      ") AS [statusDistribution] ORDER BY [source], [valueKind], [statusValue]",
  };
}

/** Request-level multi-row shape, including safe evidence of distinct items and duplicates. */
export function buildLegacyMultipleVstsSummaryQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT COUNT_BIG(*) AS [requestsWithMultipleRows], COALESCE(SUM([rowCount]), 0) AS [relatedRows], " +
      "COALESCE(SUM(CASE WHEN [distinctWorkIds] > 1 THEN 1 ELSE 0 END), 0) AS [requestsWithDifferentWorkIds], " +
      "COALESCE(SUM(CASE WHEN [distinctTypes] > 1 THEN 1 ELSE 0 END), 0) AS [requestsWithDifferentTypes], " +
      "COALESCE(SUM(CASE WHEN [distinctStates] > 1 THEN 1 ELSE 0 END), 0) AS [requestsWithDifferentStates], " +
      "COALESCE(SUM(CASE WHEN [distinctCreatedDates] > 1 THEN 1 ELSE 0 END), 0) AS [requestsWithDifferentCreatedDates], " +
      "COALESCE(SUM(CASE WHEN [distinctUpdatedDates] > 1 THEN 1 ELSE 0 END), 0) AS [requestsWithDifferentUpdatedDates], " +
      "COALESCE(SUM(CASE WHEN [nullWorkIds] > 0 THEN 1 ELSE 0 END), 0) AS [requestsWithNullWorkIds] FROM (" +
      "SELECT [IDSharepoint], COUNT_BIG(*) AS [rowCount], COUNT(DISTINCT [Work_ID]) AS [distinctWorkIds], " +
      "COUNT(DISTINCT " + normalized("[Type]") + ") AS [distinctTypes], COUNT(DISTINCT " + normalized("[State]") + ") AS [distinctStates], " +
      "COUNT(DISTINCT [CreateDate]) AS [distinctCreatedDates], COUNT(DISTINCT [UpdateDate]) AS [distinctUpdatedDates], " +
      "SUM(CASE WHEN [Work_ID] IS NULL THEN 1 ELSE 0 END) AS [nullWorkIds] " +
      `FROM ${VSTS_TABLE} WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint] HAVING COUNT_BIG(*) > 1` +
      ") AS [multipleRequests]",
  };
}

/** Aggregate evidence for exact backup duplicates within request-level multi-row groups. */
export function buildLegacyVstsDuplicateSummaryQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT COUNT_BIG(*) AS [exactDuplicateGroups], COALESCE(SUM([duplicateRows] - 1), 0) AS [extraDuplicateRows] FROM (" +
      "SELECT [IDSharepoint], [Work_ID], " + normalized("[Type]") + " AS [typeValue], " + normalized("[State]") + " AS [stateValue], [CreateDate], [UpdateDate], COUNT_BIG(*) AS [duplicateRows] " +
      `FROM ${VSTS_TABLE} WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint], [Work_ID], ${normalized("[Type]")}, ${normalized("[State]")}, [CreateDate], [UpdateDate] HAVING COUNT_BIG(*) > 1` +
      ") AS [duplicateGroups]",
  };
}

/** Type/State combinations only for requests with more than one related VSTS row. */
export function buildLegacyMultipleVstsTypeStateQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT CASE WHEN v.[Type] IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(v.[Type])) = N'' THEN N'BLANK' ELSE N'VALUE' END AS [typeKind], " +
      normalized("v.[Type]") + " AS [typeValue], CASE WHEN v.[State] IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(v.[State])) = N'' THEN N'BLANK' ELSE N'VALUE' END AS [stateKind], " +
      normalized("v.[State]") + " AS [stateValue], COUNT_BIG(*) AS [rowCount] " +
      `FROM ${VSTS_TABLE} AS v INNER JOIN (` +
      `SELECT [IDSharepoint] FROM ${VSTS_TABLE} WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint] HAVING COUNT_BIG(*) > 1` +
      ") AS m ON m.[IDSharepoint] = v.[IDSharepoint] GROUP BY " +
      "CASE WHEN v.[Type] IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(v.[Type])) = N'' THEN N'BLANK' ELSE N'VALUE' END, " + normalized("v.[Type]") + ", " +
      "CASE WHEN v.[State] IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(v.[State])) = N'' THEN N'BLANK' ELSE N'VALUE' END, " + normalized("v.[State]") +
      " ORDER BY [typeKind], [typeValue], [stateKind], [stateValue]",
  };
}

function statusComparisonSelect(
  scope: string,
  joinCondition: string,
): string {
  const spStatus = normalized("s.[StatusVSTS]");
  const state = normalized("v.[State]");
  const mismatch = `${spStatus} IS NOT NULL AND ${state} IS NOT NULL AND ${spStatus} <> ${state}`;
  return (
    `SELECT N'${scope}' AS [scope], COUNT_BIG(*) AS [joinedPairs], ` +
    `SUM(CASE WHEN ${spStatus} IS NOT NULL AND ${state} IS NOT NULL THEN 1 ELSE 0 END) AS [comparablePairs], ` +
    `SUM(CASE WHEN ${spStatus} = ${state} AND ${spStatus} IS NOT NULL THEN 1 ELSE 0 END) AS [matchingPairs], ` +
    `SUM(CASE WHEN ${mismatch} THEN 1 ELSE 0 END) AS [mismatchingPairs], ` +
    `SUM(CASE WHEN ${mismatch} AND COALESCE(rc.[requestVstsRows], 0) > 1 THEN 1 ELSE 0 END) AS [mismatchesOnMultipleRequests], ` +
    `SUM(CASE WHEN ${mismatch} AND TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[Work_ID])), N'')) IS NULL THEN 1 ELSE 0 END) AS [mismatchesWithMissingSharePointWorkId], ` +
    `SUM(CASE WHEN ${mismatch} AND v.[Work_ID] IS NULL THEN 1 ELSE 0 END) AS [mismatchesWithMissingVstsWorkId], ` +
    `SUM(CASE WHEN ${mismatch} AND ${normalized("s.[OpenCase]")} IS NOT NULL THEN 1 ELSE 0 END) AS [mismatchesWithOpenCase], ` +
    `SUM(CASE WHEN ${mismatch} AND ${normalized("s.[StatusLineManager]")} IS NOT NULL THEN 1 ELSE 0 END) AS [mismatchesWithLineManager], ` +
    `SUM(CASE WHEN ${mismatch} AND ${normalized("s.[StatusCEOApprove]")} IS NOT NULL THEN 1 ELSE 0 END) AS [mismatchesWithCeo], ` +
    `SUM(CASE WHEN ${mismatch} AND ${normalized("s.[StatusITManager]")} IS NOT NULL THEN 1 ELSE 0 END) AS [mismatchesWithItManager] ` +
    `FROM ${SHAREPOINT_TABLE} AS s INNER JOIN ${VSTS_TABLE} AS v ON ${joinCondition} ` +
    `LEFT JOIN (SELECT [IDSharepoint], COUNT_BIG(*) AS [requestVstsRows] FROM ${VSTS_TABLE} WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint]) AS rc ON rc.[IDSharepoint] = v.[IDSharepoint]`
  );
}

/** Side-by-side status comparisons for the confirmed Work-ID and request-reference joins. */
export function buildLegacyStatusMismatchSummaryQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT [scope], [joinedPairs], [comparablePairs], [matchingPairs], [mismatchingPairs], [mismatchesOnMultipleRequests], [mismatchesWithMissingSharePointWorkId], [mismatchesWithMissingVstsWorkId], [mismatchesWithOpenCase], [mismatchesWithLineManager], [mismatchesWithCeo], [mismatchesWithItManager] FROM (" +
      statusComparisonSelect(
        "WORK_ID",
        "v.[Work_ID] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[Work_ID])), N''))",
      ) +
      " UNION ALL " +
      statusComparisonSelect(
        "IDSHAREPOINT",
        "v.[IDSharepoint] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[IDSharepoint])), N''))",
      ) +
      ") AS [comparisons] ORDER BY [scope]",
  };
}

/** Mismatch categories are aggregate status pairs; no identifiers or rows are returned. */
export function buildLegacyStatusMismatchPatternQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT " + normalized("s.[StatusVSTS]") + " AS [sharePointStatus], " + normalized("v.[State]") + " AS [vstsState], " +
      normalized("s.[OpenCase]") + " AS [openCaseValue], CASE WHEN rc.[requestVstsRows] > 1 THEN 1 ELSE 0 END AS [multipleVstsRows], " +
      "CASE WHEN " + normalized("s.[StatusLineManager]") + " IS NULL THEN 0 ELSE 1 END AS [lineManagerPresent], " +
      "CASE WHEN " + normalized("s.[StatusCEOApprove]") + " IS NULL THEN 0 ELSE 1 END AS [ceoPresent], " +
      "CASE WHEN " + normalized("s.[StatusITManager]") + " IS NULL THEN 0 ELSE 1 END AS [itManagerPresent], " +
      "CASE WHEN s.[UpdateDate] IS NULL OR v.[UpdateDate] IS NULL THEN N'UNKNOWN' WHEN TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[UpdateDate])), N''), 101) IS NULL THEN N'UNKNOWN' WHEN v.[UpdateDate] > TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[UpdateDate])), N''), 101) THEN N'VSTS_LATER' WHEN v.[UpdateDate] < TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[UpdateDate])), N''), 101) THEN N'SHAREPOINT_LATER' ELSE N'EQUAL' END AS [updateTiming], COUNT_BIG(*) AS [pairCount] " +
      `FROM ${SHAREPOINT_TABLE} AS s INNER JOIN ${VSTS_TABLE} AS v ON v.[IDSharepoint] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[IDSharepoint])), N'')) ` +
      `INNER JOIN (SELECT [IDSharepoint], COUNT_BIG(*) AS [requestVstsRows] FROM ${VSTS_TABLE} WHERE [IDSharepoint] IS NOT NULL GROUP BY [IDSharepoint]) AS rc ON rc.[IDSharepoint] = v.[IDSharepoint] ` +
      "WHERE " + normalized("s.[StatusVSTS]") + " IS NOT NULL AND " + normalized("v.[State]") + " IS NOT NULL AND " + normalized("s.[StatusVSTS]") + " <> " + normalized("v.[State]") + " GROUP BY " +
      normalized("s.[StatusVSTS]") + ", " + normalized("v.[State]") + ", " + normalized("s.[OpenCase]") + ", CASE WHEN rc.[requestVstsRows] > 1 THEN 1 ELSE 0 END, " +
      "CASE WHEN " + normalized("s.[StatusLineManager]") + " IS NULL THEN 0 ELSE 1 END, CASE WHEN " + normalized("s.[StatusCEOApprove]") + " IS NULL THEN 0 ELSE 1 END, CASE WHEN " + normalized("s.[StatusITManager]") + " IS NULL THEN 0 ELSE 1 END, " +
      "CASE WHEN s.[UpdateDate] IS NULL OR v.[UpdateDate] IS NULL THEN N'UNKNOWN' WHEN TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[UpdateDate])), N''), 101) IS NULL THEN N'UNKNOWN' WHEN v.[UpdateDate] > TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[UpdateDate])), N''), 101) THEN N'VSTS_LATER' WHEN v.[UpdateDate] < TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[UpdateDate])), N''), 101) THEN N'SHAREPOINT_LATER' ELSE N'EQUAL' END " +
      "ORDER BY [pairCount] DESC, [sharePointStatus], [vstsState]",
  };
}

/** Parseability and timezone-marker counts only; source timestamps are never returned. */
export function buildLegacyDateTimeSemanticsQuery(): LegacySqlQuery {
  const spMetrics = (field: string, column: string): string =>
    `SELECT N'SHAREPOINT' AS [source], N'${field}' AS [field], COUNT_BIG(*) AS [rowCount], SUM(CASE WHEN ${column} IS NULL THEN 1 ELSE 0 END) AS [nullCount], SUM(CASE WHEN ${column} IS NOT NULL AND LTRIM(RTRIM(${column})) = N'' THEN 1 ELSE 0 END) AS [blankCount], SUM(CASE WHEN TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(${column})), N''), 101) IS NOT NULL THEN 1 ELSE 0 END) AS [style101Parseable], SUM(CASE WHEN TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(${column})), N''), 103) IS NOT NULL THEN 1 ELSE 0 END) AS [style103Parseable], SUM(CASE WHEN TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(${column})), N''), 120) IS NOT NULL THEN 1 ELSE 0 END) AS [style120Parseable], SUM(CASE WHEN TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(${column})), N''), 127) IS NOT NULL THEN 1 ELSE 0 END) AS [style127Parseable], SUM(CASE WHEN RIGHT(LTRIM(RTRIM(${column})), 1) IN (N'Z', N'z') OR RIGHT(LTRIM(RTRIM(${column})), 6) LIKE N'[+-][0-2][0-9]:[0-5][0-9]' OR RIGHT(LTRIM(RTRIM(${column})), 5) LIKE N'[+-][0-2][0-9][0-5][0-9]' THEN 1 ELSE 0 END) AS [explicitOffsetCount] FROM ${SHAREPOINT_TABLE}`;
  const vstsMetrics = (field: string, column: string): string =>
    `SELECT N'VSTS' AS [source], N'${field}' AS [field], COUNT_BIG(*) AS [rowCount], SUM(CASE WHEN ${column} IS NULL THEN 1 ELSE 0 END) AS [nullCount], CAST(0 AS bigint) AS [blankCount], SUM(CASE WHEN ${column} IS NOT NULL THEN 1 ELSE 0 END) AS [style101Parseable], SUM(CASE WHEN ${column} IS NOT NULL THEN 1 ELSE 0 END) AS [style103Parseable], SUM(CASE WHEN ${column} IS NOT NULL THEN 1 ELSE 0 END) AS [style120Parseable], SUM(CASE WHEN ${column} IS NOT NULL THEN 1 ELSE 0 END) AS [style127Parseable], CAST(0 AS bigint) AS [explicitOffsetCount] FROM ${VSTS_TABLE}`;
  return {
    text:
      "SELECT [source], [field], [rowCount], [nullCount], [blankCount], [style101Parseable], [style103Parseable], [style120Parseable], [style127Parseable], [explicitOffsetCount] FROM (" +
      spMetrics("CREATE_DATE", "[CreateDate]") + " UNION ALL " +
      spMetrics("UPDATE_DATE", "[UpdateDate]") + " UNION ALL " +
      vstsMetrics("CREATE_DATE", "[CreateDate]") + " UNION ALL " +
      vstsMetrics("UPDATE_DATE", "[UpdateDate]") +
      ") AS [dateMetrics] ORDER BY [source], [field]",
  };
}

/** Shape-only grouping for legacy text dates; actual timestamp text is omitted. */
export function buildLegacyDatePatternQuery(): LegacySqlQuery {
  const patternSelect = (field: string, column: string): string =>
    `SELECT N'${field}' AS [field], CASE WHEN ${column} IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(${column})) = N'' THEN N'BLANK' WHEN CHARINDEX(N'T', ${column}) > 0 AND RIGHT(LTRIM(RTRIM(${column})), 1) IN (N'Z', N'z') THEN N'ISO_T_Z_LIKE' WHEN (LEN(${column}) - LEN(REPLACE(${column}, N'/', N''))) = 2 THEN N'SLASH_DATE_LIKE' ELSE N'OTHER' END AS [patternKind], LEN(LTRIM(RTRIM(${column}))) AS [textLength], COUNT_BIG(*) AS [rowCount] FROM ${SHAREPOINT_TABLE} GROUP BY CASE WHEN ${column} IS NULL THEN N'NULL' WHEN LTRIM(RTRIM(${column})) = N'' THEN N'BLANK' WHEN CHARINDEX(N'T', ${column}) > 0 AND RIGHT(LTRIM(RTRIM(${column})), 1) IN (N'Z', N'z') THEN N'ISO_T_Z_LIKE' WHEN (LEN(${column}) - LEN(REPLACE(${column}, N'/', N''))) = 2 THEN N'SLASH_DATE_LIKE' ELSE N'OTHER' END, LEN(LTRIM(RTRIM(${column})))`;
  return {
    text:
      "SELECT [field], [patternKind], [textLength], [rowCount] FROM (" +
      patternSelect("CREATE_DATE", "[CreateDate]") + " UNION ALL " +
      patternSelect("UPDATE_DATE", "[UpdateDate]") +
      ") AS [datePatterns] ORDER BY [field], [patternKind], [textLength]",
  };
}

/** Aggregate temporal ordering using the observed ISO/US shapes only. */
export function buildLegacyDateOrderingQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT COUNT_BIG(*) AS [sharePointRows], SUM(CASE WHEN [createdValue] IS NOT NULL AND [updatedValue] IS NOT NULL THEN 1 ELSE 0 END) AS [sharePointComparable], SUM(CASE WHEN [updatedValue] >= [createdValue] THEN 1 ELSE 0 END) AS [sharePointUpdatedNotEarlier], SUM(CASE WHEN [updatedValue] < [createdValue] THEN 1 ELSE 0 END) AS [sharePointUpdatedEarlier] FROM (" +
      `SELECT TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM([CreateDate])), N''), 127) AS [createdValue], TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM([UpdateDate])), N''), 101) AS [updatedValue] FROM ${SHAREPOINT_TABLE}` +
      ") AS [parsedDates]",
  };
}

/** Typed VSTS chronology and request-to-item ordering as count-only evidence. */
export function buildLegacyCrossSourceDateOrderingQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT " +
      `(SELECT COUNT_BIG(*) FROM ${VSTS_TABLE} WHERE [CreateDate] IS NOT NULL AND [UpdateDate] IS NOT NULL) AS [vstsComparable], ` +
      `(SELECT COUNT_BIG(*) FROM ${VSTS_TABLE} WHERE [CreateDate] IS NOT NULL AND [UpdateDate] IS NOT NULL AND [UpdateDate] >= [CreateDate]) AS [vstsUpdatedNotEarlier], ` +
      `(SELECT COUNT_BIG(*) FROM ${VSTS_TABLE} WHERE [CreateDate] IS NOT NULL AND [UpdateDate] IS NOT NULL AND [UpdateDate] < [CreateDate]) AS [vstsUpdatedEarlier], ` +
      "COUNT_BIG(*) AS [requestToVstsPairs], " +
      "SUM(CASE WHEN TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[CreateDate])), N''), 127) IS NOT NULL AND v.[CreateDate] IS NOT NULL THEN 1 ELSE 0 END) AS [requestToVstsComparable], " +
      "SUM(CASE WHEN v.[CreateDate] >= TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[CreateDate])), N''), 127) THEN 1 ELSE 0 END) AS [vstsCreatedNotEarlier], " +
      "SUM(CASE WHEN v.[CreateDate] < TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(s.[CreateDate])), N''), 127) THEN 1 ELSE 0 END) AS [vstsCreatedEarlier] " +
      `FROM ${SHAREPOINT_TABLE} AS s INNER JOIN ${VSTS_TABLE} AS v ON v.[IDSharepoint] = TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(s.[IDSharepoint])), N''))`,
  };
}
