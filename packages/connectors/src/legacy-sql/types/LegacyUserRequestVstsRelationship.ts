export type LegacyRelationshipClassification =
  | "CONFIRMED"
  | "LIKELY"
  | "UNKNOWN"
  | "CONTRADICTED";

export interface LegacySchemaColumn {
  readonly tableName: string;
  readonly ordinalPosition: number;
  readonly columnName: string;
  readonly dataType: string;
  readonly maxLength: number | null;
  readonly isNullable: boolean;
}

export interface LegacyUniqueIndexColumn {
  readonly tableName: string;
  readonly indexName: string;
  readonly isPrimaryKey: boolean;
  readonly isUnique: boolean;
  readonly keyOrdinal: number;
  readonly columnName: string;
}

/** Minimal in-memory projection used only for bounded relationship discovery. */
export interface LegacyRelationshipSampleRow {
  readonly idSharepoint: string | number | null;
  readonly workId: string | number | null;
  readonly systemProgram: string | null;
  readonly permission: string | null;
  readonly status: string | null;
}

export interface LegacyRelationshipSummary {
  readonly sharePointRowsRead: number;
  readonly vstsRowsRead: number;
  readonly sharePointRowsWithUsableWorkId: number;
  readonly vstsRowsWithUsableWorkId: number;
  readonly matchedWorkIdKeys: number;
  readonly matchedRowPairs: number;
  readonly duplicateSharePointWorkIdKeys: number;
  readonly duplicateVstsWorkIdKeys: number;
  readonly oneToOneKeys: number;
  readonly oneToManyKeys: number;
  readonly manyToOneKeys: number;
  readonly manyToManyKeys: number;
  readonly comparableIdSharepointPairs: number;
  readonly matchingIdSharepointPairs: number;
  readonly comparableStatusPairs: number;
  readonly matchingStatusPairs: number;
  readonly workIdRelationship: LegacyRelationshipClassification;
  readonly idSharepointRelationship: LegacyRelationshipClassification;
  readonly statusSynchronization: LegacyRelationshipClassification;
}
