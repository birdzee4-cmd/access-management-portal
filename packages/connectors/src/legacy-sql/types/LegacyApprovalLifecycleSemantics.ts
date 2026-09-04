import type { LegacyRelationshipClassification } from "./LegacyUserRequestVstsRelationship.js";

export type SemanticClassification = LegacyRelationshipClassification;

export interface SemanticFinding {
  readonly subject: string;
  readonly classification: SemanticClassification;
  readonly evidenceSummary: string;
  readonly limitations: string;
}

export interface LegacyLifecycleSharePointObservation {
  readonly idSharepoint: string | number | null;
  readonly workId: string | number | null;
  readonly lineManagerStatus: string | null;
  readonly ceoStatus: string | null;
  readonly itManagerStatus: string | null;
  readonly openCase: string | null;
  readonly statusVsts: string | null;
  readonly createdDateText: string | null;
  readonly updatedDateText: string | null;
}

export interface LegacyLifecycleVstsObservation {
  readonly idSharepoint: string | number | null;
  readonly workId: string | number | null;
  readonly type: string | null;
  readonly state: string | null;
  readonly createdDateText: string | null;
  readonly updatedDateText: string | null;
}

export interface SemanticValueCount {
  readonly value: string | null;
  readonly count: number;
}

export interface ApprovalPresencePattern {
  readonly lineManagerPresent: boolean;
  readonly ceoPresent: boolean;
  readonly itManagerPresent: boolean;
  readonly count: number;
}

export interface LegacyApprovalLifecycleSummary {
  readonly sharePointRowsRead: number;
  readonly vstsRowsRead: number;
  readonly approvalValues: {
    readonly lineManager: readonly SemanticValueCount[];
    readonly ceo: readonly SemanticValueCount[];
    readonly itManager: readonly SemanticValueCount[];
  };
  readonly approvalPresencePatterns: readonly ApprovalPresencePattern[];
  readonly downstreamEvidence: {
    readonly ceoAbsentWithWorkId: number;
    readonly ceoAbsentWithRelatedVsts: number;
    readonly itManagerAbsentWithWorkId: number;
    readonly itManagerAbsentWithRelatedVsts: number;
  };
  readonly openCase: {
    readonly values: readonly SemanticValueCount[];
    readonly presentWithWorkId: number;
    readonly presentWithStatusVsts: number;
    readonly presentWithRelatedVsts: number;
  };
  readonly statusComparison: {
    readonly comparablePairs: number;
    readonly matchingPairs: number;
    readonly mismatchingPairs: number;
    readonly mismatchesOnMultipleVstsRequests: number;
    readonly mismatchesWithMissingSharePointWorkId: number;
    readonly mismatchesWithMissingVstsWorkId: number;
  };
  readonly multipleVsts: {
    readonly requestCount: number;
    readonly relatedRowCount: number;
    readonly requestsWithDifferentWorkIds: number;
    readonly requestsWithDifferentTypes: number;
    readonly requestsWithDifferentStates: number;
    readonly exactDuplicateGroups: number;
  };
  readonly dateTime: {
    readonly sharePointCreatedMissing: number;
    readonly sharePointUpdatedMissing: number;
    readonly sharePointValuesWithExplicitOffset: number;
    readonly vstsCreatedMissing: number;
    readonly vstsUpdatedMissing: number;
    readonly vstsValuesWithExplicitOffset: number;
    readonly timezone: "UNKNOWN";
  };
  readonly findings: readonly SemanticFinding[];
}
