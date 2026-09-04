import type { LegacySqlQuery } from "../types/index.js";

export const LEGACY_VSTS_TABLE = "[dbo].[All_Azure_Dev(VSTS)]" as const;
export const LEGACY_RELATIONSHIP_SAMPLE_LIMIT = 10;

const LEGACY_SCHEMA_NAME = "dbo";
const LEGACY_USER_REQUEST_TABLE_NAME = "All_SharepointUserRequest";
const LEGACY_VSTS_TABLE_NAME = "All_Azure_Dev(VSTS)";
const MAX_SQL_INT = 2_147_483_647n;

export class LegacyRelationshipSampleLimitError extends Error {
  readonly code = "LEGACY_RELATIONSHIP_SAMPLE_LIMIT_INVALID";

  constructor() {
    super("Legacy relationship sample limit must be an integer between 1 and 10.");
    this.name = "LegacyRelationshipSampleLimitError";
  }
}

export function enforceLegacyRelationshipSampleLimit(
  limit = LEGACY_RELATIONSHIP_SAMPLE_LIMIT,
): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new LegacyRelationshipSampleLimitError();
  }

  return limit;
}

/** Converts the varchar/int source variants to the canonical SQL-int text form. */
export function normalizeLegacyWorkId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!/^[0-9]+$/.test(text)) {
    return null;
  }

  const parsed = BigInt(text);
  if (parsed <= 0n || parsed > MAX_SQL_INT) {
    return null;
  }

  return parsed.toString();
}

/** Metadata-only query for the two fixed, approved tables. */
export function buildLegacyUserRequestVstsColumnsQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT [TABLE_NAME] AS [tableName], " +
      "[ORDINAL_POSITION] AS [ordinalPosition], " +
      "[COLUMN_NAME] AS [columnName], " +
      "[DATA_TYPE] AS [dataType], " +
      "[CHARACTER_MAXIMUM_LENGTH] AS [maxLength], " +
      "[IS_NULLABLE] AS [isNullable] " +
      "FROM [INFORMATION_SCHEMA].[COLUMNS] " +
      "WHERE [TABLE_SCHEMA] = @schemaName " +
      "AND [TABLE_NAME] IN (@sharePointTable, @vstsTable) " +
      "ORDER BY [TABLE_NAME], [ORDINAL_POSITION]",
    parameters: [
      { name: "schemaName", value: LEGACY_SCHEMA_NAME },
      { name: "sharePointTable", value: LEGACY_USER_REQUEST_TABLE_NAME },
      { name: "vstsTable", value: LEGACY_VSTS_TABLE_NAME },
    ],
  };
}

/** Primary/unique-index metadata only; ordinary indexes are intentionally omitted. */
export function buildLegacyUserRequestVstsIndexesQuery(): LegacySqlQuery {
  return {
    text:
      "SELECT t.[name] AS [tableName], i.[name] AS [indexName], " +
      "i.[is_primary_key] AS [isPrimaryKey], i.[is_unique] AS [isUnique], " +
      "ic.[key_ordinal] AS [keyOrdinal], c.[name] AS [columnName] " +
      "FROM [sys].[tables] t " +
      "INNER JOIN [sys].[schemas] s ON s.[schema_id] = t.[schema_id] " +
      "INNER JOIN [sys].[indexes] i ON i.[object_id] = t.[object_id] " +
      "INNER JOIN [sys].[index_columns] ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id] " +
      "INNER JOIN [sys].[columns] c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id] " +
      "WHERE s.[name] = @schemaName " +
      "AND t.[name] IN (@sharePointTable, @vstsTable) " +
      "AND (i.[is_primary_key] = 1 OR i.[is_unique] = 1) " +
      "ORDER BY t.[name], i.[name], ic.[key_ordinal]",
    parameters: [
      { name: "schemaName", value: LEGACY_SCHEMA_NAME },
      { name: "sharePointTable", value: LEGACY_USER_REQUEST_TABLE_NAME },
      { name: "vstsTable", value: LEGACY_VSTS_TABLE_NAME },
    ],
  };
}

/** Bounded projection with no person, free-text, or infrastructure fields. */
export function buildLegacyUserRequestRelationshipSampleQuery(
  limit = LEGACY_RELATIONSHIP_SAMPLE_LIMIT,
): LegacySqlQuery {
  return {
    text:
      "SELECT TOP (@limit) " +
      "[IDSharepoint] AS [idSharepoint], [Work_ID] AS [workId], " +
      "[SystemProgram] AS [systemProgram], [Permission] AS [permission], " +
      "[StatusVSTS] AS [status] " +
      "FROM [dbo].[All_SharepointUserRequest] " +
      "WHERE TRY_CONVERT(int, NULLIF(LTRIM(RTRIM([Work_ID])), N'')) IS NOT NULL " +
      "ORDER BY [IDSHARE_INT]",
    parameters: [
      { name: "limit", value: enforceLegacyRelationshipSampleLimit(limit) },
    ],
  };
}

/** Targeted bounded VSTS projection; every Work ID remains a bound parameter. */
export function buildLegacyVstsRelationshipSampleQuery(
  workIds: readonly unknown[],
  limit = LEGACY_RELATIONSHIP_SAMPLE_LIMIT,
): LegacySqlQuery {
  const safeLimit = enforceLegacyRelationshipSampleLimit(limit);
  const normalizedWorkIds = [
    ...new Set(workIds.map(normalizeLegacyWorkId).filter((id) => id !== null)),
  ].slice(0, safeLimit);

  if (normalizedWorkIds.length === 0) {
    return {
      text:
        "SELECT TOP (@limit) " +
        "[IDSharepoint] AS [idSharepoint], [Work_ID] AS [workId], " +
        "[SystemProgram] AS [systemProgram], [Permission] AS [permission], " +
        "[State] AS [status] FROM " +
        LEGACY_VSTS_TABLE +
        " WHERE 1 = 0",
      parameters: [{ name: "limit", value: safeLimit }],
    };
  }

  const workIdParameters = normalizedWorkIds.map((workId, index) => ({
    name: "workId" + index,
    value: Number(workId),
  }));
  const placeholders = workIdParameters
    .map((parameter) => "@" + parameter.name)
    .join(", ");

  return {
    text:
      "SELECT TOP (@limit) " +
      "[IDSharepoint] AS [idSharepoint], [Work_ID] AS [workId], " +
      "[SystemProgram] AS [systemProgram], [Permission] AS [permission], " +
      "[State] AS [status] FROM " +
      LEGACY_VSTS_TABLE +
      " WHERE [Work_ID] IN (" +
      placeholders +
      ") ORDER BY [Work_ID]",
    parameters: [{ name: "limit", value: safeLimit }, ...workIdParameters],
  };
}
