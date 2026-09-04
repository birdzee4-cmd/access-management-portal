/**
 * Minimal source representation selected from the approved legacy User Request
 * table. Person, free-text, and infrastructure columns are intentionally not
 * selected by the connector.
 */
export interface LegacyUserRequestRow {
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
  readonly createdDateText: string | null;
  readonly updatedDateText: string | null;
}
