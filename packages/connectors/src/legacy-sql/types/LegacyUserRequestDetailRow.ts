/** Privacy-minimized source row for one legacy User Request detail lookup. */
export interface LegacyUserRequestDetailRow {
  readonly externalRequestId: string | null;
  readonly workItemId: string | null;
  readonly company: string | null;
  readonly department: string | null;
  readonly country: string | null;
  readonly system: string | null;
  readonly permission: string | null;
  readonly lineManagerApprovalStatus: string | null;
  readonly ceoApprovalStatus: string | null;
  readonly itManagerApprovalStatus: string | null;
  readonly vstsStatus: string | null;
  readonly openCaseStatus: string | null;
  readonly createdDateText: string | null;
  readonly updatedDateText: string | null;
}

/** Minimal VSTS backup projection; identity, title, and description are omitted. */
export interface LegacyRelatedVstsItemRow {
  readonly workItemId: string | null;
  readonly state: string | null;
}

export interface LegacyRelatedVstsRows {
  readonly rows: readonly LegacyRelatedVstsItemRow[];
  readonly totalCount: number;
}
