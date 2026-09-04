import type { LegacySqlConfig } from "../LegacySqlConfig.js";

export type {
  LegacyRelationshipClassification,
  LegacyRelationshipSampleRow,
  LegacyRelationshipSummary,
  LegacySchemaColumn,
  LegacyUniqueIndexColumn,
} from "./LegacyUserRequestVstsRelationship.js";

export const matrixSources = ["NEW", "TH", "PH", "VN_MY_ID"] as const;
export type MatrixSource = (typeof matrixSources)[number];

export type LegacySqlParameterValue =
  | string
  | number
  | boolean
  | Date
  | Buffer
  | null;

export interface LegacySqlParameter {
  readonly name: string;
  readonly value: LegacySqlParameterValue;
}

export interface LegacySqlQuery {
  readonly text: string;
  readonly parameters?: readonly LegacySqlParameter[];
}

export interface LegacySqlRequest {
  input(name: string, value: LegacySqlParameterValue): void;
  query<Row extends Record<string, unknown>>(
    sqlText: string,
  ): Promise<readonly Row[]>;
}

export interface LegacySqlPool {
  request(): LegacySqlRequest;
  close(): Promise<void>;
}

export interface LegacySqlDriver {
  connect(configuration: LegacySqlConfig): Promise<LegacySqlPool>;
}
